"use client";

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";

import { updateAppointmentStatusAction } from "@/app/appointments/actions";
import { createEntityConversationAction } from "@/app/messages/actions";
import {
  appointmentStatuses,
  formatAppointmentDateTime,
  formatAppointmentTimeRange,
  getAppointmentStatusLabels,
  getAppointmentLocation,
  getAppointmentTypeLabels,
  type AppointmentRecord,
} from "@/lib/appointments";
import { defaultLocale, type Locale } from "@/lib/i18n";

type AppointmentAgendaProps = {
  appointments: AppointmentRecord[];
  density?: "comfortable" | "compact";
  emptyLabel?: string;
  layout?: "grid" | "stack";
  locale?: Locale;
  returnTo?: string;
  showProperty?: boolean;
};

const statusTone: Record<AppointmentRecord["status"], string> = {
  scheduled: "bg-emerald-50 text-emerald-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-rose-50 text-rose-700",
  no_show: "bg-amber-50 text-amber-700",
};

function AppointmentStatusSelect({
  appointment,
  compact = false,
  locale,
  returnTo,
}: {
  appointment: AppointmentRecord;
  compact?: boolean;
  locale: Locale;
  returnTo: string;
}) {
  const statusLabels = getAppointmentStatusLabels(locale);

  return (
    <form action={updateAppointmentStatusAction} className="shrink-0">
      <input name="appointment_id" type="hidden" value={appointment.id} />
      <input name="return_to" type="hidden" value={returnTo} />
      <label className="sr-only" htmlFor={`status-${appointment.id}`}>
        {locale === "sq" ? "Statusi i takimit" : "Appointment status"}
      </label>
      <select
        className={`rounded-lg border border-slate-200 bg-white font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
          compact ? "h-8 max-w-32 px-2 text-xs" : "h-10 px-3 text-sm"
        }`}
        defaultValue={appointment.status}
        id={`status-${appointment.id}`}
        name="status"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {appointmentStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
    </form>
  );
}

function MeetingDiscussionButton({
  appointment,
  compact = false,
  locale,
}: {
  appointment: AppointmentRecord;
  compact?: boolean;
  locale: Locale;
}) {
  return (
    <form action={createEntityConversationAction} className="shrink-0">
      <input name="conversation_type" type="hidden" value="meeting_thread" />
      <input name="entity_id" type="hidden" value={appointment.id} />
      <input name="entity_type" type="hidden" value="meeting" />
      <input name="return_to" type="hidden" value="/messages" />
      <input name="title" type="hidden" value={appointment.title} />
      <button
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 ${
          compact ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm"
        }`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {locale === "sq" ? "Diskuto" : "Discuss"}
      </button>
    </form>
  );
}

export function AppointmentAgenda({
  appointments,
  density = "comfortable",
  emptyLabel = "No appointments scheduled.",
  layout = "stack",
  locale = defaultLocale,
  returnTo = "/appointments",
  showProperty = true,
}: AppointmentAgendaProps) {
  const isCompact = density === "compact";
  const statusLabels = getAppointmentStatusLabels(locale);
  const typeLabels = getAppointmentTypeLabels(locale);

  if (appointments.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-300 bg-white text-center ${
          isCompact ? "p-4" : "p-6"
        }`}
      >
        <CalendarClock
          className={`mx-auto text-slate-300 ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}
        />
        <p
          className={`font-semibold text-slate-950 ${
            isCompact ? "mt-2 text-xs" : "mt-3 text-sm"
          }`}
        >
          {emptyLabel}
        </p>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div
        className={`grid gap-3 ${
          layout === "grid" ? "md:grid-cols-2 2xl:grid-cols-3" : ""
        }`}
      >
        {appointments.map((appointment) => (
          <article
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            key={appointment.id}
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {typeLabels[appointment.appointment_type]}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <MeetingDiscussionButton appointment={appointment} compact locale={locale} />
                <AppointmentStatusSelect
                  appointment={appointment}
                  compact
                  locale={locale}
                  returnTo={returnTo}
                />
              </div>
            </div>

            <h3 className="mt-3 line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-950">
              {appointment.title}
            </h3>
            <p className="mt-2 text-xs font-medium text-slate-700">
              {formatAppointmentDateTime(appointment.starts_at, locale)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatAppointmentTimeRange(
                appointment.starts_at,
                appointment.ends_at,
                locale,
              )}
            </p>

            <div className="mt-3 grid gap-1.5 text-xs text-slate-600">
              {showProperty && appointment.property ? (
                <div className="flex min-w-0 items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <span className="line-clamp-1 min-w-0 font-medium text-slate-800">
                    {appointment.property.title}
                  </span>
                </div>
              ) : null}
              <div className="flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="line-clamp-1 min-w-0">
                  {getAppointmentLocation(appointment, locale)}
                </span>
              </div>
              <div className="flex min-w-0 items-start gap-1.5">
                <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="line-clamp-1 min-w-0">{appointment.client_name}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {appointments.map((appointment) => (
        <article
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          key={appointment.id}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <Clock3 className="h-3.5 w-3.5" />
                  {typeLabels[appointment.appointment_type]}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[appointment.status]}`}
                >
                  {statusLabels[appointment.status]}
                </span>
              </div>
              <h3 className="mt-3 break-words text-base font-semibold text-slate-950">
                {appointment.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatAppointmentDateTime(appointment.starts_at, locale)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatAppointmentTimeRange(
                  appointment.starts_at,
                  appointment.ends_at,
                  locale,
                )}
              </p>
            </div>

            <AppointmentStatusSelect
              appointment={appointment}
              locale={locale}
              returnTo={returnTo}
            />
            <MeetingDiscussionButton appointment={appointment} locale={locale} />
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            {showProperty && appointment.property ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <span className="break-words font-medium text-slate-800">
                  {appointment.property.title}
                </span>
              </div>
            ) : null}
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="break-words">
                {getAppointmentLocation(appointment, locale)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="break-words">
                {appointment.client_name}
                {appointment.agent?.full_name
                  ? ` / ${locale === "sq" ? "Agjent" : "Agent"}: ${appointment.agent.full_name}`
                  : ""}
              </span>
            </div>
            {appointment.client_phone ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{appointment.client_phone}</span>
              </div>
            ) : null}
            {appointment.client_email ? (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="break-words">{appointment.client_email}</span>
              </div>
            ) : null}
          </div>

          {appointment.notes ? (
            <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              {appointment.notes}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
