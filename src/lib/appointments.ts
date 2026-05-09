import { z } from "zod";

import { defaultLocale, getIntlLocale, type Locale } from "@/lib/i18n";

export const appointmentTypes = [
  "viewing",
  "call",
  "follow_up",
  "photoshoot",
  "document_signing",
  "open_house",
] as const;

export const appointmentStatuses = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentType = (typeof appointmentTypes)[number];
export type AppointmentStatus = (typeof appointmentStatuses)[number];

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  viewing: "Viewing",
  call: "Call",
  follow_up: "Follow-up",
  photoshoot: "Photoshoot",
  document_signing: "Document signing",
  open_house: "Open house",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const appointmentTypeLabelsSq: Record<AppointmentType, string> = {
  viewing: "Vizitë",
  call: "Telefonatë",
  follow_up: "Ndjekje",
  photoshoot: "Fotosesion",
  document_signing: "Nënshkrim dokumentesh",
  open_house: "Ditë e hapur",
};

const appointmentStatusLabelsSq: Record<AppointmentStatus, string> = {
  scheduled: "Planifikuar",
  completed: "Përfunduar",
  cancelled: "Anuluar",
  no_show: "Nuk u paraqit",
};

export function getAppointmentTypeLabels(locale: Locale) {
  return locale === "sq" ? appointmentTypeLabelsSq : appointmentTypeLabels;
}

export function getAppointmentStatusLabels(locale: Locale) {
  return locale === "sq" ? appointmentStatusLabelsSq : appointmentStatusLabels;
}

export const appointmentSchema = z.object({
  property_id: z.string().uuid("Choose a property"),
  assigned_agent_id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Title is required"),
  appointment_type: z.enum(appointmentTypes),
  status: z.enum(appointmentStatuses),
  client_name: z.string().trim().min(2, "Client name is required"),
  client_phone: z.string().trim().optional(),
  client_email: z.string().trim().email("Use a valid email").optional().or(z.literal("")),
  starts_at: z.string().trim().min(1, "Start date and time are required"),
  duration_minutes: z.coerce.number().int().min(15).max(480),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type AppointmentFormInput = z.infer<typeof appointmentSchema>;

export type AppointmentPropertySummary = {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
};

export type AppointmentAgentSummary = {
  id: string;
  full_name: string | null;
};

export type AppointmentRecord = {
  id: string;
  property_id: string;
  assigned_agent_id: string | null;
  created_by: string;
  title: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  property?: AppointmentPropertySummary | null;
  agent?: AppointmentAgentSummary | null;
};

type RawAppointmentRecord = Omit<AppointmentRecord, "agent" | "property"> & {
  agent?: AppointmentAgentSummary | AppointmentAgentSummary[] | null;
  property?: AppointmentPropertySummary | AppointmentPropertySummary[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export function normalizeAppointments(rows: unknown) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return (rows as RawAppointmentRecord[]).map((appointment) => ({
    ...appointment,
    agent: firstRelation(appointment.agent),
    property: firstRelation(appointment.property),
  }));
}

export function formDataToAppointmentInput(formData: FormData) {
  return appointmentSchema.parse({
    property_id: formData.get("property_id"),
    assigned_agent_id: formData.get("assigned_agent_id") || "",
    title: formData.get("title"),
    appointment_type: formData.get("appointment_type"),
    status: formData.get("status") || "scheduled",
    client_name: formData.get("client_name"),
    client_phone: formData.get("client_phone") || undefined,
    client_email: formData.get("client_email") || "",
    starts_at: formData.get("starts_at"),
    duration_minutes: formData.get("duration_minutes") || "60",
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export function formatAppointmentDateTime(
  value: string,
  locale: Locale = defaultLocale,
) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAppointmentTimeRange(
  startsAt: string,
  endsAt: string,
  locale: Locale = defaultLocale,
) {
  const formatter = new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}

export function getDefaultAppointmentStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

export function getAppointmentLocation(
  appointment: Pick<AppointmentRecord, "location" | "property">,
  locale: Locale = defaultLocale,
) {
  if (appointment.location) {
    return appointment.location;
  }

  if (!appointment.property) {
    return locale === "sq" ? "Pa vendndodhje" : "No location set";
  }

  return (
    appointment.property.address ||
    [appointment.property.neighborhood, appointment.property.city].filter(Boolean).join(", ")
  );
}
