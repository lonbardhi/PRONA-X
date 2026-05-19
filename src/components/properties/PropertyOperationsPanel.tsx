import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ImageUp,
  MapPin,
  Plus,
  Target,
} from "lucide-react";

import type { PropertyMapPoint } from "@/lib/maps/types";
import {
  formatStatusLabel,
  type PropertyModule,
  type PropertyRecord,
} from "@/lib/properties";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PropertyOperationsPanelProps = {
  canManage: boolean;
  locale: Locale;
  mapPoints: PropertyMapPoint[];
  module: PropertyModule;
  properties: PropertyRecord[];
};

const attentionStatuses = new Set([
  "draft",
  "documents_pending",
  "feasibility_review",
  "landowner_contacted",
  "contract_drafting",
  "contract_expiring",
  "reserved",
  "negotiation",
  "viewing",
]);

function getPercent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getModuleCopy(module: PropertyModule, locale: Locale) {
  const isSq = locale === "sq";
  const isRental = module === "rentals";

  return {
    addLabel: isRental
      ? isSq
        ? "Shto qira"
        : "Add rental"
      : isSq
        ? "Shto shitje"
        : "Add sale",
    subtitle: isRental
      ? isSq
        ? "Sinjale te shpejta per qirate qe duhet te levizin para kontaktit me klientet."
        : "Fast signals for rentals that should move before client contact."
      : isSq
        ? "Sinjale te shpejta per shitjet qe duhet te jene gati per harte, media dhe negociim."
        : "Fast signals for sales that should be ready for map, media, and negotiation.",
    title: isSq ? "Kontrolli i inventarit" : "Inventory control",
  };
}

export function PropertyOperationsPanel({
  canManage,
  locale,
  mapPoints,
  module,
  properties,
}: PropertyOperationsPanelProps) {
  const mappedIds = new Set(mapPoints.map((point) => point.id));
  const total = properties.length;
  const mappedCount = properties.filter((property) => mappedIds.has(property.id)).length;
  const missingMapCount = Math.max(0, total - mappedCount);
  const missingMediaCount = properties.filter(
    (property) => (property.property_media?.length || 0) === 0,
  ).length;
  const attentionItems = properties.filter((property) => attentionStatuses.has(property.status));
  const upcomingMeetings = properties.reduce(
    (count, property) =>
      count +
      (property.appointments || []).filter(
        (appointment) =>
          appointment.status === "scheduled" &&
          new Date(appointment.starts_at).getTime() >= Date.now(),
      ).length,
    0,
  );
  const topAttentionStatus = attentionItems[0]?.status;
  const copy = getModuleCopy(module, locale);
  const isSq = locale === "sq";

  const metrics = [
    {
      body: isSq ? "prona gati per harte" : "properties ready for map",
      icon: MapPin,
      label: isSq ? "Mbulim harte" : "Map coverage",
      tone: missingMapCount > 0 ? "warning" : "good",
      value: `${getPercent(mappedCount, total)}%`,
    },
    {
      body:
        missingMediaCount > 0
          ? isSq
            ? "listime duan foto/media"
            : "listings need photo/media"
          : isSq
            ? "media ne rregull"
            : "media looks clean",
      icon: ImageUp,
      label: "Media",
      tone: missingMediaCount > 0 ? "warning" : "good",
      value: missingMediaCount,
    },
    {
      body: topAttentionStatus
        ? `status: ${formatStatusLabel(topAttentionStatus, locale)}`
        : isSq
          ? "asnje sinjal kritik"
          : "no critical signal",
      icon: ClipboardList,
      label: isSq ? "Per levizje" : "Needs movement",
      tone: attentionItems.length > 0 ? "neutral" : "good",
      value: attentionItems.length,
    },
    {
      body:
        upcomingMeetings > 0
          ? isSq
            ? "takime te lidhura"
            : "linked meetings"
          : isSq
            ? "pa takime aktive"
            : "no active meetings",
      icon: CalendarClock,
      label: isSq ? "Terreni" : "Field work",
      tone: upcomingMeetings > 0 ? "neutral" : "muted",
      value: upcomingMeetings,
    },
  ] as const;

  const nextAction =
    missingMapCount > 0
      ? {
          icon: MapPin,
          text: isSq
            ? `${missingMapCount} prona nuk shfaqen ne harte. Shto koordinata qe ekipi t'i gjeje shpejt.`
            : `${missingMapCount} properties are not on the map. Add coordinates so the team can find them quickly.`,
        }
      : missingMediaCount > 0
        ? {
            icon: ImageUp,
            text: isSq
              ? `${missingMediaCount} listime kane nevoje per media para publikimit te plote.`
              : `${missingMediaCount} listings need media before full publishing.`,
          }
        : attentionItems.length > 0
          ? {
              icon: Target,
              text: isSq
                ? `${attentionItems.length} listime kane status qe kerkon ndjekje operative.`
                : `${attentionItems.length} listings have statuses that need operational follow-up.`,
            }
          : {
              icon: CheckCircle2,
              text: isSq
                ? "Inventari i filtruar eshte i paster per harte, media dhe ndjekje."
                : "The filtered inventory is clean for map, media, and follow-up.",
            };
  const NextActionIcon = nextAction.icon;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Target className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">{copy.title}</h2>
              <p className="text-sm leading-5 text-slate-500">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {canManage ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              href="/appointments"
              prefetch={false}
            >
              <CalendarClock className="h-4 w-4" />
              {isSq ? "Takimet" : "Meetings"}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              href="#add-property"
            >
              <Plus className="h-4 w-4" />
              {copy.addLabel}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              className={cn(
                "rounded-lg border p-3",
                metric.tone === "good"
                  ? "border-emerald-100 bg-emerald-50/70"
                  : metric.tone === "warning"
                    ? "border-amber-100 bg-amber-50/70"
                    : metric.tone === "muted"
                      ? "border-slate-100 bg-slate-50"
                      : "border-blue-100 bg-blue-50/60",
              )}
              key={metric.label}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-slate-700">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{metric.body}</p>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-3 flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
          missingMapCount > 0 || missingMediaCount > 0
            ? "border-amber-100 bg-amber-50 text-amber-950"
            : "border-emerald-100 bg-emerald-50 text-emerald-950",
        )}
      >
        <div className="flex min-w-0 gap-2">
          {missingMapCount > 0 || missingMediaCount > 0 ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <NextActionIcon className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="min-w-0 leading-5">{nextAction.text}</p>
        </div>
        {canManage ? (
          <Link
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            href="#add-property"
          >
            {isSq ? "Hap formularin" : "Open form"}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
