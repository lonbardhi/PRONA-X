import type { NotificationListItem } from "./types.ts";

const maxStoredIds = 80;

export function getNewUnreadNotifications({
  currentItems,
  seenIds,
  maxItems = 3,
}: {
  currentItems: NotificationListItem[];
  maxItems?: number;
  seenIds: ReadonlySet<string>;
}) {
  return currentItems
    .filter((item) => item.isUnread && !seenIds.has(item.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxItems);
}

export function mergeSeenNotificationIds(
  previousIds: Iterable<string>,
  nextIds: Iterable<string>,
) {
  return [...new Set([...nextIds, ...previousIds])].slice(0, maxStoredIds);
}

