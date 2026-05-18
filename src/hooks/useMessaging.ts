"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/browser";
import type { AvailabilityStatus } from "@/lib/agent-workspace";
import {
  getConversationTitle,
  messageAttachmentBucket,
  type ConversationListItem,
  type MessageAttachment,
  type MessageMention,
  type MessageRecord,
  type MessagingProfile,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

type RawMessage = Omit<
  MessageRecord,
  "attachments" | "mentions" | "metadata" | "sender"
> & {
  metadata: unknown;
};
type RawAttachment = Omit<MessageAttachment, "signed_url">;
type RawMention = Omit<MessageMention, "profile">;
type RawUserStatus = {
  status: AvailabilityStatus;
  status_message: string | null;
  updated_at: string | null;
  user_id: string;
};

type ConversationReadMarker = {
  conversationId: string;
  currentUserId: string;
  latestMessage: MessageRecord;
  visibleMessageIds: string[];
};

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function groupBy<T>(rows: T[], getKey: (row: T) => string) {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return groups;
}

async function getProfilesByIds(
  supabase: SupabaseBrowserClient,
  userIds: string[],
) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));

  if (ids.length === 0) {
    return new Map<string, MessagingProfile>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,avatar_url")
    .in("id", ids);

  const profiles = (data || []) as MessagingProfile[];
  const statusMap = await getStatusByUserIds(supabase, ids);

  return byId(
    profiles.map((profile) => attachAvailabilityStatus(profile, statusMap)),
  );
}

async function getStatusByUserIds(
  supabase: SupabaseBrowserClient,
  userIds: string[],
) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));

  if (ids.length === 0) {
    return new Map<string, RawUserStatus>();
  }

  const { data } = await supabase
    .from("user_status")
    .select("user_id,status,status_message,updated_at")
    .in("user_id", ids);

  return new Map(
    ((data || []) as RawUserStatus[]).map((status) => [status.user_id, status]),
  );
}

function attachAvailabilityStatus(
  profile: MessagingProfile,
  statusMap: Map<string, RawUserStatus>,
): MessagingProfile {
  const status = statusMap.get(profile.id);

  return {
    ...profile,
    availability_status: status?.status || "offline",
    availability_status_message: status?.status_message || null,
    availability_status_updated_at: status?.updated_at || null,
  };
}

async function addSignedAttachmentUrls(
  supabase: SupabaseBrowserClient,
  attachments: RawAttachment[],
): Promise<MessageAttachment[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(attachment.bucket_id || messageAttachmentBucket)
        .createSignedUrl(attachment.storage_path, 60 * 60);

      return {
        ...attachment,
        signed_url: error ? null : data?.signedUrl || null,
      };
    }),
  );
}

export async function fetchConversationMessages(
  supabase: SupabaseBrowserClient,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id,conversation_id,sender_id,content,message_type,metadata,parent_message_id,edited_at,deleted_at,created_at,updated_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    throw error;
  }

  const messages = ((data || []) as RawMessage[])
    .map((message) => ({
      ...message,
      metadata: normalizeMetadata(message.metadata),
    }))
    .reverse();
  const messageIds = messages.map((message) => message.id);

  if (messageIds.length === 0) {
    return [];
  }

  const [attachmentResult, mentionResult] = await Promise.all([
    supabase
      .from("message_attachments")
      .select(
        "id,message_id,uploaded_by,bucket_id,storage_path,file_name,mime_type,file_size,created_at",
      )
      .in("message_id", messageIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("message_mentions")
      .select("id,message_id,mentioned_user_id,created_at")
      .in("message_id", messageIds),
  ]);

  const attachments = await addSignedAttachmentUrls(
    supabase,
    (attachmentResult.data || []) as RawAttachment[],
  );
  const mentions = (mentionResult.data || []) as RawMention[];
  const profileMap = await getProfilesByIds(supabase, [
    ...messages.map((message) => message.sender_id),
    ...mentions.map((mention) => mention.mentioned_user_id),
  ]);
  const attachmentGroups = groupBy(attachments, (attachment) => attachment.message_id);
  const mentionGroups = groupBy(mentions, (mention) => mention.message_id);

  return messages.map((message) => ({
    ...message,
    attachments: attachmentGroups.get(message.id) || [],
    mentions: (mentionGroups.get(message.id) || []).map((mention) => ({
      ...mention,
      profile: profileMap.get(mention.mentioned_user_id) || null,
    })),
    sender: profileMap.get(message.sender_id) || null,
  }));
}

