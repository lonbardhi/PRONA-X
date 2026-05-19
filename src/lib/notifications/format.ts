import { appTimeZone, getIntlLocale, type Locale } from "../i18n.ts";
import {
  notificationCategories,
  notificationPriorities,
  notificationTypes,
} from "./constants.ts";
import type {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from "./types.ts";

const typeCategoryMap: Record<NotificationType, NotificationCategory> = {
  contract_expiring_soon: "contracts",
  contract_pending_signature: "contracts",
  contract_reminder: "contracts",
  data_quality_warning: "data_quality",
  deal_room_message: "messages",
  document_rejected: "documents",
  document_requires_review: "documents",
  document_uploaded: "documents",
  duplicate_lead_detected: "leads",
  follow_up_reminder: "tasks",
  lead_assigned: "leads",
  lead_follow_up_due: "leads",
  lead_follow_up_overdue: "leads",
  lead_message: "messages",
  map_location_warning: "map_location",
  meeting_message: "messages",
  meeting_reminder: "calendar",
  mention: "messages",
  message: "messages",
  new_assigned_lead: "leads",
  property_assigned: "sales",
  property_message: "messages",
  property_missing_coordinates: "map_location",
  property_missing_media: "data_quality",
  property_price_changed: "sales",
  property_published: "sales",
  property_status_changed: "sales",
  property_update: "sales",
  rental_contract_ending: "rentals",
  request_assigned: "requests",
  request_matched: "requests",
  system_alert: "system",
  task_assigned: "tasks",
  task_created_from_message: "messages",
  task_due_soon: "tasks",
  task_overdue: "tasks",
  visit_cancelled: "calendar",
  visit_overdue: "calendar",
  visit_rescheduled: "calendar",
  visit_scheduled: "calendar",
  visit_starts_soon: "calendar",
  workspace_alert: "workspace",
};

const highPriorityTypes = new Set<NotificationType>([
  "contract_expiring_soon",
  "contract_pending_signature",
  "duplicate_lead_detected",
  "lead_assigned",
  "lead_follow_up_overdue",
  "mention",
  "new_assigned_lead",
  "task_overdue",
  "visit_cancelled",
  "visit_overdue",
  "visit_starts_soon",
]);

const urgentTypes = new Set<NotificationType>([
  "contract_expiring_soon",
  "lead_follow_up_overdue",
  "task_overdue",
  "visit_overdue",
]);

export const categoryLabels: Record<NotificationCategory, { en: string; sq: string }> = {
  calendar: { en: "Calendar", sq: "Kalendari" },
  contracts: { en: "Contracts", sq: "Kontrata" },
  data_quality: { en: "Data quality", sq: "Cilesia e te dhenave" },
  documents: { en: "Documents", sq: "Dokumente" },
  leads: { en: "Leads", sq: "Leads" },
  map_location: { en: "Map/location", sq: "Harta/lokacioni" },
  messages: { en: "Messages", sq: "Mesazhe" },
  rentals: { en: "Rentals", sq: "Qira" },
  requests: { en: "Requests", sq: "Kerkesa" },
  sales: { en: "Sales", sq: "Shitje" },
  system: { en: "System", sq: "Sistemi" },
  tasks: { en: "Tasks", sq: "Detyra" },
  workspace: { en: "Workspace", sq: "Hapesira" },
};

export const priorityLabels: Record<NotificationPriority, { en: string; sq: string }> = {
  high: { en: "High", sq: "E larte" },
  low: { en: "Low", sq: "E ulet" },
  normal: { en: "Normal", sq: "Normale" },
  urgent: { en: "Urgent", sq: "Urgjente" },
};

export function getNotificationCategoryForType(type: NotificationType): NotificationCategory {
  return typeCategoryMap[type];
}

export function getNotificationPriorityForType(type: NotificationType): NotificationPriority {
  if (urgentTypes.has(type)) {
    return "urgent";
  }

  return highPriorityTypes.has(type) ? "high" : "normal";
}

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && notificationTypes.includes(value as NotificationType);
}

export function isNotificationCategory(value: unknown): value is NotificationCategory {
  return typeof value === "string" && notificationCategories.includes(value as NotificationCategory);
}

export function isNotificationPriority(value: unknown): value is NotificationPriority {
  return typeof value === "string" && notificationPriorities.includes(value as NotificationPriority);
}

export function clampUnreadBadgeCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  return count > 99 ? "99+" : String(Math.trunc(count));
}

export function sanitizeNotificationActionUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function formatNotificationRelativeTime(
  value: string,
  locale: Locale,
  now = new Date(),
) {
  const date = new Date(value);
  const diffMs = now.getTime() - date.getTime();

  if (!Number.isFinite(date.getTime()) || diffMs < 0) {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: appTimeZone,
    }).format(date);
  }

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return locale === "sq" ? "tani" : "now";
  }

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return locale === "sq" ? `${minutes} min me pare` : `${minutes} min ago`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return locale === "sq" ? `${hours} ore me pare` : `${hours}h ago`;
  }

  if (diffMs < 2 * day) {
    return locale === "sq" ? "dje" : "yesterday";
  }

  const days = Math.floor(diffMs / day);
  return locale === "sq" ? `para ${days} ditesh` : `${days} days ago`;
}
