"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  type AppointmentStatus,
  appointmentStatuses,
  formDataToAppointmentInput,
} from "@/lib/appointments";
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

  const { error } = await supabase.from("appointments").insert({
    property_id: input.property_id,
    assigned_agent_id: input.assigned_agent_id || user.id,
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
  });

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/appointments");
  revalidatePath("/properties");
  redirect("/appointments?message=Appointment%20scheduled");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") || "");
  const status = String(formData.get("status") || "");
  const returnTo = getSafeReturnTo(formData);
  const { supabase } = await requireUser();

  if (!appointmentId || !appointmentStatuses.includes(status as AppointmentStatus)) {
    redirect(`${returnTo}?message=${encodeURIComponent("Choose a valid appointment status.")}`);
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/appointments");
  revalidatePath("/properties");
  redirect(returnTo);
}
