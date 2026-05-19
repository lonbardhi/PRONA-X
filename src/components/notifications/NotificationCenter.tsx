"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Archive, Bell, CheckCheck, Clock3, Inbox, RefreshCw } from "lucide-react";

import { NotificationList } from "@/components/notifications/NotificationList";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { categoryLabels } from "@/lib/notifications/format";
import type {
  NotificationCategory,
  NotificationListItem,
  NotificationListResponse,
  NotificationStatus,
} from "@/lib/notifications/types";
import { notificationCategories } from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";

type CenterStatus = NotificationStatus | "active" | "all";

const statusOptions: Array<{
  icon: React.ComponentType<{ className?: string }>;
  label: { en: string; sq: string };
  value: CenterStatus;
}> = [
  { icon: Inbox, label: { en: "Active", sq: "Aktive" }, value: "active" },
  { icon: Bell, label: { en: "Unread", sq: "Te palexuara" }, value: "unread" },
  { icon: CheckCheck, label: { en: "Read", sq: "Te lexuara" }, value: "read" },
  { icon: Archive, label: { en: "Archived", sq: "Arkivuara" }, value: "archived" },
  { icon: Clock3, label: { en: "Snoozed", sq: "Ne pritje" }, value: "snoozed" },
];

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

export function NotificationCenter({
  initialData,
  locale,
}: {
  initialData: NotificationListResponse;
  locale: Locale;
}) {
  const [category, setCategory] = React.useState<NotificationCategory | "all">("all");
  const [data, setData] = React.useState(initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<CenterStatus>("active");
  const router = useRouter();

  const refresh = React.useCallback(async (
    nextStatus: CenterStatus = status,
    nextCategory: NotificationCategory | "all" = category,
  ) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: "50", status: nextStatus });
    if (nextCategory !== "all") {
      params.set("category", nextCategory);
    }

    try {
      const nextData = await fetchJson<NotificationListResponse>(
        `/api/notifications?${params.toString()}`,
      );
      setData(nextData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [category, status]);

  const updateItemRead = React.useCallback((itemId: string) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? { ...item, isUnread: false, readAt: new Date().toISOString(), status: "read" }
          : item,
      ),
      unreadCount: Math.max(0, current.unreadCount - 1),
    }));
  }, []);

  const markRead = React.useCallback(
    async (item: NotificationListItem) => {
      if (!item.isUnread) {
        return;
      }

      updateItemRead(item.id);
      try {
        await fetchJson(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
        await refresh();
      }
    },
    [refresh, updateItemRead],
  );

  const archive = React.useCallback(
    async (item: NotificationListItem) => {
      setData((current) => ({
        ...current,
        items: current.items.filter((candidate) => candidate.id !== item.id),
        unreadCount: item.isUnread
          ? Math.max(0, current.unreadCount - 1)
          : current.unreadCount,
      }));

      try {
        await fetchJson(`/api/notifications/${item.id}/archive`, { method: "PATCH" });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
        await refresh();
      }
    },
    [refresh],
  );

  const snooze = React.useCallback(
    async (item: NotificationListItem) => {
      const snoozedUntil = new Date(Date.now() + 60 * 60_000).toISOString();
      setData((current) => ({
        ...current,
        items: current.items.filter((candidate) => candidate.id !== item.id),
        unreadCount: item.isUnread
          ? Math.max(0, current.unreadCount - 1)
          : current.unreadCount,
      }));

      try {
        await fetchJson(`/api/notifications/${item.id}/snooze`, {
          body: JSON.stringify({ snoozedUntil }),
          method: "PATCH",
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
        await refresh();
      }
    },
    [refresh],
  );

  const openItem = React.useCallback(
    async (item: NotificationListItem) => {
      if (item.isUnread) {
        void markRead(item);
      }

      if (item.actionUrl) {
        router.push(item.actionUrl);
      }
    },
    [markRead, router],
  );

  const markAllRead = React.useCallback(async () => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => ({
        ...item,
        isUnread: false,
        readAt: item.readAt || new Date().toISOString(),
        status: "read",
      })),
      unreadCount: 0,
    }));

    try {
      await fetchJson("/api/notifications/mark-all-read", {
        body: JSON.stringify(category === "all" ? {} : { category }),
        method: "PATCH",
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      await refresh();
    }
  }, [category, refresh]);

  return (
    <section className="mx-auto grid max-w-[1180px] gap-5 px-3 py-6 sm:px-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              PRONA X CRM
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              {locale === "sq" ? "Qendra e njoftimeve" : "Notification center"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {locale === "sq"
                ? "Menaxho sinjalet per takime, mesazhe, prona, kerkesa dhe dokumente nga nje vend."
                : "Manage signals for meetings, messages, properties, requests, and documents from one place."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              className="h-10"
              disabled={data.unreadCount === 0}
              onClick={markAllRead}
              type="button"
              variant="outline"
            >
              <CheckCheck className="h-4 w-4" />
              {locale === "sq" ? "Te gjitha lexuar" : "Mark all read"}
            </Button>
            <Button className="h-10" onClick={() => void refresh()} type="button" variant="outline">
              <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              {locale === "sq" ? "Rifresko" : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="crm-scroll-area flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map((option) => {
            const Icon = option.icon;

            return (
              <Button
                className="h-9 shrink-0 rounded-full px-3 text-xs"
                key={option.value}
                onClick={() => {
                  setStatus(option.value);
                  void refresh(option.value, category);
                }}
                type="button"
                variant={status === option.value ? "default" : "secondary"}
              >
                <Icon className="h-4 w-4" />
                {option.label[locale]}
              </Button>
            );
          })}
        </div>
        <div className="crm-scroll-area mt-3 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          <Button
            className="h-9 shrink-0 rounded-full px-3 text-xs"
            onClick={() => {
              setCategory("all");
              void refresh(status, "all");
            }}
            type="button"
            variant={category === "all" ? "default" : "outline"}
          >
            {locale === "sq" ? "Te gjitha kategorite" : "All categories"}
          </Button>
          {notificationCategories.map((candidate) => (
            <Button
              className="h-9 shrink-0 rounded-full px-3 text-xs"
              key={candidate}
              onClick={() => {
                setCategory(candidate);
                void refresh(status, candidate);
              }}
              type="button"
              variant={category === candidate ? "default" : "outline"}
            >
              {categoryLabels[candidate][locale]}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <NotificationList
          error={error}
          items={data.items}
          loading={loading}
          locale={locale}
          onArchive={archive}
          onMarkRead={markRead}
          onOpen={openItem}
          onRetry={() => void refresh()}
          onSnooze={snooze}
        />
      </div>
    </section>
  );
}