async function persistConversationReadState(
  supabase: SupabaseBrowserClient,
  {
    conversationId,
    currentUserId,
    latestMessage,
    visibleMessageIds,
  }: ConversationReadMarker,
) {
  const { error: readError } = await supabase
    .from("conversation_participants")
    .update({
      last_read_at: latestMessage.created_at,
      last_read_message_id: latestMessage.id,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId)
    .is("left_at", null);

  if (readError) {
    throw readError;
  }

  if (visibleMessageIds.length === 0) {
    return;
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId)
    .is("read_at", null)
    .in("message_id", visibleMessageIds);
}

export function useConversations(
  initialConversations: ConversationListItem[],
  currentUserId: string,
) {
  const [conversations, setConversations] = useState(initialConversations);

  const upsertLastMessage = useCallback(
    (conversationId: string, message: MessageRecord) => {
      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessage: message,
                  last_message_at: message.created_at,
                }
              : conversation,
          )
          .sort((left, right) => {
            const leftTime = new Date(left.last_message_at || left.created_at).getTime();
            const rightTime = new Date(right.last_message_at || right.created_at).getTime();
            return rightTime - leftTime;
          }),
      );
    },
    [],
  );

  const markConversationRead = useCallback(
    (conversationId: string, latestMessage: MessageRecord) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                participants: conversation.participants.map((participant) =>
                  participant.user_id === currentUserId
                    ? {
                        ...participant,
                        last_read_at: latestMessage.created_at,
                        last_read_message_id: latestMessage.id,
                      }
                    : participant,
                ),
                unreadCount: 0,
              }
            : conversation,
        ),
      );
    },
    [currentUserId],
  );

  return { conversations, markConversationRead, setConversations, upsertLastMessage };
}

export function useConversationMessages({
  activeConversationId,
  currentUserId,
  initialConversationId,
  initialMessages,
  onConversationRead,
  onConversationReadCommitted,
  onLatestMessage,
}: {
  activeConversationId: string | null;
  currentUserId: string;
  initialConversationId: string | null;
  initialMessages: MessageRecord[];
  onConversationRead?: (conversationId: string, latestMessage: MessageRecord) => void;
  onConversationReadCommitted?: (conversationId: string) => void;
  onLatestMessage?: (conversationId: string, message: MessageRecord) => void;
}) {
  const [messages, setMessages] = useState<MessageRecord[]>(
    activeConversationId === initialConversationId ? initialMessages : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastMarkedReadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    fetchConversationMessages(supabase, activeConversationId)
      .then((nextMessages) => {
        if (!cancelled) {
          setMessages(nextMessages);
          setError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load messages.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function refreshMessages() {
      try {
        const nextMessages = await fetchConversationMessages(
          supabase,
          activeConversationId as string,
        );

        if (cancelled) {
          return;
        }

        setMessages(nextMessages);
        const latest = nextMessages[nextMessages.length - 1];
        if (latest) {
          onLatestMessage?.(activeConversationId as string, latest);
        }
      } catch {
        if (!cancelled) {
          setError("Realtime update failed. Refresh the page if messages look stale.");
        }
      }
    }

    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `conversation_id=eq.${activeConversationId}`,
          schema: "public",
          table: "messages",
        },
        () => {
          void refreshMessages();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [activeConversationId, onLatestMessage]);

  useEffect(() => {
    if (!activeConversationId || messages.length === 0) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    const readKey = `${activeConversationId}:${latestMessage.id}`;

    if (lastMarkedReadKeyRef.current === readKey) {
      return;
    }

    lastMarkedReadKeyRef.current = readKey;

    const visibleMessageIds = messages.map((message) => message.id);
    const supabase = createClient();

    onConversationRead?.(activeConversationId, latestMessage);
    void persistConversationReadState(supabase, {
      conversationId: activeConversationId,
      currentUserId,
      latestMessage,
      visibleMessageIds,
    })
      .then(() => {
        onConversationReadCommitted?.(activeConversationId);
      })
      .catch(() => {
        setError("Could not update read status. Refresh the page if badges look stale.");
      });
  }, [
    activeConversationId,
    currentUserId,
    messages,
    onConversationRead,
    onConversationReadCommitted,
  ]);

  return { error, loading, messages, setMessages };
}

export function useUnreadMessagesCount(conversations: ConversationListItem[]) {
  return useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations],
  );
}

export function useConversationSearch({
  conversations,
  currentUserId,
  filter,
  locale,
  query,
}: {
  conversations: ConversationListItem[];
  currentUserId: string;
  filter: string;
  locale: Locale;
  query: string;
}) {
  return useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (filter === "unread" && conversation.unreadCount === 0) {
        return false;
      }

      if (filter === "archived" && !conversation.is_archived) {
        return false;
      }

      if (
        filter !== "all" &&
        filter !== "unread" &&
        filter !== "archived" &&
        conversation.type !== filter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return filter === "archived" || !conversation.is_archived;
      }

      const title = getConversationTitle(conversation, currentUserId, locale);
      const participantNames = conversation.participants
        .map((participant) => participant.profile?.full_name || participant.profile?.email || "")
        .join(" ");
      const haystack = [
        title,
        conversation.relatedLabel || "",
        conversation.lastMessage?.content || "",
        participantNames,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [conversations, currentUserId, filter, locale, query]);
}
