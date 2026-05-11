import type { User } from "@supabase/supabase-js";

import {
  getConversationTitle,
  isMissingMessagingSchemaError,
  messageAttachmentBucket,
  type ConversationEntityType,
  type ConversationListItem,
  type ConversationParticipant,
  type ConversationRecord,
  type ConversationType,
  type EntityConversationSummary,
  type MessageAttachment,
  type MessageMention,
  type MessageRecord,
  type MessagingProfile,
} from "@/lib/messaging";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RawConversation = ConversationRecord;
type RawParticipant = Omit<ConversationParticipant, "profile">;
type RawMessage = Omit<
  MessageRecord,
  "attachments" | "mentions" | "metadata" | "sender"
> & {
  metadata: unknown;
};
type RawAttachment = Omit<MessageAttachment, "signed_url">;
type RawMention = Omit<MessageMention, "profile">;

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
  supabase: SupabaseServerClient,
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

  return byId((data || []) as MessagingProfile[]);
}

async function addSignedAttachmentUrls(
  supabase: SupabaseServerClient,
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

async function getRelatedLabels(
  supabase: SupabaseServerClient,
  conversations: ConversationRecord[],
) {
  const labels = new Map<string, string>();
  const propertyIds = conversations
    .filter(
      (conversation) =>
        conversation.related_entity_type === "property" &&
        conversation.related_entity_id,
    )
    .map((conversation) => conversation.related_entity_id as string);
  const meetingIds = conversations
    .filter(
      (conversation) =>
        conversation.related_entity_type === "meeting" &&
        conversation.related_entity_id,
    )
    .map((conversation) => conversation.related_entity_id as string);

  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from("properties")
      .select("id,title")
      .in("id", Array.from(new Set(propertyIds)));

    for (const property of (data || []) as Array<{ id: string; title: string }>) {
      labels.set(`property:${property.id}`, property.title);
    }
  }

  if (meetingIds.length > 0) {
    const { data } = await supabase
      .from("appointments")
      .select("id,title,client_name")
      .in("id", Array.from(new Set(meetingIds)));

    for (const meeting of (data || []) as Array<{
      client_name: string | null;
      id: string;
      title: string;
    }>) {
      labels.set(
        `meeting:${meeting.id}`,
        meeting.client_name ? `${meeting.title} / ${meeting.client_name}` : meeting.title,
      );
    }
  }

  return labels;
}

export async function getMessagingProfiles(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,avatar_url")
    .neq("role", "pending")
    .order("full_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as MessagingProfile[];
}

export async function getConversationMessages(
  supabase: SupabaseServerClient,
  conversationId: string,
  limit = 80,
): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id,conversation_id,sender_id,content,message_type,metadata,parent_message_id,edited_at,deleted_at,created_at,updated_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
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
  const profileIds = [
    ...messages.map((message) => message.sender_id),
    ...mentions.map((mention) => mention.mentioned_user_id),
  ];
  const profileMap = await getProfilesByIds(supabase, profileIds);
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

export async function getConversationsForUser(
  supabase: SupabaseServerClient,
  currentUserId: string,
  limit = 100,
): Promise<ConversationListItem[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id,type,title,description,related_entity_type,related_entity_id,created_by,is_archived,archived_at,archived_by,last_message_at,created_at,updated_at",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const conversations = (data || []) as RawConversation[];
  const conversationIds = conversations.map((conversation) => conversation.id);

  if (conversationIds.length === 0) {
    return [];
  }

  const [participantResult, recentMessagesResult, relatedLabels] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select(
        "id,conversation_id,user_id,role,joined_at,left_at,muted_at,last_read_message_id,last_read_at,created_at",
      )
      .in("conversation_id", conversationIds)
      .order("joined_at", { ascending: true }),
    supabase
      .from("messages")
      .select(
        "id,conversation_id,sender_id,content,message_type,metadata,parent_message_id,edited_at,deleted_at,created_at,updated_at",
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(Math.min(500, Math.max(100, conversationIds.length * 8))),
    getRelatedLabels(supabase, conversations),
  ]);

  const participants = ((participantResult.data || []) as RawParticipant[]).filter(
    (participant) => !participant.left_at,
  );
  const recentMessages = ((recentMessagesResult.data || []) as RawMessage[]).map(
    (message) => ({
      ...message,
      metadata: normalizeMetadata(message.metadata),
    }),
  );
  const profileIds = [
    ...participants.map((participant) => participant.user_id),
    ...recentMessages.map((message) => message.sender_id),
  ];
  const profileMap = await getProfilesByIds(supabase, profileIds);
  const participantsByConversation = groupBy(
    participants.map((participant) => ({
      ...participant,
      profile: profileMap.get(participant.user_id) || null,
    })),
    (participant) => participant.conversation_id,
  );
  const messagesByConversation = groupBy(
    recentMessages.map((message) => ({
      ...message,
      sender: profileMap.get(message.sender_id) || null,
    })),
    (message) => message.conversation_id,
  );

  return conversations.map((conversation) => {
    const conversationParticipants =
      participantsByConversation.get(conversation.id) || [];
    const currentParticipant = conversationParticipants.find(
      (participant) => participant.user_id === currentUserId,
    );
    const conversationMessages = messagesByConversation.get(conversation.id) || [];
    const lastMessage = conversationMessages[0] || null;
    const lastReadAt = currentParticipant?.last_read_at
      ? new Date(currentParticipant.last_read_at).getTime()
      : 0;
    const unreadCount = conversationMessages.filter((message) => {
      return (
        message.sender_id !== currentUserId &&
        new Date(message.created_at).getTime() > lastReadAt
      );
    }).length;
    const relatedLabel =
      conversation.related_entity_type && conversation.related_entity_id
        ? relatedLabels.get(
            `${conversation.related_entity_type}:${conversation.related_entity_id}`,
          ) || null
        : null;

    return {
      ...conversation,
      lastMessage,
      participants: conversationParticipants,
      relatedLabel,
      title:
        conversation.title ||
        getConversationTitle(
          {
            participants: conversationParticipants,
            relatedLabel,
            title: conversation.title,
            type: conversation.type,
          },
          currentUserId,
        ),
      unreadCount,
    };
  });
}

