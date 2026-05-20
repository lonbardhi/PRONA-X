import assert from "node:assert/strict";
import test from "node:test";

import {
  clampUnreadBadgeCount,
  formatNotificationRelativeTime,
  getNotificationCategoryForType,
  getNotificationPriorityForType,
  sanitizeNotificationActionUrl,
} from "./notifications/format.ts";
import {
  getNewUnreadNotifications,
  mergeSeenNotificationIds,
} from "./notifications/live.ts";
import type { NotificationListItem } from "./notifications/types.ts";
import { notificationListQuerySchema, notificationSnoozeSchema } from "./notifications/validation.ts";

test("notification badge count is hidden or capped safely", () => {
  assert.equal(clampUnreadBadgeCount(0), null);
  assert.equal(clampUnreadBadgeCount(-1), null);
  assert.equal(clampUnreadBadgeCount(3), "3");
  assert.equal(clampUnreadBadgeCount(135), "99+");
});

test("notification action URLs stay inside PRONA X", () => {
  assert.equal(sanitizeNotificationActionUrl("/messages?conversation=abc"), "/messages?conversation=abc");
  assert.equal(sanitizeNotificationActionUrl("https://example.com"), null);
  assert.equal(sanitizeNotificationActionUrl("//example.com"), null);
  assert.equal(sanitizeNotificationActionUrl("javascript:alert(1)"), null);
});

test("notification type maps to category and priority", () => {
  assert.equal(getNotificationCategoryForType("visit_scheduled"), "calendar");
  assert.equal(getNotificationCategoryForType("property_missing_coordinates"), "map_location");
  assert.equal(getNotificationPriorityForType("mention"), "high");
  assert.equal(getNotificationPriorityForType("task_overdue"), "urgent");
  assert.equal(getNotificationPriorityForType("message"), "normal");
});

test("notification query validation rejects unsafe values", () => {
  assert.equal(notificationListQuerySchema.safeParse({ limit: "20", status: "active" }).success, true);
  assert.equal(notificationListQuerySchema.safeParse({ limit: "500" }).success, false);
  assert.equal(notificationListQuerySchema.safeParse({ category: "private_notes" }).success, false);
});

test("notification snooze requires a future datetime", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();

  assert.equal(notificationSnoozeSchema.safeParse({ snoozedUntil: future }).success, true);
  assert.equal(notificationSnoozeSchema.safeParse({ snoozedUntil: past }).success, false);
});

test("relative timestamps localize current notifications", () => {
  const now = new Date("2026-05-19T10:00:00.000Z");

  assert.equal(formatNotificationRelativeTime("2026-05-19T09:59:30.000Z", "sq", now), "tani");
  assert.equal(formatNotificationRelativeTime("2026-05-19T09:55:00.000Z", "en", now), "5 min ago");
});

test("live notification helper returns only unseen unread items", () => {
  const baseItem = {
    actionUrl: null,
    actorUserId: null,
    archivedAt: null,
    body: "Body",
    category: "messages",
    conversationId: null,
    dismissedAt: null,
    entityId: null,
    entityType: null,
    expiresAt: null,
    messageId: null,
    metadata: {},
    priority: "normal",
    readAt: null,
    scheduledFor: null,
    snoozedUntil: null,
    status: "unread",
    title: "Title",
    type: "message",
  } satisfies Omit<NotificationListItem, "createdAt" | "id" | "isUnread">;
  const items: NotificationListItem[] = [
    {
      ...baseItem,
      createdAt: "2026-05-19T10:02:00.000Z",
      id: "newer",
      isUnread: true,
    },
    {
      ...baseItem,
      createdAt: "2026-05-19T10:01:00.000Z",
      id: "seen",
      isUnread: true,
    },
    {
      ...baseItem,
      createdAt: "2026-05-19T10:03:00.000Z",
      id: "read",
      isUnread: false,
      status: "read",
    },
  ];

  assert.deepEqual(
    getNewUnreadNotifications({
      currentItems: items,
      seenIds: new Set(["seen"]),
    }).map((item) => item.id),
    ["newer"],
  );
});

test("live notification helper stores newest seen ids first", () => {
  assert.deepEqual(
    mergeSeenNotificationIds(["old", "same"], ["new", "same"]).slice(0, 3),
    ["new", "same", "old"],
  );
});
