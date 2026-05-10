import { z } from "zod";

import { defaultLocale, getIntlLocale, type Locale } from "@/lib/i18n";
import type { AppRole } from "@/lib/supabase/server";

export const availabilityStatuses = [
  "available",
  "in_meeting",
  "property_visit",
  "driving",
  "do_not_disturb",
  "offline",
  "vacation",
] as const;

export const notificationTypes = [
  "meeting_reminder",
  "new_assigned_lead",
  "property_update",
  "follow_up_reminder",
  "contract_reminder",
  "system_alert",
] as const;

export const calendarViewPreferences = ["day", "week", "month", "agenda"] as const;

export type AvailabilityStatus = (typeof availabilityStatuses)[number];
export type NotificationType = (typeof notificationTypes)[number];
export type CalendarViewPreference = (typeof calendarViewPreferences)[number];

export type UserProfile = {
  agency_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  email: string | null;
  full_name: string | null;
  id: string;
  phone: string | null;
  role: AppRole | string;
};

export type UserStatus = {
  id: string | null;
  status: AvailabilityStatus;
  status_message: string | null;
  updated_at: string | null;
  user_id: string;
};

export type UserPreference = {
  created_at: string | null;
  email_notifications: boolean;
  id: string | null;
  in_app_notifications: boolean;
  preferred_calendar_view: CalendarViewPreference;
  push_notifications: boolean;
  reminder_minutes_before_meeting: number;
  updated_at: string | null;
  user_id: string;
  whatsapp_notifications: boolean;
};

export type UserNotification = {
  created_at: string;
  id: string;
  message: string;
  read_at: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  title: string;
  type: NotificationType;
  user_id: string;
};

export type Notification = UserNotification;

export type ActivityLog = {
  action: string;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  metadata: Record<string, unknown>;
  user_id: string;
};

export type AgentMetric = {
  deals_closed: number;
  followups_overdue: number;
  id: string | null;
  leads_active: number;
  meetings_completed: number;
  properties_active: number;
  updated_at: string | null;
  user_id: string;
};

export type TodayAgendaItem = {
  client_email: string | null;
  client_name: string;
  client_phone: string | null;
  ends_at: string;
  id: string;
  location: string | null;
  property: {
    address: string | null;
    city: string | null;
    id: string;
    neighborhood: string | null;
    title: string;
  } | null;
  starts_at: string;
  status: string;
  title: string;
};

export type AgentProductivitySnapshot = {
  active_leads: number;
  active_listings: number;
  completed_meetings_this_week: number;
  meetings_today: number;
  overdue_followups: number;
  unread_notifications: number;
};

export type AgentWorkspaceData = {
  activityLogs: ActivityLog[];
  metrics: AgentMetric;
  notifications: UserNotification[];
  preferences: UserPreference;
  profile: UserProfile;
  productivity: AgentProductivitySnapshot;
  status: UserStatus;
  todayAgenda: TodayAgendaItem[];
};

export const availabilityStatusLabels: Record<AvailabilityStatus, string> = {
  available: "Available",
  in_meeting: "In Meeting",
  property_visit: "Property Visit",
  driving: "Driving",
  do_not_disturb: "Do Not Disturb",
  offline: "Offline",
  vacation: "Vacation",
};

const availabilityStatusLabelsSq: Record<AvailabilityStatus, string> = {
  available: "I lire",
  in_meeting: "Ne takim",
  property_visit: "Vizite prone",
  driving: "Ne levizje",
  do_not_disturb: "Mos me shqeteso",
  offline: "Jashte linje",
  vacation: "Pushime",
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  contract_reminder: "Contract reminder",
  follow_up_reminder: "Follow-up reminder",
  meeting_reminder: "Meeting reminder",
  new_assigned_lead: "New assigned lead",
  property_update: "Property update",
  system_alert: "System alert",
};

const notificationTypeLabelsSq: Record<NotificationType, string> = {
  contract_reminder: "Kujtese kontrate",
  follow_up_reminder: "Kujtese ndjekjeje",
  meeting_reminder: "Kujtese takimi",
  new_assigned_lead: "Lead i ri i caktuar",
  property_update: "Perditesim prone",
  system_alert: "Njoftim sistemi",
};

export const calendarViewLabels: Record<CalendarViewPreference, string> = {
  agenda: "Agenda",
  day: "Day",
  month: "Month",
  week: "Week",
};

const calendarViewLabelsSq: Record<CalendarViewPreference, string> = {
  agenda: "Agjende",
  day: "Dite",
  month: "Muaj",
  week: "Jave",
};

export function getAvailabilityStatusLabels(locale: Locale) {
  return locale === "sq" ? availabilityStatusLabelsSq : availabilityStatusLabels;
}

export function getNotificationTypeLabels(locale: Locale) {
  return locale === "sq" ? notificationTypeLabelsSq : notificationTypeLabels;
}

export function getCalendarViewLabels(locale: Locale) {
  return locale === "sq" ? calendarViewLabelsSq : calendarViewLabels;
}

export function getDefaultUserStatus(userId: string): UserStatus {
  return {
    id: null,
    status: "available",
    status_message: null,
    updated_at: null,
    user_id: userId,
  };
}

export function getDefaultUserPreferences(userId: string): UserPreference {
  return {
    created_at: null,
    email_notifications: true,
    id: null,
    in_app_notifications: true,
    preferred_calendar_view: "week",
    push_notifications: true,
    reminder_minutes_before_meeting: 60,
    updated_at: null,
    user_id: userId,
    whatsapp_notifications: false,
  };
}

export function getDefaultAgentMetrics(userId: string): AgentMetric {
  return {
    deals_closed: 0,
    followups_overdue: 0,
    id: null,
    leads_active: 0,
    meetings_completed: 0,
    properties_active: 0,
    updated_at: null,
    user_id: userId,
  };
}

export const profileUpdateSchema = z.object({
  agency_name: z.string().trim().max(120).optional(),
  avatar_url: z.string().trim().url().optional().or(z.literal("")),
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  phone: z.string().trim().max(40).optional(),
});

export const userStatusUpdateSchema = z.object({
  status: z.enum(availabilityStatuses),
  status_message: z.string().trim().max(160).optional(),
});

export const userPreferenceUpdateSchema = z.object({
  email_notifications: z.coerce.boolean().default(false),
  in_app_notifications: z.coerce.boolean().default(false),
  preferred_calendar_view: z.enum(calendarViewPreferences),
  push_notifications: z.coerce.boolean().default(false),
  reminder_minutes_before_meeting: z.coerce.number().int().min(0).max(10080),
  whatsapp_notifications: z.coerce.boolean().default(false),
});

export function formatWorkspaceDateTime(
  value: string | null | undefined,
  locale: Locale = defaultLocale,
) {
  if (!value) {
    return locale === "sq" ? "E panjohur" : "Unknown";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatWorkspaceTime(value: string, locale: Locale = defaultLocale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getInitials(nameOrEmail: string | null | undefined) {
  if (!nameOrEmail) {
    return "PX";
  }

  const parts = nameOrEmail
    .replace(/@.+$/, "")
    .split(/[.\s_-]+/)
    .filter(Boolean);

  return (parts[0]?.[0] || "P").concat(parts[1]?.[0] || "X").toUpperCase();
}
