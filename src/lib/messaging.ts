import { z } from "zod";

import { appTimeZone, defaultLocale, getIntlLocale, type Locale } from "@/lib/i18n";

export const conversationTypes = [
  "direct",
  "group",
  "property_thread",
  "lead_thread",
  "meeting_thread",
  "deal_room",
  "team_channel",
  "media_request",
  "system",
] as const;

export const conversationEntityTypes = [
  "property",
  "lead",
  "meeting",
  "client",
  "deal",
  "task",
  "contract",
] as const;

export const participantRoles = ["owner", "admin", "member", "readonly"] as const;

export const messageTypes = [
  "text",
  "system",
  "attachment",
  "task_reference",
  "status_update",
  "note",
] as const;

export const messageNotificationTypes = [
  "message",
  "mention",
  "property_message",
  "lead_message",
  "meeting_message",
  "deal_room_message",
] as const;

export const messageAttachmentBucket = "message-attachments";
export const messageAttachmentMaxBytes = 25 * 1024 * 1024;
export const messageAttachmentMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "application/pdf",
  "video/mp4",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type ConversationType = (typeof conversationTypes)[number];
export type ConversationEntityType = (typeof conversationEntityTypes)[number];
export type ParticipantRole = (typeof participantRoles)[number];
export type MessageType = (typeof messageTypes)[number];
export type MessageNotificationType = (typeof messageNotificationTypes)[number];

export type MessagingProfile = {
  avatar_url?: string | null;
  email?: string | null;
  full_name: string | null;
  id: string;
  role: string;
};

export type ConversationParticipant = {
  conversation_id: string;
  created_at?: string;
  id: string;
  joined_at: string;
  last_read_at: string | null;
  last_read_message_id: string | null;
  left_at: string | null;
  muted_at: string | null;
  profile?: MessagingProfile | null;
  role: ParticipantRole;
  user_id: string;
};

export type ConversationRecord = {
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  created_by: string;
  description: string | null;
  id: string;
  is_archived: boolean;
  last_message_at: string | null;
  related_entity_id: string | null;
  related_entity_type: ConversationEntityType | null;
  title: string | null;
  type: ConversationType;
  updated_at: string;
};

export type MessageAttachment = {
  bucket_id: string;
  created_at: string;
  file_name: string;
  file_size: number | null;
  id: string;
  message_id: string;
  mime_type: string | null;
  signed_url?: string | null;
  storage_path: string;
  uploaded_by: string;
};

export type MessageMention = {
  created_at: string;
  id: string;
  mentioned_user_id: string;
  message_id: string;
  profile?: MessagingProfile | null;
};

export type MessageRecord = {
  attachments?: MessageAttachment[];
  content: string | null;
  conversation_id: string;
  created_at: string;
  deleted_at: string | null;
  edited_at: string | null;
  id: string;
  mentions?: MessageMention[];
  message_type: MessageType;
  metadata: Record<string, unknown>;
  parent_message_id: string | null;
  sender?: MessagingProfile | null;
  sender_id: string;
  updated_at: string;
};

export type ConversationListItem = ConversationRecord & {
  lastMessage: MessageRecord | null;
  participants: ConversationParticipant[];
  relatedLabel: string | null;
  unreadCount: number;
};

export type EntityConversationSummary = ConversationRecord & {
  unreadCount?: number;
};

export type CreateConversationInput = {
  participantIds: string[];
  title?: string;
  type: ConversationType;
};

export type SendMessageInput = {
  attachments?: File[];
  content: string;
  conversationId: string;
  mentionedUserIds?: string[];
};

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1, "Choose at least one teammate."),
  title: z.string().trim().max(140).optional(),
  type: z.enum(["direct", "group", "team_channel", "deal_room"]),
});

export const sendMessageSchema = z.object({
  content: z.string().max(5000, "Messages can be up to 5,000 characters.").default(""),
  conversationId: z.string().uuid("Choose a conversation."),
  mentionedUserIds: z.array(z.string().uuid()).default([]),
});

