"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  formDataToSupportTicketInput,
  sanitizeSupportText,
  supportAttachmentBucket,
  supportAttachmentMaxBytes,
  supportAttachmentMimeTypes,
  supportReplySchema,
  supportTicketPriorities,
  supportTicketStatuses,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/lib/support";
import {
  createClient,
  isSupportRole,
  requireApprovedUser,
} from "@/lib/supabase/server";

const MAX_ATTACHMENTS = 5;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Check the support ticket fields.";
  }

  return error instanceof Error ? error.message : "Support action failed.";
}

function getSafeReturnTo(formData: FormData, fallback = "/support") {
  const returnTo = String(formData.get("return_to") || fallback);

  return returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : fallback;
}

function cleanFilename(name: string) {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return clean || "support-attachment";
}

function getAttachmentFiles(formData: FormData) {
  return formData.getAll("attachments").filter((file): file is File => {
    return file instanceof File && file.size > 0;
  });
}

function validateAttachmentFiles(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    return `Upload up to ${MAX_ATTACHMENTS} files per ticket or reply.`;
  }

  for (const file of files) {
    if (!supportAttachmentMimeTypes.includes(file.type as never)) {
      return `${file.name} is not supported. Use PNG, JPG, WebP, PDF, or MP4.`;
    }

    if (file.size > supportAttachmentMaxBytes) {
      return `${file.name} is too large. Maximum file size is 25 MB.`;
    }
  }

  return null;
}

async function uploadSupportAttachments({
  files,
  isInternal = false,
  messageId = null,
  supabase,
  ticketId,
  userId,
}: {
  files: File[];
  isInternal?: boolean;
  messageId?: string | null;
  supabase: SupabaseClient;
  ticketId: string;
  userId: string;
}) {
  for (const file of files) {
    const storagePath = `tickets/${ticketId}/${crypto.randomUUID()}-${cleanFilename(
      file.name,
    )}`;
    const { error: uploadError } = await supabase.storage
      .from(supportAttachmentBucket)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: attachmentError } = await supabase
      .from("support_ticket_attachments")
      .insert({
        bucket_id: supportAttachmentBucket,
        created_by: userId,
        file_name: file.name,
        file_size: file.size,
        is_internal: isInternal,
        message_id: messageId,
        mime_type: file.type,
        storage_path: storagePath,
        ticket_id: ticketId,
      });

    if (attachmentError) {
      throw attachmentError;
    }
  }
}

function createTicketNumber() {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `PX-${stamp}-${suffix}`;
}

async function logTicketActivity(
  supabase: SupabaseClient,
  ticketId: string,
  actorId: string,
  activityType: string,
  values: {
    body?: string | null;
    fromValue?: string | null;
    toValue?: string | null;
  } = {},
) {
  await supabase.from("support_ticket_activity").insert({
    activity_type: activityType,
    actor_id: actorId,
    body: values.body || null,
    from_value: values.fromValue || null,
    ticket_id: ticketId,
    to_value: values.toValue || null,
  });
}

async function requireTicketAccess(
  supabase: SupabaseClient,
  ticketId: string,
) {
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id,status,priority,assigned_to,created_by")
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    redirect("/support?message=Ticket not found or access denied.");
  }

  return ticket;
}

