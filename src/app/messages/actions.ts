"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createConversationSchema,
  createEntityConversationSchema,
  getProfileDisplayName,
  getSafeMessagingReturnTo,
  messageAttachmentBucket,
  messageAttachmentMaxBytes,
  messageAttachmentMimeTypes,
  sanitizeMessageText,
  sendMessageSchema,
  type ConversationEntityType,
  type ConversationRecord,
  type MessageNotificationType,
} from "@/lib/messaging";
import { createClient, requireApprovedUser } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const MAX_ATTACHMENTS = 5;

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Check the messaging fields.";
  }

  return error instanceof Error ? error.message : "Messaging action failed.";
}

function withQueryParam(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function withMessage(path: string, message: string) {
  return withQueryParam(path, "message", message);
}

function getUniqueIds(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)),
    ),
  );
}

function cleanFilename(name: string) {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return clean || "message-attachment";
}

function getAttachmentFiles(formData: FormData) {
  return formData.getAll("attachments").filter((file): file is File => {
    return file instanceof File && file.size > 0;
  });
}

function validateAttachmentFiles(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    return `Upload up to ${MAX_ATTACHMENTS} files per message.`;
  }

  for (const file of files) {
    if (!messageAttachmentMimeTypes.includes(file.type as never)) {
      return `${file.name} is not supported for message attachments.`;
    }

    if (file.size > messageAttachmentMaxBytes) {
      return `${file.name} is too large. Maximum file size is 25 MB.`;
    }
  }

  return null;
}

async function logMessagingActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("activity_logs").insert({
    action,
    entity_id: entityId,
    entity_type: entityType,
    metadata,
    user_id: userId,
  });
}

async function getConversationOrRedirect(
  supabase: SupabaseClient,
  conversationId: string,
  returnTo: string,
) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id,type,title,description,related_entity_type,related_entity_id,created_by,is_archived,archived_at,archived_by,last_message_at,created_at,updated_at",
    )
    .eq("id", conversationId)
    .single();

  if (error || !data) {
    redirect(withMessage(returnTo, "Conversation not found or access denied."));
  }

  return data as ConversationRecord;
}

async function getConversationParticipants(
  supabase: SupabaseClient,
  conversationId: string,
) {
  const { data } = await supabase
    .from("conversation_participants")
    .select("id,conversation_id,user_id,role,joined_at,left_at,muted_at,last_read_at")
    .eq("conversation_id", conversationId)
    .is("left_at", null);

  return (data || []) as Array<{
    conversation_id: string;
    id: string;
    joined_at: string;
    last_read_at: string | null;
    left_at: string | null;
    muted_at: string | null;
    role: string;
    user_id: string;
  }>;
}

async function getProfiles(
  supabase: SupabaseClient,
  userIds: string[],
) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) {
    return new Map();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,avatar_url")
    .in("id", ids);

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

function getNotificationType(
  conversation: Pick<ConversationRecord, "type">,
  isMention: boolean,
): MessageNotificationType {
  if (isMention) {
    return "mention";
  }

  if (conversation.type === "property_thread" || conversation.type === "media_request") {
    return "property_message";
  }

  if (conversation.type === "lead_thread") {
    return "lead_message";
  }

  if (conversation.type === "meeting_thread") {
    return "meeting_message";
  }

  if (conversation.type === "deal_room") {
    return "deal_room_message";
  }

  return "message";
}

function getMessageNotificationTitle({
  conversation,
  conversationTitle,
  isMention,
  senderName,
}: {
  conversation: Pick<ConversationRecord, "type">;
  conversationTitle: string;
  isMention: boolean;
  senderName: string;
}) {
  if (isMention) {
    return `You were mentioned by ${senderName}`;
  }

  if (conversation.type === "direct") {
    return `New message from ${senderName}`;
  }

  if (conversation.type === "meeting_thread") {
    return `New message on meeting: ${conversationTitle}`;
  }

  if (conversation.type === "property_thread" || conversation.type === "media_request") {
    return `New message on ${conversationTitle}`;
  }

  return `New message in ${conversationTitle}`;
}

function truncateNotificationBody(content: string) {
  if (content.length <= 180) {
    return content;
  }

  return `${content.slice(0, 177)}...`;
}

async function createMessageNotifications({
  conversation,
  conversationTitle,
  messageId,
  mentionedUserIds,
  preview,
  senderId,
  senderName,
  supabase,
}: {
  conversation: ConversationRecord;
  conversationTitle: string;
  mentionedUserIds: string[];
  messageId: string;
  preview: string;
  senderId: string;
  senderName: string;
  supabase: SupabaseClient;
}) {
  const participants = await getConversationParticipants(supabase, conversation.id);
  const activeRecipientIds = new Set(
    participants
      .filter((participant) => participant.user_id !== senderId)
      .map((participant) => participant.user_id),
  );
  const mentionRecipientIds = Array.from(
    new Set(mentionedUserIds.filter((id) => activeRecipientIds.has(id))),
  );
  const mentionSet = new Set(mentionRecipientIds);
  const genericRecipientIds = participants
    .filter(
      (participant) =>
        participant.user_id !== senderId &&
        !participant.muted_at &&
        !mentionSet.has(participant.user_id),
    )
    .map((participant) => participant.user_id);
  const notifications = [
    ...genericRecipientIds.map((userId) => ({
      conversation_id: conversation.id,
      message: truncateNotificationBody(preview),
      message_id: messageId,
      related_entity_id: conversation.related_entity_id,
      related_entity_type: conversation.related_entity_type,
      title: getMessageNotificationTitle({
        conversation,
        conversationTitle,
        isMention: false,
        senderName,
      }),
      type: getNotificationType(conversation, false),
      user_id: userId,
    })),
    ...mentionRecipientIds.map((userId) => ({
      conversation_id: conversation.id,
      message: truncateNotificationBody(preview),
      message_id: messageId,
      related_entity_id: conversation.related_entity_id,
      related_entity_type: conversation.related_entity_type,
      title: getMessageNotificationTitle({
        conversation,
        conversationTitle,
        isMention: true,
        senderName,
      }),
      type: getNotificationType(conversation, true),
      user_id: userId,
    })),
  ];

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }
}

