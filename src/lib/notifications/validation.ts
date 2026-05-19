import { z } from "zod";

import {
  notificationCategories,
  notificationEntityTypes,
  notificationStatuses,
} from "./constants.ts";

const positiveLimitSchema = z.coerce.number().int().min(1).max(50).default(20);

export const notificationListQuerySchema = z.object({
  category: z.enum(notificationCategories).optional(),
  cursor: z.string().datetime().optional(),
  limit: positiveLimitSchema,
  status: z
    .enum([...notificationStatuses, "active", "all"] as const)
    .default("active"),
  unreadOnly: z.coerce.boolean().optional(),
});

export const markAllNotificationsSchema = z.object({
  category: z.enum(notificationCategories).optional(),
});

export const notificationSnoozeSchema = z.object({
  snoozedUntil: z.string().datetime(),
}).refine(
  (value) => new Date(value.snoozedUntil).getTime() > Date.now(),
  {
    message: "Snooze date must be in the future",
    path: ["snoozedUntil"],
  },
);

export const notificationPreferenceSchema = z.object({
  email_notifications: z.coerce.boolean().optional(),
  in_app_notifications: z.coerce.boolean().optional(),
  push_notifications: z.coerce.boolean().optional(),
  reminder_minutes_before_meeting: z.coerce.number().int().min(0).max(10080).optional(),
  whatsapp_notifications: z.coerce.boolean().optional(),
});

export const notificationEntityReferenceSchema = z.object({
  related_entity_id: z.string().uuid().nullable().optional(),
  related_entity_type: z.enum(notificationEntityTypes).nullable().optional(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
