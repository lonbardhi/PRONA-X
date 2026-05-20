"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Signal,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { LeadActivityLogger } from "@/components/ai/LeadActivityLogger";
import { Button } from "@/components/ui/button";
import {
  fetchFollowUpInsight,
  fetchLeadActivityEvents,
} from "@/lib/ai-followup/client";
import { getIntlLocale, type Locale } from "@/lib/i18n";
import type {
  FollowUpInsight,
  FollowUpUrgencyLevel,
  LeadActivityEvent,
  LeadActivityEventType,
} from "@/modules/ai-followup/followup.types";

type LeadFollowUpAssistantProps = {
  leadId: string;
  locale: Locale;
};

const eventLabels: Record<LeadActivityEventType, { en: string; sq: string }> = {
  appointment_booked: { en: "Appointment booked", sq: "Takim i rezervuar" },
  document_sent: { en: "Document sent", sq: "Dokument i dërguar" },
  email_clicked: { en: "Email clicked", sq: "Klikoi email-in" },
  email_opened: { en: "Email opened", sq: "Hapi email-in" },
  email_replied: { en: "Email replied", sq: "U përgjigj me email" },
  followup_completed: { en: "Follow-up completed", sq: "Ndjekje e përfunduar" },
  manual_note_added: { en: "Manual note added", sq: "Shënim manual" },
  no_response: { en: "No response", sq: "Pa përgjigje" },
  phone_call_answered: { en: "Phone call answered", sq: "Telefonatë e përgjigjur" },
  phone_call_missed: { en: "Phone call missed", sq: "Telefonatë e humbur" },
  property_saved: { en: "Property saved", sq: "Pronë e ruajtur" },
  property_viewed: { en: "Property viewed", sq: "Pronë e parë" },
  viewing_requested: { en: "Viewing requested", sq: "Kërkoi vizitë" },
  whatsapp_message_sent: { en: "WhatsApp sent", sq: "WhatsApp i dërguar" },
  whatsapp_reply_received: { en: "WhatsApp reply", sq: "Përgjigje WhatsApp" },
};

function getUrgencyClass(urgency: FollowUpUrgencyLevel) {
  if (urgency === "High") return "border-rose-200 bg-rose-50 text-rose-700";
  if (urgency === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatDate(value: string | undefined, locale: Locale) {
  if (!value) return locale === "sq" ? "Ende pa aktivitet" : "No activity yet";

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          {icon}
        </span>
      </div>
      <p className="mt-3 break-words text-3xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
    </div>
  );
}

function LoadingState({ locale }: { locale: Locale }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
            PRONA X AI
          </p>
          <h2 className="text-xl font-semibold text-slate-950">
            {locale === "sq"
              ? "Po analizon sjelljen e lead-it..."
              : "Analyzing lead behaviour..."}
          </h2>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" key={item} />
        ))}
      </div>
    </section>
  );
}

