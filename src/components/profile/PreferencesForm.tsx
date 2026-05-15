"use client";

import { BellRing } from "lucide-react";

import { updateUserPreferencesAction } from "@/app/profile/actions";
import {
  calendarViewPreferences,
  getCalendarViewLabels,
  type UserPreference,
} from "@/lib/agent-workspace";
import type { Locale } from "@/lib/i18n";

type PreferencesFormProps = {
  locale: Locale;
  preferences: UserPreference;
  returnTo: string;
};

export function PreferencesForm({
  locale,
  preferences,
  returnTo,
}: PreferencesFormProps) {
  const calendarViewLabels = getCalendarViewLabels(locale);
  const channels = [
    {
      checked: preferences.email_notifications,
      label: locale === "sq" ? "Email" : "Email",
      name: "email_notifications",
    },
    {
      checked: preferences.in_app_notifications,
      label: locale === "sq" ? "Brenda aplikacionit" : "In-app",
      name: "in_app_notifications",
    },
    {
      checked: preferences.push_notifications,
      label: locale === "sq" ? "Push" : "Push",
      name: "push_notifications",
    },
    {
      checked: preferences.whatsapp_notifications,
      label: "WhatsApp",
      name: "whatsapp_notifications",
    },
  ];

  return (
    <form action={updateUserPreferencesAction} className="grid gap-4">
      <input name="return_to" type="hidden" value={returnTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {locale === "sq" ? "Kujtese para takimit" : "Reminder before meeting"}
          <select
            className="crm-input text-slate-950"
            defaultValue={preferences.reminder_minutes_before_meeting}
            name="reminder_minutes_before_meeting"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="1440">1 day</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {locale === "sq" ? "Pamja e kalendarit" : "Calendar view"}
          <select
            className="crm-input text-slate-950"
            defaultValue={preferences.preferred_calendar_view}
            name="preferred_calendar_view"
          >
            {calendarViewPreferences.map((view) => (
              <option key={view} value={view}>
                {calendarViewLabels[view]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-slate-950">
          {locale === "sq" ? "Kanalet e njoftimeve" : "Notification channels"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {channels.map((channel) => (
            <label
              className="crm-card-interactive flex items-center gap-3 p-3 text-sm font-medium text-slate-700"
              key={channel.name}
            >
              <input
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                defaultChecked={channel.checked}
                name={channel.name}
                type="checkbox"
              />
              {channel.label}
            </label>
          ))}
        </div>
      </div>

      <button className="crm-button crm-button-primary w-full sm:w-fit">
        <BellRing className="h-4 w-4" />
        {locale === "sq" ? "Ruaj preferencat" : "Save preferences"}
      </button>
    </form>
  );
}
