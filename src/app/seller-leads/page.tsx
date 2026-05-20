import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  MessageCircle,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
} from "lucide-react";

import {
  convertSellerLeadToPropertyAction,
  createSellerLeadAction,
  markSellerLeadContactedAction,
  updateSellerLeadStatusAction,
} from "@/app/seller-leads/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasSupabaseEnv } from "@/lib/env";
import { getIntlLocale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  canConvertSellerLead,
  createWhatsAppUrl,
  formatSellerLeadPropertyType,
  formatSellerLeadSource,
  formatSellerLeadStatus,
  formatSellerLeadTemperature,
  formatSellerLeadTimeline,
  getSellerLeadMissingRequirements,
  sellerLeadContactMethods,
  sellerLeadPropertyTypes,
  sellerLeadSources,
  sellerLeadStatuses,
  sellerLeadTimelines,
  type SellerLeadRecord,
  type SellerLeadStatus,
  type SellerLeadTemperature,
} from "@/lib/seller-leads";
import { formatEuro } from "@/lib/properties";
import { requireOperatorUser } from "@/lib/supabase/server";

type SellerLeadsPageProps = {
  searchParams: Promise<{
    agent?: string;
    followUp?: string;
    message?: string;
    q?: string;
    sort?: string;
    source?: string;
    status?: string;
    temperature?: string;
  }>;
};

const leadSelect = "*";

const statusGroups: Array<{ key: SellerLeadStatus; label: string }> = [
  { key: "new", label: "Leads të Reja" },
  { key: "contacted", label: "Në Ndjekje" },
  { key: "qualified", label: "Të Kualifikuara" },
  { key: "listing_preparation", label: "Në Përgatitje" },
  { key: "manager_review", label: "Në Rishikim" },
  { key: "converted", label: "Të Konvertuara" },
  { key: "lost", label: "Të Humbura" },
];

const sortOptions = [
  { label: "Më të rejat", value: "newest" },
  { label: "Data e ndjekjes", value: "follow_up" },
  { label: "Score më i lartë", value: "score" },
  { label: "Kontaktuar së fundmi", value: "last_contacted" },
];

function cleanSearchTerm(value?: string) {
  return (value || "").trim().replace(/[,%]/g, " ");
}

