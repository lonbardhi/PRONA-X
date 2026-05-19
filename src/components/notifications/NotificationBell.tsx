"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";

import { NotificationList } from "@/components/notifications/NotificationList";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { clampUnreadBadgeCount } from "@/lib/notifications/format";
import type {
  NotificationCountSummary,
  NotificationListItem,
  NotificationListResponse,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Request failed.");
  }

  return response.json() as Promise<T>;
}

function getCopy(locale: Locale) {
  return {
    allRead: locale === "sq" ? "Sheno te gjitha si te lexuara" : "Mark all as read",
    aria:
      locale === "sq"
        ? "Hap qendren e njoftimeve"
        : "Open notification center",
    badge:
      locale === "sq"
        ? "njoftime te palexuara"
        : "unread notifications",
    description:
      locale === "sq"
        ? "Sinjale per takime, mesazhe, prona, kerkesa dhe dokumente."
        : "Signals for meetings, messages, properties, requests, and documents.",
    loading: locale === "sq" ? "Duke ngarkuar njoftimet" : "Loading notifications",
    title: locale === "sq" ? "Njoftime" : "Notifications",
    viewAll: locale === "sq" ? "Shiko te gjitha" : "View all",
  };
}

export function NotificationBell({
  className,
  initialUnreadCount = 0,
  initialUrgentUnreadCount = 0,
  locale,
}: {
  className?: string;
  initialUnreadCount?: number;
  initialUrgentUnreadCount?: number;
  locale: Locale;
}) {
  const bellRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationListItem[]>([]);
  const [count, setCount] = React.useState(initialUnreadCount);
  const [urgentCount, setUrgentCount] = React.useState(initialUrgentUnreadCount);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isMobile = useIsMobile();
  const router = useRouter();
  const copy = getCopy(locale);
  const badge = clampUnreadBadgeCount(count);

  const refreshCount = React.useCallback(async () => {
    try {
      const result = await fetchJson<NotificationCountSummary>(
        "/api/notifications/unread-count",
      );
      setCount(result.unreadCount);
      setUrgentCount(result.urgentUnreadCount);
    } catch {
      // Count failures should not interrupt the header.
    }
  }, []);

  const refreshList = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchJson<NotificationListResponse>(
        "/api/notifications?status=active&limit=20",
      );
      setItems(result.items);
      setCount(result.unreadCount);
      setUrgentCount(result.urgentUnreadCount);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const onFocus = () => {
      if (!document.hidden) {
        void refreshCount();
      }
    };
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refreshCount();
      }
    }, 60_000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshCount]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        void refreshList();
      }
    },
    [refreshList],
  );

  const closePanel = React.useCallback(() => {
    setOpen(false);
    window.setTimeout(() => bellRef.current?.focus(), 0);
  }, []);

  const updateItemRead = React.useCallback((itemId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isUnread: false,
              readAt: new Date().toISOString(),
              status: "read",
            }
          : item,
      ),
    );
    setCount((current) => Math.max(0, current - 1));
  }, []);

  const markRead = React.useCallback(
    async (item: NotificationListItem) => {
      if (!item.isUnread) {
        return;
      }

      updateItemRead(item.id);
      try {
        await fetchJson(`/api/notifications/${item.id}/read`, { method: "PATCH" });
        void refreshCount();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
        await refreshList();
      }
    },
    [refreshCount, refreshList, updateItemRead],
  );

  const archiveItem = React.useCallback(
    async (item: NotificationListItem) => {
      const previousItems = items;
      const wasUnread = item.isUnread;

      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      if (wasUnread) {
        setCount((current) => Math.max(0, current - 1));
      }

      try {
        await fetchJson(`/api/notifications/${item.id}/archive`, { method: "PATCH" });
        void refreshCount();
      } catch (requestError) {
        setItems(previousItems);
        if (wasUnread) {
          setCount((current) => current + 1);
        }
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
      }
    },
    [items, refreshCount],
  );

  const snoozeItem = React.useCallback(
    async (item: NotificationListItem) => {
      const snoozedUntil = new Date(Date.now() + 60 * 60_000).toISOString();
      const previousItems = items;
      const wasUnread = item.isUnread;

      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      if (wasUnread) {
        setCount((current) => Math.max(0, current - 1));
      }

      try {
        await fetchJson(`/api/notifications/${item.id}/snooze`, {
          body: JSON.stringify({ snoozedUntil }),
          method: "PATCH",
        });
        void refreshCount();
      } catch (requestError) {
        setItems(previousItems);
        if (wasUnread) {
          setCount((current) => current + 1);
        }
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
      }
    },
    [items, refreshCount],
  );

  const markAllRead = React.useCallback(async () => {
    const previousItems = items;
    const previousCount = count;

    setItems((current) =>
      current.map((item) => ({
        ...item,
        isUnread: false,
        readAt: item.readAt || new Date().toISOString(),
        status: item.status === "archived" ? item.status : "read",
      })),
    );
    setCount(0);

    try {
      await fetchJson("/api/notifications/mark-all-read", {
        body: JSON.stringify({}),
        method: "PATCH",
      });
      void refreshCount();
    } catch (requestError) {
      setItems(previousItems);
      setCount(previousCount);
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    }
  }, [count, items, refreshCount]);

  const openItem = React.useCallback(
    async (item: NotificationListItem) => {
      if (item.isUnread) {
        void markRead(item);
      }

      if (item.actionUrl) {
        closePanel();
        router.push(item.actionUrl);
      }
    },
    [closePanel, markRead, router],
  );

  const trigger = (
    <button
      aria-label={badge ? `${copy.aria}, ${badge} ${copy.badge}` : copy.aria}
      className={cn(
        "crm-icon-button relative h-11 min-h-11 w-11 shrink-0 text-slate-700",
        urgentCount > 0 ? "border-rose-200 text-rose-600" : "",
        className,
      )}
      ref={bellRef}
      type="button"
    >
      <Bell className="h-4 w-4" />
      {badge ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-5 text-white shadow-sm ring-2 ring-white",
            urgentCount > 0 ? "bg-rose-600" : "bg-slate-950",
          )}
        >
          {badge}
        </span>
      ) : null}
      <span className="sr-only">{copy.badge}: {count}</span>
    </button>
  );

  const panel = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{copy.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{copy.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {loading ? (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sr-only">{copy.loading}</span>
            </span>
          ) : null}
          <Button
            className="h-9 px-2 text-xs"
            disabled={count === 0}
            onClick={markAllRead}
            size="sm"
            type="button"
            variant="ghost"
          >
            <CheckCheck className="h-4 w-4" />
            <span className="hidden min-[390px]:inline">{copy.allRead}</span>
          </Button>
          {isMobile ? (
            <DrawerClose asChild>
              <Button aria-label="Close" className="h-9 w-9" size="icon" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <NotificationList
          error={error}
          items={items}
          loading={loading}
          locale={locale}
          onArchive={archiveItem}
          onMarkRead={markRead}
          onOpen={openItem}
          onRetry={refreshList}
          onSnooze={snoozeItem}
        />
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-3 backdrop-blur">
        <Link
          className={buttonVariants({
            className: "h-10 w-full",
            variant: "outline",
          })}
          href="/notifications"
          onClick={closePanel}
          prefetch={false}
        >
          {copy.viewAll}
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={handleOpenChange} open={open}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[88dvh] min-h-[70dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{copy.title}</DrawerTitle>
            <DrawerDescription>{copy.description}</DrawerDescription>
          </DrawerHeader>
          {panel}
          <DrawerFooter className="sr-only" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] max-w-[calc(100vw-24px)] overflow-hidden p-0" sideOffset={10}>
        <div className="flex max-h-[min(720px,calc(100vh-120px))] min-h-[360px] flex-col">
          {panel}
        </div>
      </PopoverContent>
    </Popover>
  );
}
