"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Phone, MapPin } from "lucide-react";

import { updateAppointmentStatusAction } from "@/app/appointments/actions";
import {
  getAppointmentWorkflowBadge,
  getAppointmentWorkflowType,
} from "@/lib/appointments";
import {
  formatWorkspaceTime,
  type TodayAgendaItem,
  type UserProfile,
} from "@/lib/agent-workspace";
import type { Locale } from "@/lib/i18n";

type TodayAgendaPreviewProps = {
  agenda: TodayAgendaItem[];
  locale: Locale;
  profile: UserProfile;
  returnTo: string;
};

function canManageAppointments(role: string) {
  return ["admin", "manager", "agent"].includes(role);
}

function getWorkflowTone(item: TodayAgendaItem) {
  return getAppointmentWorkflowType(item.property) === "rentals"
    ? "bg-sky-50 text-sky-700"
    : "bg-emerald-50 text-emerald-700";
}

export function TodayAgendaPreview({
  agenda,
  locale,
  profile,
  returnTo,
}: TodayAgendaPreviewProps) {
  const canManage = canManageAppointments(String(profile.role));

  if (agenda.length === 0) {
    return (
      <div className="crm-empty-state p-4 text-sm text-slate-500">
        {locale === "sq"
          ? "Nuk ka takime te tjera sot."
          : "No more meetings scheduled for today."}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {agenda.map((item) => (
        <article
          className="crm-card-interactive p-3"
          key={item.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700">
                {formatWorkspaceTime(item.starts_at, locale)} -{" "}
                {formatWorkspaceTime(item.ends_at, locale)}
              </p>
              <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-950">
                {item.title}
              </h4>
              <p className="mt-1 text-xs text-slate-500">{item.client_name}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-600">
              {item.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="mt-3 grid gap-1 text-xs text-slate-500">
            {item.property ? (
              <Link
                className="inline-flex min-w-0 items-center gap-1.5 font-medium text-slate-700 hover:text-emerald-700"
                href={`/properties/${item.property.id}`}
                prefetch={false}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.property.title}</span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getWorkflowTone(item)}`}
                >
                  {getAppointmentWorkflowBadge(item.property, locale)}
                </span>
              </Link>
            ) : null}
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {item.location ||
                  item.property?.address ||
                  [item.property?.neighborhood, item.property?.city]
                    .filter(Boolean)
                    .join(", ") ||
                  (locale === "sq" ? "Pa vendndodhje" : "No location")}
              </span>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="crm-button crm-button-secondary h-8 min-h-8 px-3 text-xs"
              href="/appointments"
              prefetch={false}
            >
              {locale === "sq" ? "Hap" : "Open"}
            </Link>
            {item.client_phone ? (
              <a
                className="crm-button crm-button-secondary h-8 min-h-8 border-emerald-200 px-3 text-xs text-emerald-700"
                href={`tel:${item.client_phone}`}
              >
                <Phone className="h-3.5 w-3.5" />
                {locale === "sq" ? "Telefono" : "Call"}
              </a>
            ) : null}
            {canManage && item.status === "scheduled" ? (
              <form action={updateAppointmentStatusAction}>
                <input name="appointment_id" type="hidden" value={item.id} />
                <input name="status" type="hidden" value="completed" />
                <input name="return_to" type="hidden" value={returnTo} />
                <button className="crm-button crm-button-secondary h-8 min-h-8 border-blue-200 px-3 text-xs text-blue-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {locale === "sq" ? "Perfundo" : "Complete"}
                </button>
              </form>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