async function findExistingDirectConversation(
  supabase: SupabaseClient,
  userIds: string[],
) {
  const { data } = await supabase
    .from("conversations")
    .select("id,type,conversation_participants(user_id,left_at)")
    .eq("type", "direct")
    .eq("is_archived", false);

  const target = [...userIds].sort().join(":");

  for (const conversation of (data || []) as Array<{
    conversation_participants?: Array<{ left_at: string | null; user_id: string }>;
    id: string;
    type: string;
  }>) {
    const participants = (conversation.conversation_participants || [])
      .filter((participant) => !participant.left_at)
      .map((participant) => participant.user_id)
      .sort()
      .join(":");

    if (participants === target) {
      return conversation.id;
    }
  }

  return null;
}

export async function createConversationAction(formData: FormData) {
  const returnTo = getSafeMessagingReturnTo(formData.get("return_to"));
  const { profile, supabase, user } = await requireApprovedUser();
  const participantIds = getUniqueIds(formData.getAll("participant_ids")).filter(
    (id) => id !== user.id,
  );
  const requestedType = String(formData.get("type") || "direct");
  const normalizedType =
    requestedType === "direct" && participantIds.length > 1 ? "group" : requestedType;

  let input;
  try {
    input = createConversationSchema.parse({
      participantIds,
      title: formData.get("title") || undefined,
      type: normalizedType,
    });
  } catch (error) {
    redirect(withMessage(returnTo, getActionErrorMessage(error)));
  }

  if (profile.role === "viewer" || profile.role === "pending") {
    redirect(withMessage(returnTo, "This role cannot create internal conversations."));
  }

  const allParticipantIds = Array.from(new Set([user.id, ...input.participantIds]));

  if (input.type === "direct" && allParticipantIds.length === 2) {
    const existingId = await findExistingDirectConversation(supabase, allParticipantIds);
    if (existingId) {
      redirect(`/messages?conversation=${existingId}`);
    }
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      created_by: user.id,
      title: input.type === "direct" ? null : input.title || null,
      type: input.type,
    })
    .select("id")
    .single();

  if (error || !conversation) {
    redirect(
      withMessage(returnTo, error?.message || "Could not create conversation."),
    );
  }

  const { error: participantError } = await supabase
    .from("conversation_participants")
    .insert(
      allParticipantIds.map((participantId) => ({
        conversation_id: conversation.id,
        role: participantId === user.id ? "owner" : "member",
        user_id: participantId,
      })),
    );

  if (participantError) {
    redirect(withMessage(returnTo, participantError.message));
  }

  await logMessagingActivity(
    supabase,
    user.id,
    "conversation_created",
    "conversation",
    conversation.id,
    { type: input.type },
  );

  revalidatePath("/messages");
  redirect(`/messages?conversation=${conversation.id}`);
}

async function getEntityContext({
  entityId,
  entityType,
  supabase,
  titleFallback,
  userId,
}: {
  entityId: string;
  entityType: ConversationEntityType;
  supabase: SupabaseClient;
  titleFallback: string;
  userId: string;
}) {
  if (entityType === "property") {
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,created_by,assigned_agent_id")
      .eq("id", entityId)
      .single();

    if (error || !data) {
      throw new Error("Property not found or access denied.");
    }

    return {
      participantIds: [userId, data.created_by, data.assigned_agent_id].filter(
        Boolean,
      ) as string[],
      title: data.title,
    };
  }

  if (entityType === "meeting") {
    const { data, error } = await supabase
      .from("appointments")
      .select("id,title,client_name,created_by,assigned_agent_id")
      .eq("id", entityId)
      .single();

    if (error || !data) {
      throw new Error("Meeting not found or access denied.");
    }

    return {
      participantIds: [userId, data.created_by, data.assigned_agent_id].filter(
        Boolean,
      ) as string[],
      title: data.client_name ? `${data.title} / ${data.client_name}` : data.title,
    };
  }

  return {
    participantIds: [userId],
    title: titleFallback,
  };
}

