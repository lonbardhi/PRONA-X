import type {
  notificationCategories,
  notificationEntityTypes,
  notificationPriorities,
  notificationStatuses,
  notificationTypes,
} from "./constants.ts";

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationCategory = (typeof notificationCategories)[number];
export type NotificationPriority = (typeof notificationPriorities)[number];
export type NotificationStatus = (typeof notificationStatuses)[number];
export type NotificationEntityType = (typeof notificationEntityTypes)[number];

export type NotificationMetadata = Record<string, string | number | boolean | null>;

export type NotificationListItem = {
  actionUrl: string | null;
  actorUserId: string | null;
  archivedAt: string | null;
  body: string;
  category: NotificationCategory;
  conversationId: string | null;
  createdAt: string;
  dismissedAt: string | null;
  entityId: string | null;
  entityType: NotificationEntityType | null;
  expiresAt: string | null;
  id: string;
  isUnread: boolean;
  messageId: string | null;
  metadata: NotificationMetadata;
  priority: NotificationPriority;
  readAt: string | null;
  scheduledFor: string | null;
  snoozedUntil: string | null;
  status: NotificationStatus;
  title: string;
  type: NotificationType;
};

export type NotificationListResponse = {
  items: NotificationListItem[];
  nextCursor: string | null;
  totalCount?: number;
  unreadCount: number;
  urgentUnreadCount: number;
};

export type NotificationCountSummary = {
  unreadCount: number;
  urgentUnreadCount: number;
};

export type CreateNotificationInput = {
  actionUrl?: string | null;
  actorUserId?: string | null;
  body: string;
  category?: NotificationCategory;
  dedupeKey?: string | null;
  entityId?: string | null;
  entityType?: NotificationEntityType | null;
  expiresAt?: string | null;
  idempotencyKey?: string | null;
  metadata?: NotificationMetadata;
  priority?: NotificationPriority;
  recipientUserIds: string[];
  scheduledFor?: string | null;
  title: string;
  type: NotificationType;
  workspaceId?: string;
};
