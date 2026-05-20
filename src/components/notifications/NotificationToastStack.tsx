"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  ClipboardList,
  FileText,
  Home,
  MapPin,
  MessageSquare,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import {
  categoryLabels,
  formatNotificationRelativeTime,
  priorityLabels,
} from "@/lib/notifications/format";
import {
  getNewUnreadNotifications,
  mergeSeenNotificationIds,
} from "@/lib/notifications/live";
import type {
  NotificationCategory,
  NotificationListItem,
  NotificationListResponse,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const storageKey = "prona-x-live-notification-seen-ids";
const pollIntervalMs = 45_000;
const visibleTimeoutMs = 12_000;

const categoryIcons: Record<NotificationCategory, LucideIcon> = {
  calendar: CalendarClock,
  contracts: FileText,
  data_quality: CircleAlert,
  documents: FileText,
  leads: Users,
  map_location: MapPin,
  messages: MessageSquare,
  rentals: Home,
  requests: ClipboardList,
  sales: Home,
  system: Bell,
  tasks: Check,
  workspace: Users,
};

function fetchNotificationJson<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  }).then(async (response) => {
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Request failed.");
    }

    return response.json() as Promise<T>;
  });
}

function getStoredSeenIds() {
  try {
    const value = window.sessionStorage.getItem(storageKey);
    const parsed = value ? (JSON.parse(value) as unknown) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function setStoredSeenIds(ids: string[]) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Storage failures should not block notification delivery.
  }
}

function isHighPriority(item: NotificationListItem) {
  return item.priority === "urgent" || item.priority === "high";
}

function getCopy(locale: Locale) {
  return {
    dismiss: locale === "sq" ? "Mbyll njoftimin" : "Dismiss notification",
    liveRegion:
      locale === "sq"
        ? "Njoftime te reja te PRONA X"
        : "New PRONA X notifications",
    open: locale === "sq" ? "Hap" : "Open",
    title: locale === "sq" ? "Njoftim i ri" : "New notification",
  };
}

function NotificationToast({
  item,
  locale,
  onDismiss,
  onOpen,
}: {
  item: NotificationListItem;
  locale: Locale;
  onDismiss: (itemId: string) => void;
  onOpen: (item: NotificationListItem) => void;
}) {
  const copy = getCopy(locale);
  const CategoryIcon = categoryIcons[item.category];
  const highPriority = isHighPriority(item);

  return (
    <article
      className={cn(
        "pointer-events-auto w-full overflow-hidden rounded-2xl border bg-white/95 p-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-950/5 backdrop-blur",
        "animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none",
        highPriority ? "border-amber-200" : "border-emerald-200",
      )}
    >
      <div className="flex min-w-0 gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            item.priority === "urgent"
              ? "bg-rose-50 text-rose-600"
              : highPriority
              ? "bg-amber-50 text-amber-600"
              : "bg-emerald-50 text-emerald-600",
          )}
        >
          <CategoryIcon className="h-5 w-5" />
        </span>

        <button
          aria-label={`${copy.open}: ${item.title}`}
          className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          onClick={() => onOpen(item)}
          type="button"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Badge className="h-5 rounded-full px-2 text-[10px]" variant="secondary">
              {categoryLabels[item.category][locale]}
            </Badge>
            {highPriority ? (
              <Badge
                className={cn(
                  "h-5 rounded-full px-2 text-[10px]",
                  item.priority === "urgent"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                )}
                variant="outline"
              >
                {priorityLabels[item.priority][locale]}
              </Badge>
            ) : null}
            <time className="ml-auto shrink-0 text-[11px] font-medium text-slate-500">
              {formatNotificationRelativeTime(item.createdAt, locale)}
            </time>
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-slate-950">
            {item.title || copy.title}
          </h3>
          {item.body ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
              {item.body}
            </p>
          ) : null}
        </button>

        <Button
          aria-label={copy.dismiss}
          className="h-9 min-h-9 w-9 shrink-0 rounded-full"
          onClick={() => onDismiss(item.id)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export function NotificationToastStack({ locale }: { locale: Locale }) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [toasts, setToasts] = React.useState<NotificationListItem[]>([]);
  const initializedRef = React.useRef(false);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const timeoutRefs = React.useRef<Map<string, number>>(new Map());
  const router = useRouter();
  const copy = getCopy(locale);

  const rememberSeenIds = React.useCallback((ids: string[]) => {
    const merged = mergeSeenNotificationIds(seenIdsRef.current, ids);
    seenIdsRef.current = new Set(merged);
    setStoredSeenIds(merged);
  }, []);

  const dismissToast = React.useCallback((itemId: string) => {
    const timeout = timeoutRefs.current.get(itemId);
    if (timeout) {
      window.clearTimeout(timeout);
      timeoutRefs.current.delete(itemId);
    }

    setToasts((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const pushToasts = React.useCallback(
    (items: NotificationListItem[]) => {
      if (items.length === 0) return;

      const maxToasts = isMobile ? 2 : 3;
      rememberSeenIds(items.map((item) => item.id));

      setToasts((current) => {
        const deduped = [
          ...items,
          ...current.filter((item) => !items.some((next) => next.id === item.id)),
        ];

        return deduped.slice(0, maxToasts);
      });

      items.forEach((item) => {
        const existingTimeout = timeoutRefs.current.get(item.id);
        if (existingTimeout) window.clearTimeout(existingTimeout);

        const timeout = window.setTimeout(
          () => dismissToast(item.id),
          item.priority === "urgent" ? visibleTimeoutMs + 8_000 : visibleTimeoutMs,
        );
        timeoutRefs.current.set(item.id, timeout);
      });
    },
    [dismissToast, isMobile, rememberSeenIds],
  );

  const refreshNotifications = React.useCallback(async () => {
    const result = await fetchNotificationJson<NotificationListResponse>(
      "/api/notifications?status=active&unreadOnly=true&limit=10",
    );

    if (!initializedRef.current) {
      initializedRef.current = true;
      rememberSeenIds(result.items.map((item) => item.id));
      return;
    }

    const nextItems = getNewUnreadNotifications({
      currentItems: result.items,
      maxItems: isMobile ? 2 : 3,
      seenIds: seenIdsRef.current,
    });

    pushToasts(nextItems);
  }, [isMobile, pushToasts, rememberSeenIds]);

  const openToast = React.useCallback(
    async (item: NotificationListItem) => {
      dismissToast(item.id);

      if (item.isUnread) {
        await fetchNotificationJson(`/api/notifications/${item.id}/read`, {
          method: "PATCH",
        }).catch(() => null);
      }

      if (item.actionUrl) {
        router.push(item.actionUrl);
      } else {
        router.push("/notifications");
      }
    },
    [dismissToast, router],
  );

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    seenIdsRef.current = new Set(getStoredSeenIds());
    const activeTimeouts = timeoutRefs.current;

    void refreshNotifications().catch(() => null);

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refreshNotifications().catch(() => null);
      }
    }, pollIntervalMs);

    const onFocus = () => {
      if (!document.hidden) {
        void refreshNotifications().catch(() => null);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      activeTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      activeTimeouts.clear();
    };
  }, [refreshNotifications]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={copy.liveRegion}
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed z-50 flex w-[min(420px,calc(100vw-24px))] flex-col gap-2",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3",
        "md:bottom-auto md:right-6 md:top-24",
      )}
    >
      {toasts.map((item) => (
        <NotificationToast
          item={item}
          key={item.id}
          locale={locale}
          onDismiss={dismissToast}
          onOpen={openToast}
        />
      ))}
    </section>
  );
}