export async function getUnreadMessagingCount(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("last_read_at,conversation:conversations(last_message_at,is_archived)")
    .eq("user_id", userId)
    .is("left_at", null);

  if (error || !data) {
    return 0;
  }

  return ((data || []) as unknown as Array<{
    conversation?:
      | { is_archived: boolean; last_message_at: string | null }
      | Array<{ is_archived: boolean; last_message_at: string | null }>
      | null;
    last_read_at: string | null;
  }>).filter((row) => {
    const conversation = Array.isArray(row.conversation)
      ? row.conversation[0]
      : row.conversation;

    if (!conversation || conversation.is_archived || !conversation.last_message_at) {
      return false;
    }

    if (!row.last_read_at) {
      return true;
    }

    return (
      new Date(conversation.last_message_at).getTime() >
      new Date(row.last_read_at).getTime()
    );
  }).length;
}

export async function getEntityConversation(
  supabase: SupabaseServerClient,
  entityType: ConversationEntityType,
  entityId: string,
  conversationType: ConversationType,
): Promise<EntityConversationSummary | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id,type,title,description,related_entity_type,related_entity_id,created_by,is_archived,archived_at,archived_by,last_message_at,created_at,updated_at",
    )
    .eq("type", conversationType)
    .eq("related_entity_type", entityType)
    .eq("related_entity_id", entityId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EntityConversationSummary;
}

export async function getMessagingSetupWarning(
  supabase: SupabaseServerClient,
) {
  const { error } = await supabase.from("conversations").select("id").limit(1);

  return isMissingMessagingSchemaError(error)
    ? "Internal messaging database setup is pending. Run supabase/migrations/0010_internal_messaging.sql in Supabase SQL Editor, then refresh the page."
    : null;
}

export async function getMessagingPageData({
  selectedConversationId,
  supabase,
  user,
}: {
  selectedConversationId?: string;
  supabase: SupabaseServerClient;
  user: User;
}) {
  const [conversations, profiles] = await Promise.all([
    getConversationsForUser(supabase, user.id),
    getMessagingProfiles(supabase),
  ]);
  const activeConversationId =
    selectedConversationId &&
    conversations.some((conversation) => conversation.id === selectedConversationId)
      ? selectedConversationId
      : conversations[0]?.id;
  const messages = activeConversationId
    ? await getConversationMessages(supabase, activeConversationId)
    : [];

  return {
    activeConversationId: activeConversationId || null,
    conversations,
    messages,
    profiles,
  };
}