export function LeadFollowUpAssistant({ leadId, locale }: LeadFollowUpAssistantProps) {
  const [events, setEvents] = useState<LeadActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<FollowUpInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInsight = useCallback(
    async ({ showRefreshing = false }: { showRefreshing?: boolean } = {}) => {
      setError(null);
      if (showRefreshing) setIsRefreshing(true);

      try {
        const [nextInsight, nextEvents] = await Promise.all([
          fetchFollowUpInsight(leadId),
          fetchLeadActivityEvents(leadId, 5),
        ]);
        setInsight(nextInsight);
        setEvents(nextEvents);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : locale === "sq"
              ? "Nuk u ngarkua analiza e ndjekjes."
              : "Could not load follow-up insight.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [leadId, locale],
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialInsight() {
      try {
        const [nextInsight, nextEvents] = await Promise.all([
          fetchFollowUpInsight(leadId),
          fetchLeadActivityEvents(leadId, 5),
        ]);

        if (!isCurrent) return;
        setInsight(nextInsight);
        setEvents(nextEvents);
        setError(null);
      } catch (loadError) {
        if (!isCurrent) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : locale === "sq"
              ? "Nuk u ngarkua analiza e ndjekjes."
              : "Could not load follow-up insight.",
        );
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadInitialInsight();

    return () => {
      isCurrent = false;
    };
  }, [leadId, locale]);

  const isEmpty = insight?.reasoning.eventCount === 0;
  const eventFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(getIntlLocale(locale), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (isLoading) {
    return <LoadingState locale={locale} />;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-sm">
      <div className="grid gap-5 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              PRONA X AI
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
              Smart Follow-Up Assistant
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {locale === "sq"
                ? "Analizon sinjalet e lead-it dhe rekomandon kur, si dhe çfarë veprimi të bëjë agjenti."
                : "Analyzes lead signals and recommends when, how, and what the agent should do next."}
            </p>
          </div>

          <Button
            aria-label={
              locale === "sq"
                ? "Rikalkulo rekomandimin AI"
                : "Recalculate AI recommendation"
            }
            className="h-11 min-h-11 w-full sm:w-auto"
            disabled={isRefreshing}
            onClick={() => void loadInsight({ showRefreshing: true })}
            type="button"
            variant="outline"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {locale === "sq" ? "Rikalkulo" : "Refresh"}
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {locale === "sq"
              ? "Nuk u ngarkua asistenti i ndjekjes. Provo përsëri."
              : "Could not load follow-up insight. Please try again."}{" "}
            <span className="font-medium">{error}</span>
          </div>
        ) : null}

        {insight ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label={locale === "sq" ? "Engagement Score" : "Engagement Score"}
                value={`${insight.engagementScore}/100`}
              />
              <MetricCard
                icon={<Signal className="h-4 w-4" />}
                label={
                  locale === "sq" ? "Probabilitet përgjigjeje" : "Response Probability"
                }
                value={`${insight.responseProbability}%`}
              />
              <div
                className={`min-w-0 rounded-2xl border p-4 shadow-sm ${getUrgencyClass(
                  insight.urgencyLevel,
                )}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                    {locale === "sq" ? "Urgjenca" : "Urgency"}
                  </p>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
                  {insight.urgencyLevel}
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <BrainCircuit className="h-4 w-4" />
                  {locale === "sq" ? "Veprimi i rekomanduar" : "Recommended Action"}
                </div>
                <p className="mt-3 text-base leading-7 text-slate-900">
                  {insight.recommendedAction}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock className="h-4 w-4 text-indigo-700" />
                    {locale === "sq" ? "Dritarja më e mirë" : "Best Contact Window"}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {insight.bestContactDay}, {insight.bestContactWindow}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                    {locale === "sq" ? "Kanali i preferuar" : "Preferred Channel"}
                  </div>
                  <p className="mt-3 text-lg font-semibold capitalize text-slate-950">
                    {insight.preferredChannel}
                  </p>
                </div>
              </div>
            </div>

            {isEmpty ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-4 text-sm leading-6 text-indigo-900">
                {locale === "sq"
                  ? "Ende nuk ka aktivitete të regjistruara. Regjistro ndërveprimin e parë për të aktivizuar Smart Follow-Up AI."
                  : "No lead activity recorded yet. Log the first interaction to activate Smart Follow-Up AI."}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Strong Signals" : "Strong Signals"}
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {insight.reasoning.strongestSignals.length > 0 ? (
                    insight.reasoning.strongestSignals.map((signal) => (
                      <li className="flex gap-2" key={signal}>
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <span>{signal}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500">
                      {locale === "sq"
                        ? "Nuk ka sinjale të forta ende."
                        : "No strong signals detected yet."}
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Weak Signals" : "Weak Signals"}
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {insight.reasoning.weakSignals.map((signal) => (
                    <li className="flex gap-2" key={signal}>
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {locale === "sq" ? "Aktiviteti i fundit:" : "Last activity:"}{" "}
                <span className="font-medium text-slate-700">
                  {formatDate(insight.reasoning.lastActivityAt, locale)}
                </span>
              </span>
              <span>
                {locale === "sq" ? "Sinjale të analizuara:" : "Signals analyzed:"}{" "}
                <span className="font-medium text-slate-700">
                  {insight.reasoning.eventCount}
                </span>
              </span>
            </div>
          </>
        ) : null}

        <LeadActivityLogger
          leadId={leadId}
          locale={locale}
          onLogged={({ event, insight: nextInsight }) => {
            setInsight(nextInsight);
            setEvents((currentEvents) => [event, ...currentEvents].slice(0, 5));
          }}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-700" />
            <h3 className="text-sm font-semibold text-slate-950">
              {locale === "sq" ? "Aktivitetet e fundit" : "Recent activity"}
            </h3>
          </div>
          <div className="mt-3 grid gap-2">
            {events.length > 0 ? (
              events.map((event) => (
                <div
                  className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  key={event.id || `${event.eventType}-${event.createdAt}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {eventLabels[event.eventType]?.[locale] || event.eventType}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {event.channel || "unknown"}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">
                    {eventFormatter.format(new Date(event.createdAt))}
                  </time>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                {locale === "sq"
                  ? "Nuk ka aktivitete të regjistruara ende."
                  : "No activity events recorded yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