export async function createEntityConversationAction(formData: FormData) {
  const returnTo = getSafeMessagingReturnTo(formData.get("return_to"));
  const { profile, supabase, user } = await requireApprovedUser();

  let input;
  try {
    input = createEntityConversationSchema.parse({
      conversationType: formData.get("conversation_type"),
      entityId: formData.get("entity_id"),
      entityType: formData.get("entity_type"),
      returnTo,
    });
  } catch (error) {
    redirect(withMessage(returnTo, getActionErrorMessage(error)));
  }

  if (profile.role === "viewer" || profile.role === "pending") {
    redirect(withMessage(returnTo, "This role cannot start internal discussion threads."));
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", input.conversationType)
    .eq("related_entity_type", input.entityType)
    .eq("related_entity_id", input.entityId)
    .eq("is_archived", false)
    .maybeSingle();

  if (existing?.id) {
    redirect(withQueryParam(returnTo, "conversation", existing.id));
  }

  let entityContext;
  try {
    entityContext = await getEntityContext({
      entityId: input.entityId,
      entityType: input.entityType,
      supabase,
      titleFallback: String(formData.get("title") || "Internal discussion"),
      userId: user.id,
    });
  } catch (error) {
    redirect(withMessage(returnTo, getActionErrorMessage(error)));
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      created_by: user.id,
      related_entity_id: input.entityId,
      related_entity_type: input.entityType,
      title: entityContext.title,
      type: input.conversationType,
    })
    .select("id")
    .single();

  if (error || !conversation) {
    const { data: duplicate } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", input.conversationType)
      .eq("related_entity_type", input.entityType)
      .eq("related_entity_id", input.entityId)
      .eq("is_archived", false)
      .maybeSingle();

    if (duplicate?.id) {
      redirect(
        returnTo.startsWith("/messages")
          ? withQueryParam(returnTo, "conversation", duplicate.id)
          : returnTo,
      );
    }

    redirect(
      withMessage(returnTo, error?.message || "Could not create discussion thread."),
    );
  }

  const participantIds = Array.from(new Set(entityContext.participantIds));
  const { error: participantError } = await supabase
    .from("conversation_participants")
    .insert(
      participantIds.map((participantId) => ({
        conversation_id: conversation.id,
        role: participantId === user.id ? "owner" : "member",
        user_id: participantId,
      })),
    );

  if (participantError) {
    redirect(withMessage(returnTo, participantError.message));
  }

  await logMessagingActivity(
    supabase,
    user.id,
    "entity_conversation_created",
    input.entityType,
    input.entityId,
    { conversation_id: conversation.id, type: input.conversationType },
  );

  revalidatePath("/messages");
  revalidatePath(returnTo.split("?")[0] || "/messages");
  redirect(
    returnTo.startsWith("/messages")
      ? withQueryParam(returnTo, "conversation", conversation.id)
      : returnTo,
  );
}

