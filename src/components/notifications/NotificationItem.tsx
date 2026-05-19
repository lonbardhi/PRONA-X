"use client";

import type { ComponentType } from "react";
import {
  Archive,
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  ClipboardList,
  FileText,
  Home,
  MapPin,
  MessageSquare,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import {
  categoryLabels,
  formatNotificationRelativeTime,
  priorityLabels,
} from "@/lib/notifications/format";
import type {
  NotificationCategory,
  NotificationListItem as NotificationListItemType,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const categoryIcons: Record<NotificationCategory, ComponentType<{ className?: string }>> = {
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

export function NotificationItem({
  item,
  locale,
  onArchive,
  onMarkRead,
  onOpen,
  onSnooze,
}: {
  item: NotificationListItemType;
  locale: Locale;
  onArchive: (item: NotificationListItemType) => void;
  onMarkRead: (item: NotificationListItemType) => void;
  onOpen: (item: NotificationListItemType) => void;
  onSnooze: (item: NotificationListItemType) => void;
}) {
  const CategoryIcon = categoryIcons[item.category];
  const isUrgent = item.priority === "urgent";
  const isHigh = item.priority === "high" || isUrgent;

  return (
    <article
      className={cn(
        "group relative rounded-lg border bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40",
        item.isUnread ? "border-emerald-200 shadow-sm" : "border-slate-100",
      )}
    >
      <button
        aria-label={locale === "sq" ? `Hap njoftimin ${item.title}` : `Open notification ${item.title}`}
        className="block w-full rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={() => onOpen(item)}
        type="button"
      >
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isUrgent
                ? "bg-rose-50 text-rose-600"
                : isHigh
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600",
            )}
          >
            <CategoryIcon className="h-5 w-5" />
            {item.isUnread ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-start justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-slate-950">
                {item.title}
              </span>
              <time className="shrink-0 text-[11px] font-medium text-slate-500">
                {formatNotificationRelativeTime(item.createdAt, locale)}
              </time>
            </span>
            {item.body ? (
              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600">
                {item.body}
              </span>
            ) : null}
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Badge className="h-5 rounded-full px-2 text-[10px]" variant="secondary">
                {categoryLabels[item.category][locale]}
              </Badge>
              {isHigh ? (
                <Badge
                  className={cn(
                    "h-5 rounded-full px-2 text-[10px]",
                    isUrgent
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-amber-200 bg-amber-50 text-amber-700",
                  )}
                  variant="outline"
                >
                  {priorityLabels[item.priority][locale]}
                </Badge>
              ) : null}
              {item.snoozedUntil ? (
                <Badge className="h-5 rounded-full px-2 text-[10px]" variant="outline">
                  {locale === "sq" ? "Ne pritje" : "Snoozed"}
                </Badge>
              ) : null}
            </span>
          </span>
        </div>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2">
        <Button
          aria-label={locale === "sq" ? "Sheno si te lexuar" : "Mark as read"}
          className="h-9 px-2 text-[11px]"
          disabled={!item.isUnread}
          onClick={() => onMarkRead(item)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Check className="h-3.5 w-3.5" />
          {locale === "sq" ? "Lexuar" : "Read"}
        </Button>
        <Button
          aria-label={locale === "sq" ? "Me kujto me vone" : "Remind me later"}
          className="h-9 px-2 text-[11px]"
          onClick={() => onSnooze(item)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Clock3 className="h-3.5 w-3.5" />
          {locale === "sq" ? "Me vone" : "Later"}
        </Button>
        <Button
          aria-label={locale === "sq" ? "Arkivo njoftimin" : "Archive notification"}
          className="h-9 px-2 text-[11px]"
          onClick={() => onArchive(item)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Archive className="h-3.5 w-3.5" />
          {locale === "sq" ? "Arkivo" : "Archive"}
        </Button>
      </div>
    </article>
  );
}
