import type { createClient } from "@/lib/supabase/server";
import {
  defaultNotificationWorkspaceId,
  notificationCategories,
  notificationPriorities,
  notificationStatuses,
  notificationTypes,
} from "@/lib/notifications/constants";
import {
  getNotificationCategoryForType,
  getNotificationPriorityForType,
  isNotificationCategory,
  isNotificationPriority,
  isNotificationType,
  sanitizeNotificationActionUrl,
} from "@/lib/notifications/format";
import type {
  CreateNotificationInput,
  NotificationCategory,
  NotificationCountSummary,
  NotificationListItem,
  NotificationListResponse,
  NotificationStatus,
} from "@/lib/notifications/types";
import type { AuthProfile } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type NotificationRow = {
  action_url?: string | null;
  actor_user_id?: string | null;
  archived_at?: string | null;
  category?: string | null;
  conversation_id?: string | null;
  created_at: string;
  dismissed_at?: string | null;
  expires_at?: string | null;
  id: string;
  message: string | null;
  message_id?: string | null;
  metadata?: unknown;
  priority?: string | null;
  read_at: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  scheduled_for?: string | null;
  snoozed_until?: string | null;
  status?: string | null;
  title: string | null;
  type: string;
  user_id: string;
  workspace_id?: string | null;
};

type ListNotificationsOptions = {
  category?: NotificationCategory;
  cursor?: string;
  limit?: number;
  status?: NotificationStatus | "active" | "all";
  unreadOnly?: boolean;
};

const notificationSelect =
  "id,user_id,workspace_id,title,message,type,category,priority,status,actor_user_id,related_entity_type,related_entity_id,conversation_id,message_id,action_url,metadata,read_at,scheduled_for,expires_at,archived_at,dismissed_at,snoozed_until,created_at";

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      safe[key] = item;
    }
  }

  return safe;
}

function normalizeNotificationStatus(row: NotificationRow): NotificationStatus {
  if (
    typeof row.status === "string" &&
    notificationStatuses.includes(row.status as NotificationStatus)
  ) {
    return row.status as NotificationStatus;
  }

  return row.read_at ? "read" : "unread";
}

function buildFallbackActionUrl(row: NotificationRow) {
  if (row.conversation_id) {
    return `/messages?conversation=${row.conversation_id}`;
  }

  if (row.related_entity_type === "appointment") {
    return "/appointments";
  }

  if (
    row.related_entity_id &&
    ["property", "sale_property", "rental_property"].includes(
      row.related_entity_type || "",
    )
  ) {
    return `/properties/${row.related_entity_id}`;
  }

  if (row.related_entity_type === "request") {
    return "/requests";
  }

  if (row.related_entity_type === "contract" || row.related_entity_type === "document") {
    return "/documents";
  }

  return null;
}

export function getNotificationWorkspaceId(_profile?: Pick<AuthProfile, "agency_name" | "id"> | null) {
  void _profile;

  return defaultNotificationWorkspaceId;
}

export function normalizeNotificationRow(row: NotificationRow): NotificationListItem {
  const type = isNotificationType(row.type) ? row.type : "system_alert";
  const category = isNotificationCategory(row.category)
    ? row.category
    : getNotificationCategoryForType(type);
  const priority = isNotificationPriority(row.priority)
    ? row.priority
    : getNotificationPriorityForType(type);
  const status = normalizeNotificationStatus(row);
  const snoozeExpired =
    status === "snoozed" &&
    row.snoozed_until !== null &&
    row.snoozed_until !== undefined &&
    new Date(row.snoozed_until).getTime() <= Date.now();
  const actionUrl =
    sanitizeNotificationActionUrl(row.action_url) ||
    sanitizeNotificationActionUrl(buildFallbackActionUrl(row));

  return {
    actionUrl,
    actorUserId: row.actor_user_id || null,
    archivedAt: row.archived_at || null,
    body: row.message || "",
    category,
    conversationId: row.conversation_id || null,
    createdAt: row.created_at,
    dismissedAt: row.dismissed_at || null,
    entityId: row.related_entity_id || null,
    entityType: row.related_entity_type as NotificationListItem["entityType"],
    expiresAt: row.expires_at || null,
    id: row.id,
    isUnread: !row.read_at && (status === "unread" || snoozeExpired),
    messageId: row.message_id || null,
    metadata: normalizeMetadata(row.metadata),
    priority,
    readAt: row.read_at,
    scheduledFor: row.scheduled_for || null,
    snoozedUntil: row.snoozed_until || null,
    status,
    title: row.title || "PRONA X",
    type,
  };
}

