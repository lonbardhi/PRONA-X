import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CalendarClock,
  Flame,
  Mail,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";

import { LeadFollowUpAssistant } from "@/components/ai/LeadFollowUpAssistant";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { buttonVariants } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { getIntlLocale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { formatEuro } from "@/lib/properties";
import {
  createWhatsAppUrl,
  formatSellerLeadPropertyType,
  formatSellerLeadSource,
  formatSellerLeadStatus,
  formatSellerLeadTemperature,
  formatSellerLeadTimeline,
  type SellerLeadRecord,
} from "@/lib/seller-leads";
import { requireOperatorUser } from "@/lib/supabase/server";

type SellerLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null, locale: "sq" | "en") {
  if (!value) return locale === "sq" ? "Pa datë" : "No date";

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 break-words text-base font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}

export default async function SellerLeadDetailPage({
  params,
}: SellerLeadDetailPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireOperatorUser();

  const { data, error } = await supabase
    .from("seller_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const lead = data as SellerLeadRecord;

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1300px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className={buttonVariants({
              className: "h-10 min-h-10 w-full px-4 sm:w-auto",
              variant: "secondary",
            })}
            href="/seller-leads"
            prefetch={false}
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === "sq" ? "Kthehu te lead-et" : "Back to leads"}
          </Link>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              className={buttonVariants({
                className: "h-10 min-h-10 w-full px-4 sm:w-auto",
                variant: "outline",
              })}
              href={`tel:${lead.phone}`}
            >
              <Phone className="h-4 w-4" />
              {locale === "sq" ? "Telefon" : "Call"}
            </a>
            <a
              className={buttonVariants({
                className: "h-10 min-h-10 w-full px-4 sm:w-auto",
                variant: "success",
              })}
              href={createWhatsAppUrl(lead.phone)}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="crm-card p-4 sm:p-5 lg:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                <BrainCircuit className="h-3.5 w-3.5" />
                PRONA X AI Lead Desk
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {lead.seller_name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {locale === "sq"
                  ? "Pamje e fokusuar për kualifikim, ndjekje dhe rekomandime inteligjente."
                  : "Focused workspace for qualification, follow-up, and intelligent recommendations."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatSellerLeadStatus(lead.status)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  <Flame className="h-3.5 w-3.5" />
                  {formatSellerLeadTemperature(lead.temperature)}
                </span>
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Score {lead.quality_score}/100
                </span>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-950">
                <UserRound className="h-4 w-4 text-indigo-700" />
                {locale === "sq" ? "Kontakt" : "Contact"}
              </div>
              <p className="break-words">{lead.phone}</p>
              {lead.seller_email ? (
                <p className="flex min-w-0 items-center gap-2 break-words">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  {lead.seller_email}
                </p>
              ) : null}
              <p className="flex min-w-0 items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                {locale === "sq" ? "Ndjekja tjetër:" : "Next follow-up:"}{" "}
                <span className="font-semibold text-slate-950">
                  {formatDate(lead.next_follow_up_at, locale)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <LeadFollowUpAssistant leadId={lead.id} locale={locale} />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            label={locale === "sq" ? "Tipi i pronës" : "Property type"}
            value={formatSellerLeadPropertyType(lead.property_type)}
          />
          <InfoTile
            label={locale === "sq" ? "Lokacioni" : "Location"}
            value={
              [lead.area, lead.city].filter(Boolean).join(", ") ||
              (locale === "sq" ? "Pa lokacion" : "No location")
            }
          />
          <InfoTile
            label={locale === "sq" ? "Çmimi i pritur" : "Expected price"}
            value={
              lead.expected_price != null
                ? formatEuro(lead.expected_price, locale)
                : locale === "sq"
                  ? "Pa çmim"
                  : "No price"
            }
          />
          <InfoTile
            label={locale === "sq" ? "Burimi" : "Source"}
            value={formatSellerLeadSource(lead.source)}
          />
          <InfoTile
            label={locale === "sq" ? "Afati" : "Timeline"}
            value={formatSellerLeadTimeline(lead.timeline)}
          />
          <InfoTile
            label={locale === "sq" ? "Kontakt i preferuar" : "Preferred contact"}
            value={lead.preferred_contact_method || "phone"}
          />
          <InfoTile
            label={locale === "sq" ? "Kontaktuar së fundmi" : "Last contacted"}
            value={formatDate(lead.last_contacted_at, locale)}
          />
          <InfoTile
            label={locale === "sq" ? "Krijuar" : "Created"}
            value={formatDate(lead.created_at, locale)}
          />
        </section>

        {lead.seller_notes || lead.asking_reason ? (
          <section className="crm-card grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
            {lead.seller_notes ? (
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {locale === "sq" ? "Shënime" : "Notes"}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {lead.seller_notes}
                </p>
              </div>
            ) : null}
            {lead.asking_reason ? (
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {locale === "sq" ? "Arsye shitjeje" : "Selling reason"}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {lead.asking_reason}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </DashboardShell>
  );
}
