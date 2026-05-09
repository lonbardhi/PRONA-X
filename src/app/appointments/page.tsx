import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Plus,
} from "lucide-react";

import { createAppointmentAction } from "@/app/appointments/actions";
import { AppointmentAgenda } from "@/components/AppointmentAgenda";
import { AppointmentForm, type AppointmentAgentOption } from "@/components/AppointmentForm";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import {
  formatAppointmentTimeRange,
  getAppointmentTypeLabels,
  normalizeAppointments,
  type AppointmentPropertySummary,
  type AppointmentRecord,
} from "@/lib/appointments";
import { hasSupabaseEnv } from "@/lib/env";
import { getIntlLocale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { requireOperatorUser } from "@/lib/supabase/server";

type AppointmentsPageProps = {
  searchParams: Promise<{
    message?: string;
    property_id?: string;
  }>;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string;
};

const appointmentSelect = `
  id,
  property_id,
  assigned_agent_id,
  created_by,
  title,
  appointment_type,
  status,
  client_name,
  client_phone,
  client_email,
  starts_at,
  ends_at,
  location,
  notes,
  created_at,
  property:properties(id,title,city,neighborhood,address),
  agent:profiles!appointments_assigned_agent_id_fkey(id,full_name)
`;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getCalendarDays() {
  const today = startOfToday();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDayLabel(date: Date, locale: "sq" | "en") {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(date);
}

function sortAppointments(appointments: AppointmentRecord[]) {
  return [...appointments].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

function getSetupMessage(errorMessage?: string) {
  if (!errorMessage) {
    return null;
  }

  if (
    errorMessage.includes("appointments") ||
    errorMessage.includes("appointment_type") ||
    errorMessage.includes("Could not find")
  ) {
    return "Run supabase/migrations/0003_appointments.sql in Supabase SQL Editor to enable calendar appointments.";
  }

  return errorMessage;
}

function getAgentOptions(profiles: ProfileRow[], currentUserId: string, email?: string | null) {
  const seen = new Set<string>();
  const options: AppointmentAgentOption[] = [];

  for (const profile of profiles) {
    if (seen.has(profile.id)) {
      continue;
    }

    seen.add(profile.id);
    options.push({
      id: profile.id,
      label: profile.full_name || `${profile.role} ${profile.id.slice(0, 8)}`,
    });
  }

  if (!seen.has(currentUserId)) {
    options.unshift({
      id: currentUserId,
      label: email || "Current user",
    });
  }

  return options;
}

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireOperatorUser();
  const appointmentTypeLabels = getAppointmentTypeLabels(locale);

  const [propertyResult, profileResult, appointmentResult] = await Promise.all([
    supabase
      .from("properties")
      .select("id,title,city,neighborhood,address")
      .order("title", { ascending: true }),
    supabase
      .from("profiles")
      .select("id,full_name,role")
      .order("full_name", { ascending: true }),
    supabase
      .from("appointments")
      .select(appointmentSelect)
      .order("starts_at", { ascending: true }),
  ]);

  const properties = (propertyResult.data || []) as AppointmentPropertySummary[];
  const profiles = (profileResult.data || []) as ProfileRow[];
  const appointments = sortAppointments(normalizeAppointments(appointmentResult.data));
  const setupMessage = getSetupMessage(appointmentResult.error?.message);
  const now = new Date();
  const upcoming = appointments.filter(
    (appointment) =>
      appointment.status === "scheduled" && new Date(appointment.starts_at) >= now,
  );
  const today = appointments.filter((appointment) =>
    sameDay(new Date(appointment.starts_at), now),
  );
  const completed = appointments.filter(
    (appointment) => appointment.status === "completed",
  );
  const agents = getAgentOptions(profiles, user.id, user.email);
  const days = getCalendarDays();

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                <CalendarDays className="h-3.5 w-3.5" />
                {locale === "sq" ? "Kalendari / takimet" : "Calendar / appointments"}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {locale === "sq" ? "Agjenda e agjentëve" : "Agent schedule"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {locale === "sq"
                  ? "Planifiko vizita, telefonata, ndjekje, fotosesione, nënshkrime dokumentesh dhe open house rreth portofolit të pronave."
                  : "Plan viewings, calls, follow-ups, media shoots, document signings, and open houses around the property portfolio."}
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Të ardhshme" : "Upcoming"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {upcoming.length}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Sot" : "Today"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {today.length}
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Përfunduar" : "Completed"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {completed.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {setupMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {setupMessage}
          </div>
        ) : null}

        {propertyResult.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {propertyResult.error.message}
          </div>
        ) : null}

        {setupMessage ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Database className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">
              {locale === "sq"
                ? "Aktivizo tabelën e takimeve në databazë"
                : "Enable the appointments database table"}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {locale === "sq"
                ? "Ndërfaqja e kalendarit është gati, por Supabase ka ende nevojë për migrimin e takimeve. Hape SQL Editor dhe ekzekuto migrimin një herë."
                : "The calendar UI is ready, but Supabase still needs the appointments migration. Open Supabase SQL Editor and run it once."}
            </p>
          </section>
        ) : (
          <>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
              <section className="grid min-w-0 content-start gap-5">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="mb-3 grid gap-3 sm:mb-4 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">
                        {locale === "sq" ? "Kalendari 7-ditor" : "7-day calendar"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {locale === "sq"
                          ? "Blloqet e takimeve të planifikuara sipas datës së fillimit."
                          : "Scheduled appointment blocks by start date."}
                      </p>
                    </div>
                    <Link
                      className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:h-10 sm:px-4"
                      href="#new-appointment"
                      prefetch={false}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sm:hidden">
                        {locale === "sq" ? "I ri" : "New"}
                      </span>
                      <span className="hidden sm:inline">
                        {locale === "sq" ? "Takim i ri" : "New appointment"}
                      </span>
                    </Link>
                  </div>

                  <div className="-mx-1 grid snap-x auto-cols-[8.25rem] grid-flow-col gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:auto-cols-[9.5rem] lg:mx-0 lg:grid-flow-row lg:grid-cols-7 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                    {days.map((day) => {
                      const dayAppointments = appointments.filter((appointment) =>
                        sameDay(new Date(appointment.starts_at), day),
                      );

                      return (
                        <div
                          className="min-h-28 snap-start rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 lg:min-h-36"
                          key={day.toISOString()}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {formatDayLabel(day, locale)}
                          </p>
                          <div className="mt-3 grid gap-2">
                            {dayAppointments.length === 0 ? (
                              <p className="text-xs text-slate-400">
                                {locale === "sq" ? "Pa rezervime" : "No bookings"}
                              </p>
                            ) : null}
                            {dayAppointments.map((appointment) => (
                              <div
                                className="rounded-lg bg-white p-2 text-xs shadow-sm"
                                key={appointment.id}
                              >
                                <p className="font-semibold text-slate-950">
                                  {formatAppointmentTimeRange(
                                    appointment.starts_at,
                                    appointment.ends_at,
                                    locale,
                                  )}
                                </p>
                                <p className="mt-1 line-clamp-2 text-slate-600">
                                  {appointment.title}
                                </p>
                                <p className="mt-1 text-emerald-700">
                                  {appointmentTypeLabels[appointment.appointment_type]}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <section className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-emerald-700" />
                    <h2 className="text-lg font-semibold text-slate-950">
                      {locale === "sq" ? "Takimet e ardhshme" : "Upcoming appointments"}
                    </h2>
                  </div>
                  <AppointmentAgenda
                    appointments={upcoming}
                    density="compact"
                    emptyLabel={
                      locale === "sq"
                        ? "Ende nuk ka takime të ardhshme."
                        : "No upcoming appointments yet."
                    }
                    layout="grid"
                    locale={locale}
                    returnTo="/appointments"
                  />
                </section>
              </section>

              <aside
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24"
                id="new-appointment"
              >
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-emerald-700" />
                    <h2 className="text-lg font-semibold text-slate-950">
                      {locale === "sq" ? "Krijo takim" : "Create appointment"}
                    </h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {locale === "sq"
                      ? "Lidh çdo vizitë, telefonatë, ndjekje, fotosesion, nënshkrim dhe open house me pronën dhe agjentin përgjegjës."
                      : "Attach every viewing, call, follow-up, shoot, signing, and open house to a property and responsible agent."}
                  </p>
                </div>

                {properties.length > 0 ? (
                  <AppointmentForm
                    action={createAppointmentAction}
                    agents={agents}
                    defaultPropertyId={params.property_id || ""}
                    locale={locale}
                    properties={properties}
                    returnTo="/appointments"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    {locale === "sq"
                      ? "Shto një pronë para se të planifikosh takime."
                      : "Add a property before scheduling appointments."}
                  </div>
                )}
              </aside>
            </div>

            {appointments.length > 0 ? (
              <section className="grid gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-700" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    {locale === "sq" ? "Historia e të gjitha takimeve" : "All appointment history"}
                  </h2>
                </div>
                <AppointmentAgenda
                  appointments={appointments}
                  density="compact"
                  emptyLabel={
                    locale === "sq"
                      ? "Ende nuk ka histori takimesh."
                      : "No appointment history yet."
                  }
                  layout="grid"
                  locale={locale}
                  returnTo="/appointments"
                />
              </section>
            ) : null}
          </>
        )}
      </section>
    </DashboardShell>
  );
}
