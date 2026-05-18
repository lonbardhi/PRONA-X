"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  getAgentWorkspaceErrorMessage,
  profileUpdateSchema,
  userPreferenceUpdateSchema,
  userStatusUpdateSchema,
} from "@/lib/agent-workspace";
import { requireApprovedUser } from "@/lib/supabase/server";

function getSafeReturnTo(formData: FormData) {
  const returnTo = String(formData.get("return_to") || "/profile");
  return returnTo.startsWith("/") ? returnTo : "/profile";
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Check the fields and try again.";
  }

  return getAgentWorkspaceErrorMessage(error);
}

async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  metadata: Record<string, unknown> = {},
) {
  const { supabase } = await requireApprovedUser();
  await supabase.from("activity_logs").insert({
    action,
    entity_type: entityType,
    metadata,
    user_id: userId,
  });
}

export async function updateAvailabilityStatusAction(formData: FormData) {
  const returnTo = getSafeReturnTo(formData);
  const { supabase, user } = await requireApprovedUser();

  let input;
  try {
    input = userStatusUpdateSchema.parse({
      status: formData.get("status"),
      status_message: formData.get("status_message") || undefined,
    });
  } catch (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  const { error } = await supabase.from("user_status").upsert(
    {
      status: input.status,
      status_message: input.status_message || null,
      user_id: user.id,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  await supabase.from("activity_logs").insert({
    action: "updated_availability_status",
    entity_type: "user_status",
    metadata: { status: input.status },
    user_id: user.id,
  });

  revalidatePath("/profile");
  revalidatePath("/appointments");
  revalidatePath("/messages");
  revalidatePath("/admin/users");
  redirect(returnTo);
}

export async function updateUserPreferencesAction(formData: FormData) {
  const returnTo = getSafeReturnTo(formData);
  const { supabase, user } = await requireApprovedUser();

  let input;
  try {
    input = userPreferenceUpdateSchema.parse({
      email_notifications: formData.get("email_notifications"),
      in_app_notifications: formData.get("in_app_notifications"),
      preferred_calendar_view: formData.get("preferred_calendar_view"),
      push_notifications: formData.get("push_notifications"),
      reminder_minutes_before_meeting: formData.get("reminder_minutes_before_meeting"),
      whatsapp_notifications: formData.get("whatsapp_notifications"),
    });
  } catch (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      ...input,
      user_id: user.id,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  await supabase.from("activity_logs").insert({
    action: "updated_notification_preferences",
    entity_type: "user_preferences",
    metadata: {
      preferred_calendar_view: input.preferred_calendar_view,
      reminder_minutes_before_meeting: input.reminder_minutes_before_meeting,
    },
    user_id: user.id,
  });

  revalidatePath("/profile");
  redirect(`${returnTo}?message=${encodeURIComponent("Preferences updated")}`);
}

export async function updateProfileDetailsAction(formData: FormData) {
  const returnTo = getSafeReturnTo(formData);
  const { supabase, user } = await requireApprovedUser();

  let input;
  try {
    input = profileUpdateSchema.parse({
      agency_name: formData.get("agency_name") || undefined,
      avatar_url: formData.get("avatar_url") || "",
      full_name: formData.get("full_name"),
      phone: formData.get("phone") || undefined,
    });
  } catch (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      agency_name: input.agency_name || null,
      avatar_url: input.avatar_url || null,
      full_name: input.full_name,
      phone: input.phone || null,
    })
    .eq("id", user.id);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  await logActivity(user.id, "updated_profile_details", "profile");
  revalidatePath("/profile");
  redirect(`${returnTo}?message=${encodeURIComponent("Profile updated")}`);
}

export async function markNotificationReadAction(formData: FormData) {
  const returnTo = getSafeReturnTo(formData);
  const notificationId = String(formData.get("notification_id") || "");
  const { supabase, user } = await requireApprovedUser();

  if (!notificationId) {
    redirect(returnTo);
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  revalidatePath("/profile");
  redirect(returnTo);
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const returnTo = getSafeReturnTo(formData);
  const { supabase, user } = await requireApprovedUser();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  revalidatePath("/profile");
  redirect(returnTo);
}