export async function createSupportTicketAction(formData: FormData) {
  const { profile, supabase, user } = await requireApprovedUser();
  const files = getAttachmentFiles(formData);
  const attachmentError = validateAttachmentFiles(files);

  if (attachmentError) {
    redirect(`/support?message=${encodeURIComponent(attachmentError)}`);
  }

  let input;
  try {
    input = formDataToSupportTicketInput(formData);
  } catch (error) {
    redirect(`/support?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      browser: sanitizeSupportText(input.browser || ""),
      category: input.category,
      created_by: user.id,
      description: sanitizeSupportText(input.description),
      device: sanitizeSupportText(input.device || ""),
      os: sanitizeSupportText(input.os || ""),
      page_url: sanitizeSupportText(input.page_url || ""),
      priority: input.priority,
      related_module: sanitizeSupportText(input.related_module || ""),
      related_property_id: input.related_property_id || null,
      screen_size: sanitizeSupportText(input.screen_size || ""),
      status: "open",
      steps_to_reproduce: sanitizeSupportText(input.steps_to_reproduce || ""),
      ticket_number: createTicketNumber(),
      title: sanitizeSupportText(input.title),
    })
    .select("id,ticket_number")
    .single();

  if (error || !ticket) {
    redirect(
      `/support?message=${encodeURIComponent(
        error?.message || "Could not create support ticket.",
      )}`,
    );
  }

  await logTicketActivity(supabase, ticket.id, user.id, "ticket_created", {
    body: `${profile.full_name || user.email || "User"} created ${ticket.ticket_number}`,
  });

  try {
    await uploadSupportAttachments({
      files,
      supabase,
      ticketId: ticket.id,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      `/support/${ticket.id}?message=${encodeURIComponent(
        `Ticket created, but attachment upload failed: ${getActionErrorMessage(error)}`,
      )}`,
    );
  }

  revalidatePath("/support");
  redirect(`/support/${ticket.id}?message=Ticket%20created`);
}

export async function addSupportReplyAction(ticketId: string, formData: FormData) {
  const returnTo = getSafeReturnTo(formData, `/support/${ticketId}`);
  const { profile, supabase, user } = await requireApprovedUser();
  const canManageSupport = isSupportRole(profile.role);
  await requireTicketAccess(supabase, ticketId);
  const files = getAttachmentFiles(formData);
  const attachmentError = validateAttachmentFiles(files);

  if (attachmentError) {
    redirect(`${returnTo}?message=${encodeURIComponent(attachmentError)}`);
  }

  let input;
  try {
    input = supportReplySchema.parse({
      body: formData.get("body"),
      is_internal: canManageSupport && formData.get("is_internal") === "on",
    });
  } catch (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  const isInternal = Boolean(input.is_internal && canManageSupport);
  const { data: message, error } = await supabase
    .from("support_ticket_messages")
    .insert({
      author_id: user.id,
      body: sanitizeSupportText(input.body),
      is_internal: isInternal,
      ticket_id: ticketId,
    })
    .select("id")
    .single();

  if (error || !message) {
    redirect(
      `${returnTo}?message=${encodeURIComponent(
        error?.message || "Could not add reply.",
      )}`,
    );
  }

  try {
    await uploadSupportAttachments({
      files,
      isInternal,
      messageId: message.id,
      supabase,
      ticketId,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      `${returnTo}?message=${encodeURIComponent(
        `Reply saved, but attachment upload failed: ${getActionErrorMessage(error)}`,
      )}`,
    );
  }

  await logTicketActivity(
    supabase,
    ticketId,
    user.id,
    isInternal ? "internal_note_added" : "reply_added",
  );

  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
  redirect(returnTo);
}

export async function updateSupportTicketStatusAction(
  ticketId: string,
  formData: FormData,
) {
  const returnTo = getSafeReturnTo(formData, `/support/${ticketId}`);
  const { profile, supabase, user } = await requireApprovedUser();

  if (!isSupportRole(profile.role)) {
    redirect(`${returnTo}?message=Only support staff can change ticket status.`);
  }

  const status = String(formData.get("status") || "") as SupportTicketStatus;
  if (!supportTicketStatuses.includes(status)) {
    redirect(`${returnTo}?message=Choose a valid status.`);
  }

  const ticket = await requireTicketAccess(supabase, ticketId);
  const { error } = await supabase
    .from("support_tickets")
    .update({
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", ticketId);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  await logTicketActivity(supabase, ticketId, user.id, "status_changed", {
    fromValue: ticket.status,
    toValue: status,
  });

  if (status === "resolved") {
    await logTicketActivity(supabase, ticketId, user.id, "ticket_resolved");
  }

  if (
    (ticket.status === "resolved" || ticket.status === "closed") &&
    status !== "resolved" &&
    status !== "closed"
  ) {
    await logTicketActivity(supabase, ticketId, user.id, "ticket_reopened");
  }

  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
  redirect(returnTo);
}

export async function updateSupportTicketPriorityAction(
  ticketId: string,
  formData: FormData,
) {
  const returnTo = getSafeReturnTo(formData, `/support/${ticketId}`);
  const { profile, supabase, user } = await requireApprovedUser();

  if (!isSupportRole(profile.role)) {
    redirect(`${returnTo}?message=Only support staff can change ticket priority.`);
  }

  const priority = String(formData.get("priority") || "") as SupportTicketPriority;
  if (!supportTicketPriorities.includes(priority)) {
    redirect(`${returnTo}?message=Choose a valid priority.`);
  }

  const ticket = await requireTicketAccess(supabase, ticketId);
  const { error } = await supabase
    .from("support_tickets")
    .update({ priority })
    .eq("id", ticketId);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  await logTicketActivity(supabase, ticketId, user.id, "priority_changed", {
    fromValue: ticket.priority,
    toValue: priority,
  });

  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
  redirect(returnTo);
}

export async function updateSupportTicketAssignmentAction(
  ticketId: string,
  formData: FormData,
) {
  const returnTo = getSafeReturnTo(formData, `/support/${ticketId}`);
  const { profile, supabase, user } = await requireApprovedUser();

  if (!isSupportRole(profile.role)) {
    redirect(`${returnTo}?message=Only support staff can assign tickets.`);
  }

  const assignedTo = String(formData.get("assigned_to") || "");
  const nextAssignee = assignedTo || null;
  const ticket = await requireTicketAccess(supabase, ticketId);
  const { error } = await supabase
    .from("support_tickets")
    .update({ assigned_to: nextAssignee })
    .eq("id", ticketId);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  await logTicketActivity(supabase, ticketId, user.id, "assigned_user_changed", {
    fromValue: ticket.assigned_to,
    toValue: nextAssignee,
  });

  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
  redirect(returnTo);
}
