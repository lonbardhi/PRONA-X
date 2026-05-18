import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Euro,
  Home,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import {
  createListingFromCrmRequestAction,
  createCrmRequestAction,
  createCrmRequestMatchAction,
  updateCrmRequestAction,
  updateCrmRequestMatchStatusAction,
  updateCrmRequestStatusAction,
} from "@/app/requests/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasSupabaseEnv } from "@/lib/env";
import { getIntlLocale, type Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  canRequestCreateListing,
  crmRequestSources,
  crmRequestStatuses,
  crmRequestTypes,
  formatCrmRequestMatchStatus,
  formatCrmRequestBadge,
  formatCrmRequestSource,
  formatCrmRequestStatus,
  formatCrmRequestType,
  formatRequestBudget,
  formatRequestLocation,
  formatRequestPropertyType,
  isBuyerRequest,
  isTenantRequest,
  type CrmRequestMatchRecord,
  type CrmRequestMatchStatus,
  type CrmRequestRecord,
  type CrmRequestStatus,
  type CrmRequestType,
} from "@/lib/crm-requests";
import {
  formatPropertyPrice,
  formatPropertyType,
  formatRentPeriodLabel,
  propertyTypes,
  rentPeriods,
  type PropertyRecord,
} from "@/lib/properties";
import { isOperatorRole, requireApprovedUser } from "@/lib/supabase/server";

type RequestsPageProps = {
  searchParams: Promise<{
    agent?: string;
    message?: string;
    q?: string;
    sort?: string;
    status?: string;
    type?: string;
  }>;
};

type AgentOption = {
  full_name: string | null;
  id: string;
  role: string;
};

type MatchCandidate = Pick<
  PropertyRecord,
  | "id"
  | "title"
  | "type"
  | "transaction_type"
  | "status"
  | "city"
  | "neighborhood"
  | "price_eur"
  | "price_on_request"
  | "rent_period"
>;

type RequestMatchSummary = Pick<
  CrmRequestMatchRecord,
  "id" | "match_status" | "property_id" | "request_id"
>;

const requestSelect = "*";
const propertyMatchSelect =
  "id,title,type,transaction_type,status,city,neighborhood,price_eur,price_on_request,rent_period";

