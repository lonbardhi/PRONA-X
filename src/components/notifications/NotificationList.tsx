"use client";

import type { Locale } from "@/lib/i18n";
import type { NotificationListItem as NotificationListItemType } from "@/lib/notifications/types";
import { NotificationEmptyState } from "@/components/notifications/NotificationEmptyState";
import { NotificationErrorState } from "@/components/notifications/NotificationErrorState";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";

export function NotificationList({
  error,
  items,
  loading,
  locale,
  onArchive,
  onMarkRead,
  onOpen,
  onRetry,
  onSnooze,
}: {
  error: string | null;
  items: NotificationListItemType[];
  loading: boolean;
  locale: Locale;
  onArchive: (item: NotificationListItemType) => void;
  onMarkRead: (item: NotificationListItemType) => void;
  onOpen: (item: NotificationListItemType) => void;
  onRetry: () => void;
  onSnooze: (item: NotificationListItemType) => void;
}) {
  if (loading && items.length === 0) {
    return <NotificationSkeleton />;
  }

  if (error && items.length === 0) {
    return <NotificationErrorState locale={locale} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return <NotificationEmptyState locale={locale} />;
  }

  return (
    <div className="space-y-2">
      {error ? (
        <NotificationErrorState locale={locale} onRetry={onRetry} />
      ) : null}
      {items.map((item) => (
        <NotificationItem
          item={item}
          key={item.id}
          locale={locale}
          onArchive={onArchive}
          onMarkRead={onMarkRead}
          onOpen={onOpen}
          onSnooze={onSnooze}
        />
      ))}
    </div>
  );
}