async function uploadMessageAttachments({
  conversationId,
  files,
  messageId,
  supabase,
  userId,
}: {
  conversationId: string;
  files: File[];
  messageId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const storagePath = `conversations/${conversationId}/${messageId}/${crypto.randomUUID()}-${cleanFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(messageAttachmentBucket)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      uploadedPaths.push(storagePath);

      const { error: attachmentError } = await supabase
        .from("message_attachments")
        .insert({
          bucket_id: messageAttachmentBucket,
          file_name: file.name,
          file_size: file.size,
          message_id: messageId,
          mime_type: file.type,
          storage_path: storagePath,
          uploaded_by: userId,
        });

      if (attachmentError) {
        throw attachmentError;
      }
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(messageAttachmentBucket).remove(uploadedPaths);
    }

    throw error;
  }
}

export async function sendMessageAction(formData: FormData) {
  const returnTo = getSafeMessagingReturnTo(formData.get("return_to"));
  const { supabase, user } = await requireApprovedUser();
  const files = getAttachmentFiles(formData);
  const attachmentError = validateAttachmentFiles(files);

  if (attachmentError) {
    redirect(withMessage(returnTo, attachmentError));
  }

  const content = sanitizeMessageText(String(formData.get("content") || ""));
  const mentionedUserIds = getUniqueIds(formData.getAll("mentioned_user_ids"));

  let input;
  try {
    input = sendMessageSchema.parse({
      content,
      conversationId: formData.get("conversation_id"),
      mentionedUserIds,
    });
  } catch (error) {
    redirect(withMessage(returnTo, getActionErrorMessage(error)));
  }

  if (!input.content && files.length === 0) {
    redirect(withMessage(returnTo, "Write a message or add an attachment."));
  }

  const conversation = await getConversationOrRedirect(
    supabase,
    input.conversationId,
    returnTo,
  );

  if (conversation.is_archived) {
    redirect(withMessage(returnTo, "Archived conversations are read-only."));
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      content: input.content || null,
      conversation_id: input.conversationId,
      message_type: files.length > 0 && !input.content ? "attachment" : "text",
      metadata: files.length > 0 ? { attachment_count: files.length } : {},
      sender_id: user.id,
    })
    .select("id,created_at")
    .single();

  if (error || !message) {
    redirect(
      withMessage(returnTo, error?.message || "Could not send message."),
    );
  }

  try {
    await uploadMessageAttachments({
      conversationId: input.conversationId,
      files,
      messageId: message.id,
      supabase,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        `Message sent, but attachment upload failed: ${getActionErrorMessage(error)}`,
      ),
    );
  }

  const participants = await getConversationParticipants(supabase, input.conversationId);
  const activeParticipantIds = new Set(participants.map((participant) => participant.user_id));
  const validMentionIds = Array.from(
    new Set(
      input.mentionedUserIds.filter(
        (mentionedUserId) =>
          mentionedUserId !== user.id && activeParticipantIds.has(mentionedUserId),
      ),
    ),
  );

  if (validMentionIds.length > 0) {
    await supabase.from("message_mentions").insert(
      validMentionIds.map((mentionedUserId) => ({
        mentioned_user_id: mentionedUserId,
        message_id: message.id,
      })),
    );
  }

  const profiles = await getProfiles(supabase, [user.id]);
  const senderProfile = profiles.get(user.id);
  const senderName = getProfileDisplayName(senderProfile);
  const preview =
    input.content ||
    (files.length === 1
      ? `${senderName} sent ${files[0].name}`
      : `${senderName} sent ${files.length} attachments`);
  const conversationTitle = conversation.title || "PRONA X";

  await createMessageNotifications({
    conversation,
    conversationTitle,
    mentionedUserIds: validMentionIds,
    messageId: message.id,
    preview,
    senderId: user.id,
    senderName,
    supabase,
  });

  await logMessagingActivity(
    supabase,
    user.id,
    "message_sent",
    "conversation",
    input.conversationId,
    {
      message_id: message.id,
      related_entity_id: conversation.related_entity_id,
      related_entity_type: conversation.related_entity_type,
    },
  );

  revalidatePath("/messages");
  if (conversation.related_entity_type === "property" && conversation.related_entity_id) {
    revalidatePath(`/properties/${conversation.related_entity_id}/edit`);
  }
  revalidatePath(returnTo.split("?")[0] || "/messages");
  redirect(returnTo);
}

export async function markConversationReadAction(formData: FormData) {
  const returnTo = getSafeMessagingReturnTo(formData.get("return_to"));
  const conversationId = String(formData.get("conversation_id") || "");
  const { supabase, user } = await requireApprovedUser();

  if (!conversationId) {
    redirect(returnTo);
  }

  const { data: latestMessage } = await supabase
    .from("messages")
    .select("id,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("conversation_participants")
    .update({
      last_read_at: latestMessage?.created_at || new Date().toISOString(),
      last_read_message_id: latestMessage?.id || null,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/messages");
  redirect(returnTo);
}

export async function deleteMessageAction(formData: FormData) {
  const returnTo = getSafeMessagingReturnTo(formData.get("return_to"));
  const messageId = String(formData.get("message_id") || "");
  const { supabase } = await requireApprovedUser();

  if (!messageId) {
    redirect(returnTo);
  }

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    redirect(withMessage(returnTo, error.message));
  }

  revalidatePath("/messages");
  revalidatePath(returnTo.split("?")[0] || "/messages");
  redirect(returnTo);
}

export async function archiveConversationAction(formData: FormData) {
  const returnTo = getSafeMessagingReturnTo(formData.get("return_to"));
  const conversationId = String(formData.get("conversation_id") || "");
  const { supabase, user } = await requireApprovedUser();

  if (!conversationId) {
    redirect(returnTo);
  }

  const { error } = await supabase
    .from("conversations")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user.id,
      is_archived: true,
    })
    .eq("id", conversationId);

  if (error) {
    redirect(withMessage(returnTo, error.message));
  }

  await logMessagingActivity(
    supabase,
    user.id,
    "conversation_archived",
    "conversation",
    conversationId,
  );

  revalidatePath("/messages");
  redirect("/messages");
}
