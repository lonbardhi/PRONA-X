import { Clock3 } from "lucide-react";

import { formatWorkspaceDateTime, type ActivityLog } from "@/lib/agent-workspace";
import type { Locale } from "@/lib/i18n";

type ActivityFeedProps = {
  activityLogs: ActivityLog[];
  locale: Locale;
};

function humanizeAction(action: string, locale: Locale) {
  const sq: Record<string, string> = {
    updated_availability_status: "perditesoi statusin",
    updated_notification_preferences: "perditesoi preferencat",
    updated_profile_details: "perditesoi profilin",
  };
  const en: Record<string, string> = {
    updated_availability_status: "updated availability status",
    updated_notification_preferences: "updated notification preferences",
    updated_profile_details: "updated profile details",
  };

  return (locale === "sq" ? sq : en)[action] || action.replaceAll("_", " ");
}

export function ActivityFeed({ activityLogs, locale }: ActivityFeedProps) {
  if (activityLogs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
        {locale === "sq"
          ? "Aktiviteti do te shfaqet ketu sapo te perdoret CRM."
          : "Activity will appear here as the CRM is used."}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {activityLogs.map((log) => (
        <article
          className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
          key={log.id}
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {humanizeAction(log.action, locale)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {log.entity_type.replaceAll("_", " ")} ·{" "}
              {formatWorkspaceDateTime(log.created_at, locale)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