export const createEntityConversationSchema = z.object({
  conversationType: z.enum([
    "property_thread",
    "lead_thread",
    "meeting_thread",
    "deal_room",
    "media_request",
  ]),
  entityId: z.string().uuid("Missing related record."),
  entityType: z.enum(conversationEntityTypes),
  returnTo: z.string().trim().optional(),
});

export function sanitizeMessageText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

export function getMentionHandle(profile: MessagingProfile) {
  const source = profile.full_name || profile.email || profile.id;
  const handle = source
    .replace(/@.+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)+/g, "");

  return handle || profile.id.slice(0, 8);
}

export function getProfileDisplayName(profile: MessagingProfile | null | undefined) {
  if (!profile) {
    return "PRONA X";
  }

  return profile.full_name || profile.email || `User ${profile.id.slice(0, 8)}`;
}

export function getConversationTypeLabel(
  type: ConversationType,
  locale: Locale = defaultLocale,
) {
  const labels: Record<Locale, Record<ConversationType, string>> = {
    sq: {
      deal_room: "Deal Room",
      direct: "Direkt",
      group: "Grup",
      lead_thread: "Lead",
      media_request: "Media",
      meeting_thread: "Takim",
      property_thread: "Prone",
      system: "Sistem",
      team_channel: "Ekipi",
    },
    en: {
      deal_room: "Deal Room",
      direct: "Direct",
      group: "Group",
      lead_thread: "Lead",
      media_request: "Media",
      meeting_thread: "Meeting",
      property_thread: "Property",
      system: "System",
      team_channel: "Team",
    },
  };

  return labels[locale][type];
}

export function getConversationTypeTone(type: ConversationType) {
  if (type === "property_thread" || type === "media_request") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (type === "meeting_thread") {
    return "bg-blue-50 text-blue-700";
  }

  if (type === "deal_room") {
    return "bg-amber-50 text-amber-700";
  }

  if (type === "lead_thread") {
    return "bg-cyan-50 text-cyan-700";
  }

  if (type === "team_channel" || type === "group") {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function getConversationTitle(
  conversation: Pick<
    ConversationListItem,
    "participants" | "relatedLabel" | "title" | "type"
  >,
  currentUserId: string,
  locale: Locale = defaultLocale,
) {
  if (conversation.title) {
    return conversation.title;
  }

  if (conversation.relatedLabel) {
    return conversation.relatedLabel;
  }

  const otherParticipants = conversation.participants.filter(
    (participant) => participant.user_id !== currentUserId,
  );
  const names = otherParticipants.map((participant) =>
    getProfileDisplayName(participant.profile),
  );

  if (names.length > 0) {
    return names.join(", ");
  }

  return locale === "sq" ? "Bisedë e brendshme" : "Internal conversation";
}

export function getMessagePreview(message: MessageRecord | null, locale: Locale) {
  if (!message) {
    return locale === "sq" ? "Ende nuk ka mesazhe." : "No messages yet.";
  }

  if (message.deleted_at) {
    return locale === "sq" ? "Mesazhi u fshi" : "Message deleted";
  }

  if (message.content?.trim()) {
    return message.content.trim();
  }

  if ((message.attachments?.length || 0) > 0 || message.message_type === "attachment") {
    return locale === "sq" ? "Bashkëngjitje" : "Attachment";
  }

  return locale === "sq" ? "Përditësim" : "Update";
}

export function formatMessagingDateTime(
  value: string | null | undefined,
  locale: Locale = defaultLocale,
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: appTimeZone,
  }).format(new Date(value));
}

export function formatMessageFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes < 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getSafeMessagingReturnTo(value: FormDataEntryValue | null, fallback = "/messages") {
  const returnTo = String(value || fallback);
  return returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;
}

export function isMissingMessagingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  const details =
    "details" in error && typeof error.details === "string" ? error.details : "";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const text = `${message} ${details}`.toLowerCase();

  return (
    code === "PGRST204" ||
    code === "PGRST205" ||
    (text.includes("schema cache") &&
      (text.includes("conversations") ||
        text.includes("conversation_participants") ||
        text.includes("messages") ||
        text.includes("message_mentions") ||
        text.includes("message_attachments") ||
        text.includes("conversation_id") ||
        text.includes("message_id")))
  );
}

