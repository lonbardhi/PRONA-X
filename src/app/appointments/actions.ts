"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  type AppointmentStatus,
  appointmentStatuses,
  formDataToAppointmentInput,
} from "@/lib/appointments";
import {
  createNotificationForUsers,
  getNotificationWorkspaceId,
} from "@/lib/notifications/service";
import { requireOperatorUser } from "@/lib/supabase/server";

async function requireUser() {
  const { supabase, user } = await requireOperatorUser();

  return { supabase, user };
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Check the appointment fields.";
  }

  return error instanceof Error ? error.message : "Appointment action failed.";
}

function getSafeReturnTo(formData: FormData) {
  const returnTo = String(formData.get("return_to") || "/appointments");

  return returnTo.startsWith("/") ? returnTo : "/appointments";
}

export async function createAppointmentAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const returnTo = getSafeReturnTo(formData);

  let input;
  try {
    input = formDataToAppointmentInput(formData);
  } catch (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  const startsAt = new Date(input.starts_at);
  const endsAt = new Date(startsAt.getTime() + input.duration_minutes * 60_000);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    redirect(`${returnTo}?message=${encodeURIComponent("Choose a valid date and time.")}`);
  }

  const assignedAgentId = input.assigned_agent_id || user.id;
  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      property_id: input.property_id,
      assigned_agent_id: assignedAgentId,
      created_by: user.id,
      title: input.title,
      appointment_type: input.appointment_type,
      status: input.status,
      client_name: input.client_name,
      client_phone: input.client_phone || null,
      client_email: input.client_email || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location: input.location || null,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  if (appointment && assignedAgentId !== user.id) {
    await createNotificationForUsers({
      actionUrl: "/appointments",
      actorUserId: user.id,
      body: `${input.client_name} - ${startsAt.toLocaleString("sq-AL", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Tirane",
      })}`,
      entityId: appointment.id,
      entityType: "appointment",
      idempotencyKey: `appointment-created:${appointment.id}`,
      priority: "normal",
      recipientUserIds: [assignedAgentId],
      supabase,
      title: `Takim i ri: ${input.title}`,
      type: "visit_scheduled",
      workspaceId: getNotificationWorkspaceId(),
    });
  }

  revalidatePath("/appointments");
  revalidatePath("/properties");
  redirect("/appointments?message=Appointment%20scheduled");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") || "");
  const status = String(formData.get("status") || "");
  const returnTo = getSafeReturnTo(formData);
  const { supabase, user } = await requireUser();

  if (!appointmentId || !appointmentStatuses.includes(status as AppointmentStatus)) {
    redirect(`${returnTo}?message=${encodeURIComponent("Choose a valid appointment status.")}`);
  }

  const { data: currentAppointment } = await supabase
    .from("appointments")
    .select("id,title,assigned_agent_id,created_by,status,starts_at,client_name")
    .eq("id", appointmentId)
    .maybeSingle();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  if (currentAppointment && currentAppointment.status !== status) {
    const recipients = Array.from(
      new Set(
        [currentAppointment.assigned_agent_id, currentAppointment.created_by]
          .filter((id): id is string => Boolean(id))
          .filter((id) => id !== user.id),
      ),
    );
    const notificationType =
      status === "cancelled"
        ? "visit_cancelled"
        : status === "no_show"
        ? "visit_overdue"
        : null;

    if (notificationType && recipients.length > 0) {
      await createNotificationForUsers({
        actionUrl: "/appointments",
        actorUserId: user.id,
        body: `${currentAppointment.client_name || "Klient"} - ${new Date(
          currentAppointment.starts_at,
        ).toLocaleString("sq-AL", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Europe/Tirane",
        })}`,
        entityId: currentAppointment.id,
        entityType: "appointment",
        idempotencyKey: `appointment-status:${appointmentId}:${status}`,
        priority: status === "cancelled" ? "high" : "urgent",
        recipientUserIds: recipients,
        supabase,
        title:
          status === "cancelled"
            ? `Takimi u anulua: ${currentAppointment.title}`
            : `Takimi kerkon vemendje: ${currentAppointment.title}`,
        type: notificationType,
        workspaceId: getNotificationWorkspaceId(),
      });
    }
  }

  revalidatePath("/appointments");
  revalidatePath("/properties");
  redirect(returnTo);
}
