"use client";

import { BellRing } from "lucide-react";

import { updateUserPreferencesAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
        <Label className="grid gap-2 text-sm font-medium text-foreground">
          {locale === "sq" ? "Kujtese para takimit" : "Reminder before meeting"}
          <Select
            defaultValue={preferences.reminder_minutes_before_meeting}
            name="reminder_minutes_before_meeting"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="1440">1 day</option>
          </Select>
        </Label>

        <Label className="grid gap-2 text-sm font-medium text-foreground">
          {locale === "sq" ? "Pamja e kalendarit" : "Calendar view"}
          <Select
            defaultValue={preferences.preferred_calendar_view}
            name="preferred_calendar_view"
          >
            {calendarViewPreferences.map((view) => (
              <option key={view} value={view}>
                {calendarViewLabels[view]}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-slate-950">
          {locale === "sq" ? "Kanalet e njoftimeve" : "Notification channels"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {channels.map((channel) => {
            const channelId = `preference-${channel.name}`;

            return (
              <div
                className="crm-card-interactive flex items-center gap-3 p-3"
                key={channel.name}
              >
                <Checkbox
                  id={channelId}
                  defaultChecked={channel.checked}
                  name={channel.name}
                />
                <Label
                  className="cursor-pointer text-sm font-medium text-foreground"
                  htmlFor={channelId}
                >
                  {channel.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <Button className="w-full sm:w-fit">
        <BellRing className="h-4 w-4" />
        {locale === "sq" ? "Ruaj preferencat" : "Save preferences"}
      </Button>
    </form>
  );
}