function cleanSearchTerm(value?: string) {
  return (value || "").trim().replace(/[,%]/g, " ");
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return locale === "sq" ? "Pa datë" : "No date";

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function getRequestTone(type: CrmRequestType) {
  if (type === "tenant") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (type === "owner") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (type === "investor") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getStatusTone(status: CrmRequestStatus) {
  const tones: Record<CrmRequestStatus, string> = {
    archived: "border-slate-200 bg-slate-100 text-slate-600",
    contacted: "border-blue-200 bg-blue-50 text-blue-700",
    converted: "border-emerald-200 bg-emerald-50 text-emerald-700",
    lost: "border-rose-200 bg-rose-50 text-rose-700",
    matching: "border-cyan-200 bg-cyan-50 text-cyan-700",
    new: "border-slate-200 bg-white text-slate-700",
    nurture: "border-amber-200 bg-amber-50 text-amber-700",
    offer: "border-orange-200 bg-orange-50 text-orange-700",
    viewing: "border-purple-200 bg-purple-50 text-purple-700",
  };

  return tones[status];
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="crm-card bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  min,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  defaultValue?: string | number | null;
  label: string;
  min?: string | number;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <Field label={label}>
      <Input
        defaultValue={defaultValue ?? undefined}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </Field>
  );
}

function RequestForm({
  agents,
  currentUserName,
  defaultRequestType = "buyer",
  locale,
}: {
  agents: AgentOption[];
  currentUserName: string;
  defaultRequestType?: CrmRequestType;
  locale: Locale;
}) {
  const isSq = locale === "sq";

  return (
    <section className="crm-card overflow-hidden" id="add-request">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {isSq ? "Regjistrim kërkese" : "Request intake"}
            </p>
            <h2 className="text-xl font-semibold text-slate-950">
              {isSq ? "Shto kërkesë klienti" : "Add customer request"}
            </h2>
          </div>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          {isSq
            ? "Kërkesat e blerësve dhe qiramarrësve ruhen veçmas nga listimet e pronave."
            : "Buyer and tenant requests stay separate from property listings."}
        </p>
      </div>

      <form action={createCrmRequestAction} className="grid gap-5 p-4 sm:p-5">
        <input name="status" type="hidden" value="new" />

        <div className="crm-section md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-950">
              {isSq ? "Klienti dhe qëllimi" : "Client and intent"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isSq
                ? "Zgjidh në fillim nëse kërkesa është për blerje, qira, pronar apo investitor."
                : "Start by choosing whether this is a buy, rent, owner, or investor request."}
            </p>
          </div>

          <Field label={isSq ? "Lloji i kërkesës" : "Request type"}>
            <Select
              defaultValue={defaultRequestType}
              name="request_type"
              required
            >
              {crmRequestTypes.map((type) => (
                <option key={type} value={type}>
                  {formatCrmRequestType(type, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={isSq ? "Urgjenca" : "Urgency"}>
            <Select name="urgency" defaultValue="warm">
              <option value="hot">{isSq ? "E nxehtë" : "Hot"}</option>
              <option value="warm">{isSq ? "Mesatare" : "Warm"}</option>
              <option value="cold">{isSq ? "E ftohtë" : "Cold"}</option>
            </Select>
          </Field>
          <TextField label={isSq ? "Emri i klientit" : "Client name"} name="customer_name" required />
          <TextField label={isSq ? "Telefoni" : "Phone"} name="phone" placeholder="+355..." required />
          <TextField label="Email" name="email" type="email" />
          <Field label={isSq ? "Kontakti i preferuar" : "Preferred contact"}>
            <Select name="preferred_contact_method" defaultValue="phone">
              <option value="phone">{isSq ? "Telefon" : "Phone"}</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="in_person">{isSq ? "Takim fizik" : "In person"}</option>
            </Select>
          </Field>
        </div>

        <div className="crm-section md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-950">
              {isSq ? "Kriteret e kërkesës" : "Request criteria"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isSq
                ? "Buxheti i blerësit nuk është çmim listimi dhe buxheti i qiramarrësit nuk është pronë me qira."
                : "Buyer budget is not listing price, and tenant budget is not a rental listing."}
            </p>
          </div>
          <Field label={isSq ? "Tipi i pronës" : "Property type"}>
            <Select name="property_type">
              <option value="">{isSq ? "Çdo tip prone" : "Any property type"}</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {formatPropertyType(type, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <TextField label={isSq ? "Qyteti" : "City"} name="city" placeholder="Tirana" />
          <TextField label={isSq ? "Zona / lagjja" : "Area / neighborhood"} name="area" placeholder="Blloku, Farka..." />
          <Field label={isSq ? "Periudha e qirasë" : "Rent period"}>
            <Select name="rent_period">
              <option value="">{isSq ? "Vetëm për qira" : "Only for rentals"}</option>
              {rentPeriods.map((period) => (
                <option key={period} value={period}>
                  {formatRentPeriodLabel(period, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <TextField label={isSq ? "Buxheti minimum EUR" : "Min budget EUR"} name="min_budget_eur" type="number" />
          <TextField label={isSq ? "Buxheti maksimum EUR" : "Max budget EUR"} name="max_budget_eur" type="number" />
          <TextField label={isSq ? "Dhoma minimum" : "Minimum bedrooms"} name="bedrooms_min" type="number" />
          <TextField label={isSq ? "Sipërfaqe minimum m²" : "Minimum area m²"} name="area_min_m2" type="number" />
        </div>

        <div className="crm-section md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-950">
              {isSq ? "Burimi dhe ndjekja" : "Source and follow-up"}
            </h3>
          </div>
          <Field label={isSq ? "Burimi" : "Source"}>
            <Select name="source" required>
              {crmRequestSources.map((source) => (
                <option key={source} value={source}>
                  {formatCrmRequestSource(source, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={isSq ? "Cakto agjent" : "Assign agent"}>
            <Select name="assigned_agent_id">
              <option value="">{currentUserName}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name || agent.role}
                </option>
              ))}
            </Select>
          </Field>
          <TextField label={isSq ? "Ndjekja tjetër" : "Next follow-up"} name="next_follow_up_at" type="datetime-local" />
          <TextField label={isSq ? "Detaje burimi" : "Source details"} name="source_details" />
          <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
            {isSq ? "Shënime" : "Notes"}
            <Textarea name="notes" rows={4} />
          </label>
        </div>

        <Button className="w-full sm:w-fit">
          <Plus className="h-4 w-4" />
          {isSq ? "Krijo kërkesë" : "Create request"}
        </Button>
      </form>
    </section>
  );
}

function RequestEditPanel({
  agents,
  currentUserName,
  locale,
  request,
}: {
  agents: AgentOption[];
  currentUserName: string;
  locale: Locale;
  request: CrmRequestRecord;
}) {
  const isSq = locale === "sq";
  const assignedAgentMissing =
    request.assigned_agent_id &&
    !agents.some((agent) => agent.id === request.assigned_agent_id);

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Pencil className="h-4 w-4 text-slate-500" />
          {isSq ? "Ndrysho kërkesën" : "Edit request"}
        </span>
        <span className="text-xs text-slate-500">
          {isSq ? "Hap / mbyll" : "Open / close"}
        </span>
      </summary>

      <form action={updateCrmRequestAction} className="grid gap-4 border-t border-slate-200 p-3">
        <input name="request_id" type="hidden" value={request.id} />

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={isSq ? "Lloji i kërkesës" : "Request type"}>
            <Select defaultValue={request.request_type} name="request_type" required>
              {crmRequestTypes.map((type) => (
                <option key={type} value={type}>
                  {formatCrmRequestType(type, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={isSq ? "Statusi" : "Status"}>
            <Select defaultValue={request.status} name="status" required>
              {crmRequestStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatCrmRequestStatus(status, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={isSq ? "Urgjenca" : "Urgency"}>
            <Select name="urgency" defaultValue={request.urgency || "warm"}>
              <option value="hot">{isSq ? "E nxehtë" : "Hot"}</option>
              <option value="warm">{isSq ? "Mesatare" : "Warm"}</option>
              <option value="cold">{isSq ? "E ftohtë" : "Cold"}</option>
            </Select>
          </Field>
          <Field label={isSq ? "Cakto agjent" : "Assign agent"}>
            <Select name="assigned_agent_id" defaultValue={request.assigned_agent_id || ""}>
              <option value="">{currentUserName}</option>
              {assignedAgentMissing ? (
                <option value={request.assigned_agent_id || ""}>
                  {request.assigned_agent_name || (isSq ? "Agjenti aktual" : "Current agent")}
                </option>
              ) : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name || agent.role}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            defaultValue={request.customer_name}
            label={isSq ? "Emri i klientit" : "Client name"}
            name="customer_name"
            required
          />
          <TextField
            defaultValue={request.phone}
            label={isSq ? "Telefoni" : "Phone"}
            name="phone"
            required
          />
          <TextField
            defaultValue={request.email}
            label="Email"
            name="email"
            type="email"
          />
          <Field label={isSq ? "Kontakti i preferuar" : "Preferred contact"}>
            <Select
              name="preferred_contact_method"
              defaultValue={request.preferred_contact_method || "phone"}
            >
              <option value="phone">{isSq ? "Telefon" : "Phone"}</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="in_person">{isSq ? "Takim fizik" : "In person"}</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={isSq ? "Tipi i pronës" : "Property type"}>
            <Select name="property_type" defaultValue={request.property_type || ""}>
              <option value="">{isSq ? "Çdo tip prone" : "Any property type"}</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {formatPropertyType(type, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <TextField
            defaultValue={request.city}
            label={isSq ? "Qyteti" : "City"}
            name="city"
          />
          <TextField
            defaultValue={request.area}
            label={isSq ? "Zona / lagjja" : "Area / neighborhood"}
            name="area"
          />
          <Field label={isSq ? "Periudha e qirasë" : "Rent period"}>
            <Select name="rent_period" defaultValue={request.rent_period || ""}>
              <option value="">{isSq ? "Vetëm për qira" : "Only for rentals"}</option>
              {rentPeriods.map((period) => (
                <option key={period} value={period}>
                  {formatRentPeriodLabel(period, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <TextField
            defaultValue={request.min_budget_eur}
            label={isSq ? "Buxheti minimum EUR" : "Min budget EUR"}
            min={0}
            name="min_budget_eur"
            type="number"
          />
          <TextField
            defaultValue={request.max_budget_eur}
            label={isSq ? "Buxheti maksimum EUR" : "Max budget EUR"}
            min={0}
            name="max_budget_eur"
            type="number"
          />
          <TextField
            defaultValue={request.bedrooms_min}
            label={isSq ? "Dhoma minimum" : "Minimum bedrooms"}
            min={0}
            name="bedrooms_min"
            type="number"
          />
          <TextField
            defaultValue={request.area_min_m2}
            label={isSq ? "Sipërfaqe minimum m²" : "Minimum area m²"}
            min={0}
            name="area_min_m2"
            type="number"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={isSq ? "Burimi" : "Source"}>
            <Select name="source" defaultValue={request.source} required>
              {crmRequestSources.map((source) => (
                <option key={source} value={source}>
                  {formatCrmRequestSource(source, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <TextField
            defaultValue={formatDateTimeLocalValue(request.next_follow_up_at)}
            label={isSq ? "Ndjekja tjetër" : "Next follow-up"}
            name="next_follow_up_at"
            type="datetime-local"
          />
          <TextField
            defaultValue={request.source_details}
            label={isSq ? "Detaje burimi" : "Source details"}
            name="source_details"
          />
          <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
            {isSq ? "Shënime" : "Notes"}
            <Textarea defaultValue={request.notes || ""} name="notes" rows={4} />
          </label>
        </div>

        <Button className="min-h-11 w-full sm:w-fit">
          <Pencil className="h-4 w-4" />
          {isSq ? "Ruaj ndryshimet" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}

function StatusAction({
  requestId,
  status,
  children,
}: {
  children: React.ReactNode;
  requestId: string;
  status: CrmRequestStatus;
}) {
  return (
    <form action={updateCrmRequestStatusAction}>
      <input name="request_id" type="hidden" value={requestId} />
      <input name="status" type="hidden" value={status} />
      <Button className="h-9 px-3 text-xs" size="sm" variant="outline">
        {children}
      </Button>
    </form>
  );
}

function MatchAction({
  propertyId,
  requestId,
  children,
}: {
  children: React.ReactNode;
  propertyId: string;
  requestId: string;
}) {
  return (
    <form action={createCrmRequestMatchAction}>
      <input name="request_id" type="hidden" value={requestId} />
      <input name="property_id" type="hidden" value={propertyId} />
      <Button className="h-9 border-emerald-200 px-3 text-xs text-emerald-800 hover:bg-emerald-50" size="sm" variant="outline">
        {children}
      </Button>
    </form>
  );
}

function MatchStatusAction({
  children,
  matchId,
  status,
}: {
  children: React.ReactNode;
  matchId: string;
  status: CrmRequestMatchStatus;
}) {
  return (
    <form action={updateCrmRequestMatchStatusAction}>
      <input name="match_id" type="hidden" value={matchId} />
      <input name="match_status" type="hidden" value={status} />
      <Button className="h-9 px-3 text-xs" size="sm" variant="outline">
        {children}
      </Button>
    </form>
  );
}

function ListingConversionAction({
  children,
  requestId,
  transactionType,
}: {
  children: React.ReactNode;
  requestId: string;
  transactionType: "sale" | "rent";
}) {
  return (
    <form action={createListingFromCrmRequestAction}>
      <input name="request_id" type="hidden" value={requestId} />
      <input name="transaction_type" type="hidden" value={transactionType} />
      <Button className="h-9 min-h-9 w-full px-3 sm:w-auto" size="sm" variant="secondary">
        <Plus className="h-4 w-4" />
        {children}
      </Button>
    </form>
  );
}

function RequestCard({
  agents,
  canManage,
  currentUserName,
  locale,
  matches,
  matchesTableReady,
  request,
  savedMatches,
}: {
  agents: AgentOption[];
  canManage: boolean;
  currentUserName: string;
  locale: Locale;
  matches: MatchCandidate[];
  matchesTableReady: boolean;
  request: CrmRequestRecord;
  savedMatches: RequestMatchSummary[];
}) {
  const isSq = locale === "sq";
  const firstMatch = matches[0];
  const savedFirstMatch = firstMatch
    ? savedMatches.find((match) => match.property_id === firstMatch.id)
    : null;

  return (
    <article className="crm-card grid min-w-0 gap-4 p-4" id={`request-${request.id}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRequestTone(request.request_type)}`}>
              {formatCrmRequestBadge(request.request_type, locale)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(request.status)}`}>
              {formatCrmRequestStatus(request.status, locale)}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">
            {request.customer_name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatRequestPropertyType(request.property_type, locale)} · {formatRequestLocation(request, locale)}
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:text-right">
          <a className="inline-flex items-center gap-2 font-semibold text-slate-700" href={`tel:${request.phone}`}>
            <Phone className="h-4 w-4 text-emerald-600" />
            {request.phone}
          </a>
          <a
            className="inline-flex items-center gap-2 font-semibold text-emerald-700"
            href={`https://wa.me/${request.phone_normalized.replace(/[^\d]/g, "")}`}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            <Euro className="h-3.5 w-3.5" />
            {isTenantRequest(request.request_type) ? (isSq ? "Buxheti mujor" : "Monthly budget") : isSq ? "Buxheti" : "Budget"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatRequestBudget(request, locale).replace(/^[^:]+: /, "")}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            {isSq ? "Ndjekja" : "Follow-up"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDate(request.next_follow_up_at, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            <Home className="h-3.5 w-3.5" />
            {isSq ? "Përputhje" : "Matches"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {matches.length} {isSq ? "listime" : "listings"}
          </p>
        </div>
      </div>

      {request.notes ? (
        <p className="rounded-lg bg-white text-sm leading-6 text-slate-600">
          {request.notes}
        </p>
      ) : null}

      {canManage ? (
        <RequestEditPanel
          agents={agents}
          currentUserName={currentUserName}
          locale={locale}
          request={request}
        />
      ) : null}

      {canRequestCreateListing(request.request_type) ? (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
          <p className="font-semibold">
            {isSq ? "Konvertim kerkese pronari" : "Owner request conversion"}
          </p>
          <p className="mt-1 text-cyan-800">
            {isSq
              ? "Krijo nje draft te ndare per shitje ose qira. Kerkesa nuk shfaqet si listim deri sa te krijohet drafti."
              : "Create a separate sale or rental draft. The request is not shown as a listing until a draft is created."}
          </p>
          {request.converted_property_id ? (
            <Link
              className="mt-3 inline-flex items-center gap-2 font-semibold text-cyan-900"
              href={`/properties/${request.converted_property_id}/edit`}
              prefetch={false}
            >
              {isSq ? "Hap listimin e krijuar" : "Open created listing"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : canManage ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <ListingConversionAction requestId={request.id} transactionType="sale">
                {isSq ? "Krijo listim per shitje" : "Create sale listing"}
              </ListingConversionAction>
              <ListingConversionAction requestId={request.id} transactionType="rent">
                {isSq ? "Krijo listim me qira" : "Create rental listing"}
              </ListingConversionAction>
            </div>
          ) : null}
        </div>
      ) : null}

      {firstMatch ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-800">
            {isSq ? "Përputhja e parë" : "First match"}: {firstMatch.title}
          </p>
          <p className="mt-1 text-emerald-700">
            {[firstMatch.neighborhood, firstMatch.city].filter(Boolean).join(", ")} ·{" "}
            {formatPropertyPrice(firstMatch as PropertyRecord, locale)}
          </p>
          <Link
            className="mt-2 inline-flex items-center gap-2 font-semibold text-emerald-800"
            href={canManage ? `/properties/${firstMatch.id}/edit` : `/properties/${firstMatch.id}`}
            prefetch={false}
          >
            {isSq ? "Hap listimin" : "Open listing"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {canManage && matchesTableReady ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-emerald-200 pt-3">
              {savedFirstMatch ? (
                <>
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800">
                    {formatCrmRequestMatchStatus(savedFirstMatch.match_status, locale)}
                  </span>
                  <MatchStatusAction matchId={savedFirstMatch.id} status="sent">
                    {isSq ? "DÃ«rguar" : "Sent"}
                  </MatchStatusAction>
                  <MatchStatusAction matchId={savedFirstMatch.id} status="viewing">
                    {isSq ? "VizitÃ«" : "Viewing"}
                  </MatchStatusAction>
                  <MatchStatusAction matchId={savedFirstMatch.id} status="offer">
                    {isSq ? "OfertÃ«" : "Offer"}
                  </MatchStatusAction>
                  <MatchStatusAction matchId={savedFirstMatch.id} status="converted">
                    {isSq ? "Konvertuar" : "Converted"}
                  </MatchStatusAction>
                </>
              ) : (
                <MatchAction propertyId={firstMatch.id} requestId={request.id}>
                  {isSq ? "Ruaj pÃ«rputhjen" : "Save match"}
                </MatchAction>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {savedMatches.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
          <span>{isSq ? "PÃ«rputhje tÃ« ruajtura" : "Saved matches"}:</span>
          {savedMatches.map((match) => (
            <span key={match.id} className="rounded-full bg-white px-2.5 py-1 text-slate-700">
              {formatCrmRequestMatchStatus(match.match_status, locale)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {request.assigned_agent_name || (isSq ? "Pa agjent" : "Unassigned")}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {formatCrmRequestSource(request.source, locale)}
        </span>
        {canManage && request.status !== "converted" && request.status !== "lost" ? (
          <>
            <StatusAction requestId={request.id} status="contacted">
              {isSq ? "Kontaktuar" : "Contacted"}
            </StatusAction>
            <StatusAction requestId={request.id} status="matching">
              {isSq ? "Përputhje" : "Matching"}
            </StatusAction>
            <StatusAction requestId={request.id} status="lost">
              {isSq ? "Humbur" : "Lost"}
            </StatusAction>
          </>
        ) : null}
      </div>
    </article>
  );
}

function findMatches(request: CrmRequestRecord, properties: MatchCandidate[]) {
  const rentalRequest = isTenantRequest(request.request_type);
  const buyerRequest = isBuyerRequest(request.request_type);

  if (!rentalRequest && !buyerRequest) {
    return [];
  }

  return properties
    .filter((property) => {
      if (rentalRequest && property.transaction_type === "sale") return false;
      if (buyerRequest && property.transaction_type !== "sale") return false;
      if (property.status === "archived") return false;
      if (request.city && property.city.toLowerCase() !== request.city.toLowerCase()) {
        return false;
      }
      if (request.property_type && property.type !== request.property_type) {
        return false;
      }
      if (request.max_budget_eur != null && property.price_eur != null && property.price_eur > request.max_budget_eur) {
        return false;
      }
      if (request.min_budget_eur != null && property.price_eur != null && property.price_eur < request.min_budget_eur) {
        return false;
      }

      return true;
    })
    .slice(0, 3);
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const params = await searchParams;
  const canManage = isOperatorRole(profile.role);
  const q = cleanSearchTerm(params.q);
  const typeFilter = crmRequestTypes.includes(params.type as CrmRequestType)
    ? (params.type as CrmRequestType)
    : "";
  const statusFilter = crmRequestStatuses.includes(params.status as CrmRequestStatus)
    ? (params.status as CrmRequestStatus)
    : "";
  const sort = params.sort || "newest";

  let requestQuery = supabase
    .from("crm_requests")
    .select(requestSelect, { count: "exact" });

  if (q) {
    requestQuery = requestQuery.or(
      `customer_name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%,area.ilike.%${q}%,notes.ilike.%${q}%`,
    );
  }

  if (typeFilter) requestQuery = requestQuery.eq("request_type", typeFilter);
  if (statusFilter) requestQuery = requestQuery.eq("status", statusFilter);
  if (params.agent) requestQuery = requestQuery.eq("assigned_agent_id", params.agent);

  if (sort === "follow_up") {
    requestQuery = requestQuery.order("next_follow_up_at", {
      ascending: true,
      nullsFirst: false,
    });
  } else {
    requestQuery = requestQuery.order("created_at", { ascending: false });
  }

  const [requestResult, agentResult, propertyResult, matchResult] = await Promise.all([
    requestQuery,
    canManage
      ? supabase
          .from("profiles")
          .select("id,full_name,role")
          .in("role", ["admin", "manager", "agent"])
          .order("full_name")
      : Promise.resolve({ data: [] as AgentOption[], error: null }),
    supabase
      .from("properties")
      .select(propertyMatchSelect)
      .in("status", [
        "published",
        "available",
        "viewing",
        "reserved",
        "negotiation",
        "contract_drafting",
      ]),
    supabase
      .from("crm_request_matches")
      .select("id,request_id,property_id,match_status"),
  ]);

  const requestsMissing =
    requestResult.error?.message?.includes("crm_requests") ||
    requestResult.error?.message?.includes("schema cache");
  const requests = ((requestResult.data || []) as CrmRequestRecord[]).filter(Boolean);
  const agents = ((agentResult.data || []) as AgentOption[]).filter(Boolean);
  const matchCandidates = ((propertyResult.data || []) as MatchCandidate[]).filter(Boolean);
  const matchesMissing =
    matchResult.error?.message?.includes("crm_request_matches") ||
    matchResult.error?.message?.includes("schema cache");
  const savedRequestMatches = ((matchResult.data || []) as RequestMatchSummary[]).filter(Boolean);
  const isSq = locale === "sq";
  const buyerCount = requests.filter((item) => item.request_type === "buyer").length;
  const tenantCount = requests.filter((item) => item.request_type === "tenant").length;
  const ownerCount = requests.filter((item) => item.request_type === "owner").length;
  const investorCount = requests.filter((item) => item.request_type === "investor").length;
  const currentUserName =
    profile.full_name || user.email || (isSq ? "Cakto tek une" : "Assign to me");

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                PRONA X CRM
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
                {isSq ? "Kërkesa Klientësh" : "Customer Requests"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isSq
                  ? "Menaxho kërkesa blerësish, qiramarrësish, pronarësh dhe investitorësh pa i shfaqur si listime prone."
                  : "Manage buyer, tenant, owner, and investor requests without showing them as property listings."}
              </p>
            </div>
            {canManage ? (
              <a
                className={buttonVariants({
                  className: "w-full sm:w-fit",
                })}
                href="#add-request"
              >
                <Plus className="h-4 w-4" />
                {isSq ? "Shto kërkesë" : "Add request"}
              </a>
            ) : null}
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {requestsMissing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isSq
              ? "Tabela e kërkesave nuk është krijuar ende. Ekzekuto migrimin supabase/migrations/0019_crm_requests.sql në Supabase SQL Editor."
              : "The requests table is not created yet. Run supabase/migrations/0019_crm_requests.sql in the Supabase SQL Editor."}
          </div>
        ) : requestResult.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {requestResult.error.message}
          </div>
        ) : null}

        {!requestsMissing && matchesMissing ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {isSq
              ? "Perputhjet e ruajtura kerkojne migrimin supabase/migrations/0020_crm_request_matches.sql."
              : "Saved request matches require the supabase/migrations/0020_crm_request_matches.sql migration."}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={isSq ? "Blerës" : "Buyers"} value={buyerCount} />
          <StatCard label={isSq ? "Qiramarrës" : "Tenants"} value={tenantCount} />
          <StatCard label={isSq ? "Pronarë" : "Owners"} value={ownerCount} />
          <StatCard label={isSq ? "Investitorë" : "Investors"} value={investorCount} />
        </div>

        <div className="crm-card p-3">
          <form action="/requests" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
            <label className="relative min-w-0">
              <span className="sr-only">{isSq ? "Kërko kërkesa" : "Search requests"}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="bg-muted/60 pl-9 pr-3 text-sm focus:bg-background"
                defaultValue={q}
                name="q"
                placeholder={isSq ? "Kërko klient, telefon, qytet, shënime" : "Search client, phone, city, notes"}
              />
            </label>
            <Select className="bg-muted/60 text-sm" defaultValue={typeFilter} name="type">
              <option value="">{isSq ? "Të gjitha llojet" : "All types"}</option>
              {crmRequestTypes.map((type) => (
                <option key={type} value={type}>
                  {formatCrmRequestType(type, locale)}
                </option>
              ))}
            </Select>
            <Select className="bg-muted/60 text-sm" defaultValue={statusFilter} name="status">
              <option value="">{isSq ? "Të gjitha statuset" : "All statuses"}</option>
              {crmRequestStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatCrmRequestStatus(status, locale)}
                </option>
              ))}
            </Select>
            <Select className="bg-muted/60 text-sm" defaultValue={sort} name="sort">
              <option value="newest">{isSq ? "Më të rejat" : "Newest"}</option>
              <option value="follow_up">{isSq ? "Ndjekja e radhës" : "Next follow-up"}</option>
            </Select>
            <Button className="w-full lg:w-auto">
              <SlidersHorizontal className="h-4 w-4" />
              {isSq ? "Kërko" : "Search"}
            </Button>
          </form>
        </div>

        {!requestsMissing && requests.length === 0 ? (
          <div className="crm-empty-state p-8">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 text-lg font-semibold text-slate-950">
              {isSq ? "Ende nuk ka kërkesa" : "No requests yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {isSq
                ? "Shto kërkesën e parë për blerje ose qira. Ajo nuk do të shfaqet në rrjetën e listimeve."
                : "Add the first buyer or tenant request. It will not appear in the listing grid."}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <RequestCard
              agents={agents}
              canManage={canManage}
              currentUserName={currentUserName}
              key={request.id}
              locale={locale}
              matches={findMatches(request, matchCandidates)}
              matchesTableReady={!matchesMissing}
              request={request}
              savedMatches={savedRequestMatches.filter(
                (match) => match.request_id === request.id,
              )}
            />
          ))}
        </div>

        {canManage ? (
          <RequestForm
            agents={agents}
            defaultRequestType={typeFilter || "buyer"}
            currentUserName={currentUserName}
            locale={locale}
          />
        ) : null}

        <div className="crm-card border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {isSq
                ? "Rregull produkti: kërkesat e blerësve dhe qiramarrësve nuk numërohen si listime. Përputhjet tregohen vetëm si sugjerime për ekipin."
                : "Product rule: buyer and tenant requests are not counted as listings. Matches are shown only as team suggestions."}
            </p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
