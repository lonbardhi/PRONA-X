"use client";

import Link from "next/link";
import { CalendarPlus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import {
  formatAppointmentTimeRange,
  type AppointmentRecord,
  type AppointmentType,
} from "@/lib/appointments";
import type { Locale } from "@/lib/i18n";

export type AppointmentCalendarDay = {
  date: string;
  isToday: boolean;
  label: string;
};

type AppointmentCalendarStripProps = {
  appointmentTypeLabels: Record<AppointmentType, string>;
  appointments: AppointmentRecord[];
  days: AppointmentCalendarDay[];
  locale: Locale;
  selectedDate: string;
};

function toLocalDateValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCountLabel(count: number, locale: Locale) {
  if (locale === "sq") {
    return count === 1 ? "1 takim" : `${count} takime`;
  }

  return count === 1 ? "1 appointment" : `${count} appointments`;
}

export function AppointmentCalendarStrip({
  appointmentTypeLabels,
  appointments,
  days,
  locale,
  selectedDate,
}: AppointmentCalendarStripProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<HTMLAnchorElement | null>(null);
  const copy =
    locale === "sq"
      ? {
          add: "Planifiko",
          noBookings: "Pa rezervime",
          selected: "Dita e zgjedhur",
          selectedHelp:
            "Prek nje dite dhe formulari i takimit do te pergatitet per ate date.",
          swipe: "Rreshqit majtas ose djathtas per te pare ditet.",
          today: "Sot",
        }
      : {
          add: "Schedule",
          noBookings: "No bookings",
          selected: "Selected day",
          selectedHelp:
            "Tap a day and the appointment form will be prepared for that date.",
          swipe: "Swipe left or right to browse days.",
          today: "Today",
        };

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, AppointmentRecord[]>();

    for (const appointment of appointments) {
      const dateValue = toLocalDateValue(appointment.starts_at);
      const items = grouped.get(dateValue) || [];
      items.push(appointment);
      grouped.set(dateValue, items);
    }

    return grouped;
  }, [appointments]);

  const selectedDay = days.find((day) => day.date === selectedDate) || days[0];
  const selectedAppointments = appointmentsByDate.get(selectedDay?.date || "") || [];

  useEffect(() => {
    const scroller = scrollerRef.current;
    const selected = selectedRef.current;

    if (!scroller || !selected) {
      return;
    }

    const nextScrollLeft =
      selected.offsetLeft - scroller.clientWidth / 2 + selected.clientWidth / 2;

    scroller.scrollTo({
      behavior: "smooth",
      left: Math.max(0, nextScrollLeft),
    });
  }, [selectedDate]);

  return (
    <div className="grid min-w-0 gap-3 overflow-hidden">
      <p className="text-xs font-medium text-slate-500 lg:hidden">{copy.swipe}</p>

      <div className="relative min-w-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent lg:hidden" />
        <div
          className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 pr-8 [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x lg:grid lg:grid-cols-7 lg:overflow-visible lg:pr-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {days.map((day) => {
            const dayAppointments = appointmentsByDate.get(day.date) || [];
            const isSelected = day.date === selectedDate;

            return (
              <Link
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${copy.add}: ${day.label}`}
                className={`crm-card-interactive flex min-h-44 w-[min(18rem,calc(100vw-5rem))] min-w-[min(18rem,calc(100vw-5rem))] snap-start flex-col p-3 text-left lg:min-h-40 lg:w-auto lg:min-w-0 ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50 shadow-sm"
                    : "bg-slate-50"
                }`}
                href={`/appointments?date=${day.date}#new-appointment`}
                key={day.date}
                prefetch={false}
                ref={isSelected ? selectedRef : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {day.label}
                    </p>
                    {day.isToday ? (
                      <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                        {copy.today}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-emerald-200 bg-white text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-slate-400">{copy.noBookings}</p>
                  ) : null}
                  {dayAppointments.slice(0, 2).map((appointment) => (
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
                  {dayAppointments.length > 2 ? (
                    <p className="rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-slate-500">
                      +{dayAppointments.length - 2}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs font-semibold text-slate-500">
                  <span>{getCountLabel(dayAppointments.length, locale)}</span>
                  <span className="text-emerald-700">{copy.add}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <div className="crm-card flex min-w-0 flex-col gap-3 overflow-hidden border-emerald-100 bg-emerald-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {copy.selected}
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {selectedDay.label} · {getCountLabel(selectedAppointments.length, locale)}
            </p>
            <p className="mt-1 text-xs text-slate-600">{copy.selectedHelp}</p>
          </div>
          <Link
            className="crm-button crm-button-success w-full sm:w-auto"
            href={`/appointments?date=${selectedDay.date}#new-appointment`}
            prefetch={false}
          >
            <CalendarPlus className="h-4 w-4" />
            {copy.add}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
