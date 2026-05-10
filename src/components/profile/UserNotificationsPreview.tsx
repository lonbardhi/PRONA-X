"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/profile/actions";
import {
  formatWorkspaceDateTime,
  getNotificationTypeLabels,
  type UserNotification,
} from "@/lib/agent-workspace";
import type { Locale } from "@/lib/i18n";

type UserNotificationsPreviewProps = {
  locale: Locale;
  notifications: UserNotification[];
  returnTo: string;
};

export function UserNotificationsPreview({
  locale,
  notifications,
  returnTo,
}: UserNotificationsPreviewProps) {
  const typeLabels = getNotificationTypeLabels(locale);
  const unread = notifications.filter((notification) => !notification.read_at);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
          <Bell className="h-4 w-4 text-emerald-700" />
          {locale === "sq" ? "Njoftime" : "Notifications"}
          {unread.length > 0 ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
              {unread.length}
            </span>
          ) : null}
        </div>
        {unread.length > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <input name="return_to" type="hidden" value={returnTo} />
            <button className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              <CheckCheck className="h-3.5 w-3.5" />
              {locale === "sq" ? "Lexuar" : "Mark all"}
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          {locale === "sq"
            ? "Nuk ka njoftime te palexuara."
            : "No recent unread notifications."}
        </div>
      ) : (
        <div className="grid gap-2">
          {notifications.slice(0, 4).map((notification) => (
            <article
              className={`rounded-xl border p-3 ${
                notification.read_at
                  ? "border-slate-200 bg-white"
                  : "border-emerald-200 bg-emerald-50"
              }`}
              key={notification.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {typeLabels[notification.type]}
                  </p>
                  <h4 className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">
                    {notification.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {formatWorkspaceDateTime(notification.created_at, locale)}
                  </p>
                </div>
                {!notification.read_at ? (
                  <form action={markNotificationReadAction}>
                    <input name="notification_id" type="hidden" value={notification.id} />
                    <input name="return_to" type="hidden" value={returnTo} />
                    <button
                      aria-label={locale === "sq" ? "Sheno si te lexuar" : "Mark as read"}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Link
        className="text-xs font-semibold text-slate-500 hover:text-emerald-700"
        href="/profile?section=notifications"
        prefetch={false}
      >
        {locale === "sq" ? "Shiko te gjitha njoftimet" : "View all notifications"}
      </Link>
    </div>
  );
}