function applyActiveFilters<QueryBuilder>(
  query: QueryBuilder,
  nowIso: string,
): QueryBuilder {
  type QueryWithActiveFilters = {
    neq: (column: string, value: string) => QueryWithActiveFilters;
    or: (filters: string) => QueryWithActiveFilters;
  };

  return ((query as QueryWithActiveFilters)
    .neq("status", "archived")
    .neq("status", "dismissed")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`) as unknown) as QueryBuilder;
}

export async function getUnreadNotificationCount({
  supabase,
  userId,
  workspaceId = defaultNotificationWorkspaceId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  workspaceId?: string;
}): Promise<NotificationCountSummary> {
  const nowIso = new Date().toISOString();
  let countQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .is("read_at", null)
    .or(`status.eq.unread,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`);

  countQuery = applyActiveFilters(countQuery, nowIso);

  const urgentQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("priority", "urgent")
    .is("read_at", null)
    .or(`status.eq.unread,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`);

  const [countResult, urgentResult] = await Promise.all([
    countQuery,
    applyActiveFilters(urgentQuery, nowIso),
  ]);

  return {
    unreadCount: countResult.count || 0,
    urgentUnreadCount: urgentResult.count || 0,
  };
}

export async function listNotificationsForUser({
  category,
  cursor,
  limit = 20,
  status = "active",
  supabase,
  unreadOnly,
  userId,
  workspaceId = defaultNotificationWorkspaceId,
}: ListNotificationsOptions & {
  supabase: SupabaseServerClient;
  userId: string;
  workspaceId?: string;
}): Promise<NotificationListResponse> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const nowIso = new Date().toISOString();
  let query = supabase
    .from("notifications")
    .select(notificationSelect, { count: "exact" })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(safeLimit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (unreadOnly || status === "unread") {
    query = query
      .is("read_at", null)
      .or(`status.eq.unread,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`);
    query = applyActiveFilters(query, nowIso);
  } else if (status === "active") {
    query = applyActiveFilters(query, nowIso);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  const [{ data, count, error }, counts] = await Promise.all([
    query,
    getUnreadNotificationCount({ supabase, userId, workspaceId }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data || []) as NotificationRow[]).map(normalizeNotificationRow);
  const visibleRows = rows.slice(0, safeLimit);

  return {
    items: visibleRows,
    nextCursor: rows.length > safeLimit ? visibleRows.at(-1)?.createdAt || null : null,
    totalCount: count || 0,
    unreadCount: counts.unreadCount,
    urgentUnreadCount: counts.urgentUnreadCount,
  };
}

export async function markNotificationRead({
  notificationId,
  supabase,
  userId,
  workspaceId = defaultNotificationWorkspaceId,
}: {
  notificationId: string;
  supabase: SupabaseServerClient;
  userId: string;
  workspaceId?: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now, status: "read" })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead({
  category,
  supabase,
  userId,
  workspaceId = defaultNotificationWorkspaceId,
}: {
  category?: NotificationCategory;
  supabase: SupabaseServerClient;
  userId: string;
  workspaceId?: string;
}) {
  const now = new Date().toISOString();
  let query = supabase
    .from("notifications")
    .update({ read_at: now, status: "read" })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .is("read_at", null)
    .or(`status.eq.unread,and(status.eq.snoozed,snoozed_until.lte.${now})`);

  if (category) {
    query = query.eq("category", category);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function archiveNotification({
  notificationId,
  supabase,
  userId,
  workspaceId = defaultNotificationWorkspaceId,
}: {
  notificationId: string;
  supabase: SupabaseServerClient;
  userId: string;
  workspaceId?: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: now, read_at: now, status: "archived" })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function snoozeNotification({
  notificationId,
  snoozedUntil,
  supabase,
  userId,
  workspaceId = defaultNotificationWorkspaceId,
}: {
  notificationId: string;
  snoozedUntil: string;
  supabase: SupabaseServerClient;
  userId: string;
  workspaceId?: string;
}) {
  const { error } = await supabase
    .from("notifications")
    .update({ snoozed_until: snoozedUntil, status: "snoozed" })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createNotificationForUsers({
  actionUrl,
  actorUserId,
  body,
  category,
  dedupeKey,
  entityId,
  entityType,
  expiresAt,
  idempotencyKey,
  metadata,
  priority,
  recipientUserIds,
  scheduledFor,
  supabase,
  title,
  type,
  workspaceId = defaultNotificationWorkspaceId,
}: CreateNotificationInput & {
  supabase: SupabaseServerClient;
}) {
  if (!notificationTypes.includes(type)) {
    throw new Error("Unsupported notification type");
  }

  const safeRecipients = uniqueIds(recipientUserIds);
  if (safeRecipients.length === 0) {
    return;
  }

  const resolvedCategory =
    category && notificationCategories.includes(category)
      ? category
      : getNotificationCategoryForType(type);
  const resolvedPriority =
    priority && notificationPriorities.includes(priority)
      ? priority
      : getNotificationPriorityForType(type);
  const safeActionUrl = sanitizeNotificationActionUrl(actionUrl);

  const rows = safeRecipients.map((userId) => ({
    action_url: safeActionUrl,
    actor_user_id: actorUserId || null,
    category: resolvedCategory,
    dedupe_key: dedupeKey || null,
    delivered_at: new Date().toISOString(),
    expires_at: expiresAt || null,
    idempotency_key: idempotencyKey ? `${idempotencyKey}:${userId}` : null,
    message: body.slice(0, 800),
    metadata: metadata || {},
    priority: resolvedPriority,
    related_entity_id: entityId || null,
    related_entity_type: entityType || null,
    scheduled_for: scheduledFor || null,
    status: "unread",
    title: title.slice(0, 160),
    type,
    user_id: userId,
    workspace_id: workspaceId,
  }));

  const { error } = await supabase.from("notifications").insert(rows);

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}