function getStatusBadgeClass(status: SellerLeadStatus) {
  const styles: Record<SellerLeadStatus, string> = {
    contacted: "border-blue-200 bg-blue-50 text-blue-700",
    converted: "border-emerald-200 bg-emerald-50 text-emerald-700",
    listing_preparation: "border-cyan-200 bg-cyan-50 text-cyan-700",
    lost: "border-rose-200 bg-rose-50 text-rose-700",
    manager_review: "border-violet-200 bg-violet-50 text-violet-700",
    new: "border-slate-200 bg-slate-50 text-slate-700",
    nurture: "border-amber-200 bg-amber-50 text-amber-700",
    qualified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return styles[status];
}

function getTemperatureBadgeClass(temperature: SellerLeadTemperature) {
  const styles: Record<SellerLeadTemperature, string> = {
    cold: "border-slate-200 bg-slate-50 text-slate-600",
    hot: "border-orange-200 bg-orange-50 text-orange-700",
    warm: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return styles[temperature];
}

function formatDate(value: string | null, locale: "sq" | "en") {
  if (!value) return "Pa datë";

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isOverdue(value: string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function StatCard({
  label,
  tone = "slate",
  value,
}: {
  label: string;
  tone?: "slate" | "emerald" | "amber" | "cyan" | "rose";
  value: string | number;
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-500",
  };

  return (
    <div className={`crm-card p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SelectField({
  children,
  defaultValue,
  label,
  name,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  label: string;
  name: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Select
        defaultValue={defaultValue || ""}
        name={name}
      >
        {children}
      </Select>
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  defaultValue?: string | number | null;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Input
        defaultValue={defaultValue ?? ""}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SellerLeadForm({
  agents,
  currentUserName,
}: {
  agents: Array<{ full_name: string | null; id: string; role: string }>;
  currentUserName: string;
}) {
  return (
    <section
      className="crm-card overflow-hidden"
      id="add-lead"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Regjistrim lead-i
            </p>
            <h2 className="text-xl font-semibold text-slate-950">
              Shto Lead Shitësi
            </h2>
          </div>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Përdore këtë formë për pronarë që mund të shesin, por nuk janë ende gati
          për inventarin e shitjeve.
        </p>
      </div>

      <form action={createSellerLeadAction} className="grid gap-5 p-4 sm:p-5">
        <input name="status" type="hidden" value="new" />

        <div className="crm-section md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-950">
              Informacioni i shitësit
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Ruaj identitetin dhe kontaktin para se të hapet një rekord prone.
            </p>
          </div>
          <TextField label="Emri i shitësit" name="seller_name" placeholder="Artan Hoxha" required />
          <TextField label="Telefoni" name="phone" placeholder="+355..." required />
          <TextField label="Email" name="seller_email" placeholder="emri@email.com" type="email" />
          <SelectField label="Kontakti i preferuar" name="preferred_contact_method" defaultValue="phone">
            {sellerLeadContactMethods.map((method) => (
              <option key={method} value={method}>
                {method === "phone"
                  ? "Telefon"
                  : method === "whatsapp"
                    ? "WhatsApp"
                    : method === "email"
                      ? "Email"
                      : "Takim fizik"}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="crm-section md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-950">
              Informacioni i pronës së mundshme
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Këto fusha ndihmojnë kualifikimin; prona nuk krijohet ende.
            </p>
          </div>
          <SelectField label="Tipi i pronës" name="property_type">
            <option value="">Zgjidh tipin</option>
            {sellerLeadPropertyTypes.map((type) => (
              <option key={type} value={type}>
                {formatSellerLeadPropertyType(type)}
              </option>
            ))}
          </SelectField>
          <TextField label="Qyteti" name="city" placeholder="Tiranë, Durrës, Vlorë" />
          <TextField label="Zona / lagjja" name="area" placeholder="Blloku, Hamallaj, Kodra Priftit" />
          <TextField label="Adresa" name="address" placeholder="Rruga ose vendndodhja e përafërt" />
          <TextField label="Çmimi i pritshëm EUR" name="expected_price" placeholder="245000" type="number" />
          <SelectField label="Afati i shitjes" name="timeline">
            <option value="">Pa afat</option>
            {sellerLeadTimelines.map((timeline) => (
              <option key={timeline} value={timeline}>
                {formatSellerLeadTimeline(timeline)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="crm-section md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-950">
              Konteksti i shitjes dhe menaxhimi
            </h3>
          </div>
          <SelectField label="Burimi" name="source">
            <option value="">Zgjidh burimin</option>
            {sellerLeadSources.map((source) => (
              <option key={source} value={source}>
                {formatSellerLeadSource(source)}
              </option>
            ))}
          </SelectField>
          <TextField label="Detaje burimi" name="source_details" placeholder="Kush e referoi, linku i reklamës, etj." />
          <TextField label="Link listimi i jashtëm" name="external_listing_url" placeholder="https://..." type="url" />
          <SelectField label="Agjenti përgjegjës" name="assigned_agent_id">
            <option value="">{currentUserName}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name || agent.role}
              </option>
            ))}
          </SelectField>
          <TextField label="Ndjekja e radhës" name="next_follow_up_at" type="datetime-local" />
          <TextField label="Arsyeja e shitjes" name="asking_reason" placeholder="Zhvendosje, investim, trashëgimi..." />

          <div className="grid gap-3 rounded-lg border border-border bg-card p-3 text-sm text-foreground md:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ownership_confirmed", "Pronësia u konfirmua"],
              ["documents_collected", "Dokumentet janë gati"],
              ["photos_collected", "Fotot janë gati"],
              ["valuation_requested", "Kërkon vlerësim"],
            ].map(([name, label]) => (
              <div className="flex items-center gap-2" key={name}>
                <Checkbox id={`seller-lead-${name}`} name={name} />
                <Label
                  className="cursor-pointer text-sm font-normal"
                  htmlFor={`seller-lead-${name}`}
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
            Shënime
            <Textarea
              className="min-h-28"
              name="seller_notes"
              placeholder="Çfarë tha pronari, pengesat, çmimi, dokumentet dhe hapi i radhës."
            />
          </label>
        </div>

        <Button className="w-full sm:w-fit">
          <UserPlus className="h-4 w-4" />
          Shto Lead
        </Button>
      </form>
    </section>
  );
}

function LeadActionButton({
  children,
  status,
  leadId,
}: {
  children: React.ReactNode;
  leadId: string;
  status: SellerLeadStatus;
}) {
  return (
    <form action={updateSellerLeadStatusAction}>
      <input name="lead_id" type="hidden" value={leadId} />
      <input name="status" type="hidden" value={status} />
      <Button className="h-9 min-h-9 w-full px-3 sm:w-auto" size="sm" variant="secondary">
        {children}
      </Button>
    </form>
  );
}

function SellerLeadCard({
  canConvert,
  lead,
  locale,
}: {
  canConvert: boolean;
  lead: SellerLeadRecord;
  locale: "sq" | "en";
}) {
  const missing = getSellerLeadMissingRequirements(lead);
  const completed = missing.filter((item) => item.complete).length;
  const nextFollowUpOverdue = isOverdue(lead.next_follow_up_at);

  return (
    <article
      className="crm-card-interactive grid gap-4 p-4"
      id={`lead-${lead.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                lead.status,
              )}`}
            >
              {formatSellerLeadStatus(lead.status)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getTemperatureBadgeClass(
                lead.temperature,
              )}`}
            >
              <Flame className="h-3.5 w-3.5" />
              {formatSellerLeadTemperature(lead.temperature)}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Score {lead.quality_score}/100
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            {lead.seller_name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatSellerLeadPropertyType(lead.property_type)} ·{" "}
            {[lead.area, lead.city].filter(Boolean).join(", ") || "Pa lokacion"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <a
            aria-label={`Telefononi ${lead.seller_name}`}
            className="crm-icon-button h-10 min-h-10 w-10"
            href={`tel:${lead.phone}`}
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            aria-label={`Hap WhatsApp për ${lead.seller_name}`}
            className="crm-icon-button h-10 min-h-10 w-10 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            href={createWhatsAppUrl(lead.phone)}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            Telefon
          </p>
          <p className="mt-1 font-semibold text-slate-950">{lead.phone}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            Çmimi
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {lead.expected_price != null
              ? formatEuro(lead.expected_price, locale)
              : "Pa çmim"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            Burimi
          </p>
          <p className="mt-1 font-semibold text-slate-950">
            {formatSellerLeadSource(lead.source)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            Ndjekja
          </p>
          <p
            className={`mt-1 font-semibold ${
              nextFollowUpOverdue ? "text-rose-700" : "text-slate-950"
            }`}
          >
            {formatDate(lead.next_follow_up_at, locale)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          className={buttonVariants({
            className: "h-9 min-h-9 w-full px-3 sm:w-auto",
            variant: "outline",
          })}
          href={`/seller-leads/${lead.id}`}
          prefetch={false}
        >
          <BrainCircuit className="h-4 w-4" />
          PRONA X AI
        </Link>
        <form action={markSellerLeadContactedAction}>
          <input name="lead_id" type="hidden" value={lead.id} />
          <Button className="h-9 min-h-9 w-full px-3 sm:w-auto" size="sm" variant="secondary">
            Kontaktuar
          </Button>
        </form>
        {lead.status === "contacted" || lead.status === "new" ? (
          <LeadActionButton leadId={lead.id} status="qualified">
            Kualifiko
          </LeadActionButton>
        ) : null}
        {lead.status === "qualified" ? (
          <LeadActionButton leadId={lead.id} status="listing_preparation">
            Përgatit listimin
          </LeadActionButton>
        ) : null}
        {lead.status === "listing_preparation" ? (
          <LeadActionButton leadId={lead.id} status="manager_review">
            Rishikim
          </LeadActionButton>
        ) : null}
        {lead.status !== "converted" && lead.status !== "lost" ? (
          <>
            <LeadActionButton leadId={lead.id} status="nurture">
              Për ndjekje
            </LeadActionButton>
            <LeadActionButton leadId={lead.id} status="lost">
              Humbur
            </LeadActionButton>
          </>
        ) : null}
        {canConvert ? (
          <form action={convertSellerLeadToPropertyAction}>
            <input name="lead_id" type="hidden" value={lead.id} />
            <Button className="h-9 min-h-9 w-full px-3 sm:w-auto" size="sm" variant="success">
              <CheckCircle2 className="h-4 w-4" />
              Krijo Pronë nga Lead
            </Button>
          </form>
        ) : null}
      </div>

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Detaje, checklist dhe histori
        </summary>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Agjent:</span>{" "}
              {lead.assigned_agent_name || "Pa agjent"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Afati:</span>{" "}
              {formatSellerLeadTimeline(lead.timeline)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Kontaktuar:</span>{" "}
              {formatDate(lead.last_contacted_at, locale)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Krijuar:</span>{" "}
              {formatDate(lead.created_at, locale)}
            </p>
            {lead.seller_notes ? (
              <p className="rounded-lg bg-white p-3 leading-6">{lead.seller_notes}</p>
            ) : null}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">
                Gatishmëria për konvertim
              </p>
              <span className="text-xs font-semibold text-slate-500">
                {completed}/{missing.length}
              </span>
            </div>
            <div className="grid gap-2">
              {missing.map((item) => (
                <div
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600"
                  key={item.label}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      item.complete ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </article>
  );
}

export default async function SellerLeadsPage({
  searchParams,
}: SellerLeadsPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireOperatorUser();
  const q = cleanSearchTerm(params.q);
  const statusFilter = sellerLeadStatuses.includes(params.status as SellerLeadStatus)
    ? (params.status as SellerLeadStatus)
    : "";
  const sourceFilter = sellerLeadSources.includes(params.source as never)
    ? params.source
    : "";
  const temperatureFilter = ["hot", "warm", "cold"].includes(
    params.temperature || "",
  )
    ? params.temperature
    : "";

  let leadsQuery = supabase
    .from("seller_leads")
    .select(leadSelect, { count: "exact" });

  if (q) {
    const pattern = `%${q}%`;
    leadsQuery = leadsQuery.or(
      `seller_name.ilike.${pattern},phone.ilike.${pattern},phone_normalized.ilike.${pattern},city.ilike.${pattern},area.ilike.${pattern},address.ilike.${pattern}`,
    );
  }

  if (statusFilter) leadsQuery = leadsQuery.eq("status", statusFilter);
  if (sourceFilter) leadsQuery = leadsQuery.eq("source", sourceFilter);
  if (temperatureFilter) leadsQuery = leadsQuery.eq("temperature", temperatureFilter);
  if (params.agent) leadsQuery = leadsQuery.eq("assigned_agent_id", params.agent);

  if (params.followUp === "due") {
    leadsQuery = leadsQuery
      .lte("next_follow_up_at", new Date().toISOString())
      .not("status", "in", "(converted,lost)");
  } else if (params.followUp === "upcoming") {
    leadsQuery = leadsQuery.gte("next_follow_up_at", new Date().toISOString());
  }

  if (params.sort === "follow_up") {
    leadsQuery = leadsQuery.order("next_follow_up_at", {
      ascending: true,
      nullsFirst: false,
    });
  } else if (params.sort === "score") {
    leadsQuery = leadsQuery.order("quality_score", { ascending: false });
  } else if (params.sort === "last_contacted") {
    leadsQuery = leadsQuery.order("last_contacted_at", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    leadsQuery = leadsQuery.order("created_at", { ascending: false });
  }

  const [leadResult, agentResult] = await Promise.all([
    leadsQuery,
    supabase
      .from("profiles")
      .select("id,full_name,role")
      .in("role", ["admin", "manager", "agent"])
      .order("full_name", { ascending: true }),
  ]);

  const leadsError = leadResult.error;
  const leads = ((leadResult.data || []) as SellerLeadRecord[]).map((lead) => ({
    ...lead,
    quality_score: lead.quality_score || 0,
    temperature: lead.temperature || "cold",
  }));
  const agents =
    (agentResult.data as Array<{ full_name: string | null; id: string; role: string }> | null) ||
    [];

  const newCount = leads.filter((item) => item.status === "new").length;
  const followUpCount = leads.filter((item) =>
    ["contacted", "nurture", "listing_preparation", "manager_review"].includes(
      item.status,
    ),
  ).length;
  const qualifiedCount = leads.filter((item) => item.status === "qualified").length;
  const convertedCount = leads.filter((item) => item.status === "converted").length;
  const lostCount = leads.filter((item) => item.status === "lost").length;
  const conversionRate =
    leads.length > 0 ? `${Math.round((convertedCount / leads.length) * 100)}%` : "0%";

  const tableMissing =
    leadsError?.message?.includes("seller_leads") ||
    leadsError?.message?.includes("schema cache");

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                <UserPlus className="h-3.5 w-3.5" />
                Leads Shitësish
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                Pronarë Potencialë
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Kualifiko pronarët, ndiq mundësitë e shitjes dhe konverto lead-et
                në listime aktive vetëm kur janë gati.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[560px]">
              <StatCard label="Leads të Reja" value={newCount} />
              <StatCard label="Në Ndjekje" tone="amber" value={followUpCount} />
              <StatCard label="Kualifikuar" tone="emerald" value={qualifiedCount} />
              <StatCard label="Konvertuar" tone="cyan" value={convertedCount} />
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="crm-card border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {tableMissing ? (
          <div className="crm-card border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nevojitet konfigurim Supabase: ekzekuto{" "}
            <code>supabase/migrations/0014_seller_leads.sql</code> në SQL Editor,
            pastaj rifresko faqen.
          </div>
        ) : leadsError ? (
          <div className="crm-card border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {leadsError.message}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <section className="crm-card p-3">
              <form
                action="/seller-leads"
                className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]"
              >
                <label className="relative min-w-0">
                  <span className="sr-only">Kërko lead</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="bg-muted/60 pl-9 pr-3 text-sm focus:bg-background"
                    defaultValue={q}
                    name="q"
                    placeholder="Kërko emër, telefon, qytet, adresë"
                  />
                </label>
                <Select
                  className="bg-muted/60 text-sm font-medium"
                  defaultValue={statusFilter}
                  name="status"
                >
                  <option value="">Të gjitha statuset</option>
                  {sellerLeadStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatSellerLeadStatus(status)}
                    </option>
                  ))}
                </Select>
                <Select
                  className="bg-muted/60 text-sm font-medium"
                  defaultValue={sourceFilter}
                  name="source"
                >
                  <option value="">Të gjitha burimet</option>
                  {sellerLeadSources.map((source) => (
                    <option key={source} value={source}>
                      {formatSellerLeadSource(source)}
                    </option>
                  ))}
                </Select>
                <Select
                  className="bg-muted/60 text-sm font-medium"
                  defaultValue={params.sort || "newest"}
                  name="sort"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Button>
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtro
                </Button>
              </form>
            </section>

            <div className="crm-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Humbur" tone="rose" value={lostCount} />
              <StatCard label="Norma e konvertimit" tone="emerald" value={conversionRate} />
              <StatCard label="Totali në pamje" value={leadResult.count ?? leads.length} />
              <a
                className={buttonVariants({
                  className: "h-auto min-h-20 rounded-xl px-4",
                  variant: "success",
                })}
                href="#add-lead"
              >
                <Plus className="h-4 w-4" />
                Shto Lead
              </a>
            </div>

            <section className="grid gap-4">
              {leads.length === 0 && !leadsError ? (
                <div className="crm-empty-state sm:p-8">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <ClipboardList className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">
                    Ende nuk ka leads shitësish
                  </h2>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Regjistro pronarë potencialë që mund të shesin, kërkesa për
                    vlerësim, listime të jashtme ose mundësi off-market. Lead-et
                    konvertohen në prona vetëm pasi të jenë kualifikuar.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <a
                      className={buttonVariants({
                        className: "h-10 min-h-10 px-4",
                        variant: "success",
                      })}
                      href="#add-lead"
                    >
                      Shto Lead
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <Link
                      className={buttonVariants({
                        className: "h-10 min-h-10 px-4",
                        variant: "secondary",
                      })}
                      href="/sales"
                      prefetch={false}
                    >
                      Shiko Inventarin
                    </Link>
                  </div>
                </div>
              ) : (
                leads.map((lead) => (
                  <SellerLeadCard
                    canConvert={canConvertSellerLead(lead, profile.role)}
                    key={lead.id}
                    lead={lead}
                    locale={locale}
                  />
                ))
              )}
            </section>

            <SellerLeadForm
              agents={agents}
              currentUserName={profile.full_name || user.email || "Cakto tek unë"}
            />
          </div>

          <aside className="grid content-start gap-5">
            <section className="crm-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Nga lead në listim
                  </h2>
                  <p className="text-sm text-slate-500">
                    Fluksi i fitimit të pronarëve.
                  </p>
                </div>
              </div>
              <ol className="mt-5 grid gap-3 text-sm text-slate-600">
                {[
                  "Lead-i i pronarit u regjistrua",
                  "Pronari u kontaktua dhe u kualifikua",
                  "Detajet, çmimi dhe dokumentet u mblodhën",
                  "Menaxheri e rishikoi mundësinë",
                  "Lead-i u konvertua në listim aktiv",
                ].map((item, index) => (
                  <li
                    className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                    key={item}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="crm-card border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-base font-semibold text-slate-950">
                Kur përdoret kjo faqe?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Përdore për pronarë që mund të shesin, kërkesa vlerësimi, listime
                të jashtme, prona pa dokumente të plota ose mundësi off-market.
              </p>
            </section>

            <section className="crm-card p-5">
              <h2 className="text-base font-semibold text-slate-950">
                Tubacioni
              </h2>
              <div className="mt-4 grid gap-2">
                {statusGroups.map((group) => {
                  const count = leads.filter((lead) => lead.status === group.key).length;

                  return (
                    <Link
                      className="crm-card-interactive flex items-center justify-between bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                      href={`/seller-leads?status=${group.key}`}
                      key={group.key}
                      prefetch={false}
                    >
                      <span>{group.label}</span>
                      <span>{count}</span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="crm-card p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <CalendarClock className="h-4 w-4 text-emerald-600" />
                Ndjekje të shpejta
              </h2>
              <div className="mt-4 grid gap-2">
                <Link
                  className="crm-card-interactive bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                  href="/seller-leads?followUp=due"
                  prefetch={false}
                >
                  Ndjekje të vonuara
                </Link>
                <Link
                  className="crm-card-interactive bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                  href="/seller-leads?followUp=upcoming"
                  prefetch={false}
                >
                  Ndjekje të ardhshme
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
