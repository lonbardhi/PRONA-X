import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
  ShieldCheck,
  StickyNote,
  UserPlus,
} from "lucide-react";

import {
  addWhatsAppInternalNoteAction,
  assignWhatsAppConversationAction,
  createSellerLeadFromWhatsAppAction,
  createWhatsAppFollowUpAction,
  sendWhatsAppMessageAction,
} from "@/app/messages/whatsapp/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { CommunicationChannelTabs } from "@/components/messaging/CommunicationChannelTabs";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getIntlLocale, type Locale } from "@/lib/i18n";
import { getWhatsAppPageData, getWhatsAppSetupWarning } from "@/lib/whatsapp-data";
import {
  getWhatsAppConversationTypeLabel,
  getWhatsAppDisplayName,
  getWhatsAppPriorityLabel,
  getWhatsAppStatusLabel,
  isInsideCustomerServiceWindow,
  type WhatsAppConversation,
  type WhatsAppInternalNote,
  type WhatsAppMessage,
  type WhatsAppProfileSummary,
  type WhatsAppTemplate,
} from "@/lib/whatsapp";
import {
  isOperatorRole,
  isSupportRole,
  requireApprovedUser,
} from "@/lib/supabase/server";

type WhatsAppPageProps = {
  searchParams: Promise<{
    conversation?: string;
    message?: string;
  }>;
};

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function StatCard({
  label,
  tone = "slate",
  value,
}: {
  label: string;
  tone?: "emerald" | "rose" | "amber" | "slate";
  value: number | string;
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <div className={`min-w-0 rounded-xl border p-3 ${tones[tone]}`}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function NotConfiguredState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">WhatsApp nuk është konfiguruar</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6">
            Lidheni WhatsApp Business për të menaxhuar bisedat me blerës,
            qiramarrës dhe pronarë direkt nga PRONA X. Mesazhet e brendshme
            vazhdojnë të punojnë të ndara nga WhatsApp.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {isAdmin ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
                href="/profile?section=security"
                prefetch={false}
              >
                Konfiguro WhatsApp
              </Link>
            ) : null}
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900"
              href="/messages"
              prefetch={false}
            >
              Shiko Mesazhet e Brendshme
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationList({
  activeId,
  conversations,
  locale,
}: {
  activeId: string | null;
  conversations: WhatsAppConversation[];
  locale: Locale;
}) {
  return (
    <aside className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-base font-semibold text-slate-950">Inbox Klientësh</h2>
        <p className="mt-1 text-xs text-slate-500">
          Biseda WhatsApp të ndara nga mesazhet e brendshme.
        </p>
      </div>
      <div className="grid max-h-[72dvh] min-h-[360px] content-start gap-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="m-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-500">
            Ende nuk ka biseda WhatsApp. Mesazhet nga klientët do të shfaqen këtu
            dhe mund të lidhen me leads, prona, takime dhe ndjekje.
          </div>
        ) : null}
        {conversations.map((conversation) => {
          const active = conversation.id === activeId;
          const windowOpen = isInsideCustomerServiceWindow(
            conversation.customer_service_window_expires_at,
          );

          return (
            <Link
              className={`grid gap-2 rounded-xl p-3 transition ${
                active ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"
              }`}
              href={`/messages/whatsapp?conversation=${conversation.id}`}
              key={conversation.id}
              prefetch={false}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-950">
                    {getWhatsAppDisplayName(conversation)}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {getWhatsAppConversationTypeLabel(conversation.type)}
                  </p>
                </div>
                {conversation.unread_count > 0 ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-semibold text-white">
                    {conversation.unread_count}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  {getWhatsAppStatusLabel(conversation.status)}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  {windowOpen ? "Dritarja aktive" : "Kërkon template"}
                </span>
                {conversation.priority !== "normal" ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {getWhatsAppPriorityLabel(conversation.priority)}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-400">
                {formatDate(conversation.last_message_at || conversation.created_at, locale)}
              </p>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

function MessageThread({
  messages,
  locale,
}: {
  locale: Locale;
  messages: WhatsAppMessage[];
}) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
        Nuk ka mesazhe në këtë bisedë ende.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {messages.map((message) => {
        const outbound = message.direction === "outbound";

        return (
          <article
            className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              outbound
                ? "ml-auto bg-slate-950 text-white"
                : "mr-auto border border-slate-200 bg-white text-slate-800"
            }`}
            key={message.id}
          >
            <p className="whitespace-pre-wrap break-words">
              {message.body || (message.media_url ? "Media WhatsApp" : "Mesazh pa tekst")}
            </p>
            <div
              className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${
                outbound ? "text-slate-300" : "text-slate-400"
              }`}
            >
              <span>{formatDate(message.created_at, locale)}</span>
              <span>{message.status}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function NotesList({
  locale,
  notes,
}: {
  locale: Locale;
  notes: WhatsAppInternalNote[];
}) {
  return (
    <div className="grid gap-2">
      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
          Nuk ka shënime të brendshme.
        </div>
      ) : null}
      {notes.map((note) => (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" key={note.id}>
          <p className="text-sm leading-6 text-amber-950">{note.body}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
            {note.author?.full_name || note.author?.email || "PRONA X"} ·{" "}
            {formatDate(note.created_at, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ConversationPanel({
  conversation,
  isConfigured,
  locale,
  messages,
  notes,
  profiles,
  templates,
}: {
  conversation: WhatsAppConversation | null;
  isConfigured: boolean;
  locale: Locale;
  messages: WhatsAppMessage[];
  notes: WhatsAppInternalNote[];
  profiles: WhatsAppProfileSummary[];
  templates: WhatsAppTemplate[];
}) {
  if (!conversation) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <div>
          <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            Zgjidh një bisedë WhatsApp
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Bisedat me klientë, pronarë dhe leads do të shfaqen këtu pa prekur
            mesazhet e brendshme të ekipit.
          </p>
        </div>
      </section>
    );
  }

  const returnTo = `/messages/whatsapp?conversation=${conversation.id}`;
  const windowOpen = isInsideCustomerServiceWindow(
    conversation.customer_service_window_expires_at,
  );

  return (
    <section className="grid min-h-0 gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-h-0 gap-4">
        <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <MessageCircle className="h-4 w-4" />
              </span>
              <h2 className="break-words text-lg font-semibold text-slate-950">
                {getWhatsAppDisplayName(conversation)}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {conversation.contact?.phone_e164} ·{" "}
              {getWhatsAppConversationTypeLabel(conversation.type)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {getWhatsAppStatusLabel(conversation.status)}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {windowOpen ? "Dritarja 24h aktive" : "Template i detyrueshëm"}
            </span>
          </div>
        </div>

        <div className="max-h-[min(68dvh,720px)] min-h-[360px] overflow-y-auto rounded-xl bg-slate-50 p-3">
          <MessageThread locale={locale} messages={messages} />
        </div>

        <form action={sendWhatsAppMessageAction} className="grid gap-3 rounded-xl border border-slate-200 p-3">
          <input name="conversation_id" type="hidden" value={conversation.id} />
          <input name="return_to" type="hidden" value={returnTo} />
          {!windowOpen ? (
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Template i aprovuar
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                name="template_id"
                required
              >
                <option value="">Zgjidh template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Përgjigje WhatsApp
            <textarea
              className="min-h-24 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              disabled={!isConfigured}
              name="body"
              placeholder={
                isConfigured
                  ? "Shkruaj përgjigjen për klientin..."
                  : "Integrimi WhatsApp nuk është konfiguruar ende."
              }
              required
            />
          </label>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            disabled={!isConfigured}
          >
            <Send className="h-4 w-4" />
            Dërgo në WhatsApp
          </button>
        </form>
      </div>

      <aside className="grid content-start gap-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Kontekst CRM
          </h3>
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Agjenti
              </dt>
              <dd className="mt-1 text-slate-800">
                {conversation.assigned_agent?.full_name ||
                  conversation.assigned_agent?.email ||
                  "E pacaktuar"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Ndjekja
              </dt>
              <dd className="mt-1 text-slate-800">
                {formatDate(conversation.next_follow_up_at, locale)}
              </dd>
            </div>
          </dl>
        </div>

        <form action={assignWhatsAppConversationAction} className="rounded-xl border border-slate-200 p-4">
          <input name="conversation_id" type="hidden" value={conversation.id} />
          <input name="return_to" type="hidden" value={returnTo} />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Cakto agjent
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              name="assigned_agent_id"
              defaultValue={conversation.assigned_agent_id || ""}
            >
              <option value="">E pacaktuar</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
          </label>
          <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white">
            Ruaj caktimin
          </button>
        </form>

        <form action={createWhatsAppFollowUpAction} className="rounded-xl border border-slate-200 p-4">
          <input name="conversation_id" type="hidden" value={conversation.id} />
          <input name="return_to" type="hidden" value={returnTo} />
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Clock3 className="h-4 w-4 text-emerald-600" />
            Ndjekje
          </h3>
          <input
            className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            name="follow_up_at"
            type="datetime-local"
          />
          <input
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            name="note"
            placeholder="Shënim ndjekjeje"
          />
          <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white">
            Planifiko
          </button>
        </form>

        <form action={createSellerLeadFromWhatsAppAction} className="rounded-xl border border-slate-200 p-4">
          <input name="conversation_id" type="hidden" value={conversation.id} />
          <input name="return_to" type="hidden" value={returnTo} />
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <UserPlus className="h-4 w-4 text-emerald-600" />
            Krijo Lead Shitësi
          </h3>
          <input
            className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            defaultValue={conversation.contact?.display_name || ""}
            name="seller_name"
            placeholder="Emri i pronarit"
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" name="property_type">
              <option value="">Tipi</option>
              <option value="apartment">Apartament</option>
              <option value="house">Shtëpi</option>
              <option value="villa">Vilë</option>
              <option value="land">Tokë</option>
              <option value="development_land">Tokë zhvillimi</option>
              <option value="commercial">Komerciale</option>
            </select>
            <input
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              name="city"
              placeholder="Qyteti"
            />
          </div>
          <input
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            name="expected_price"
            placeholder="Çmimi i pritshëm"
            type="number"
          />
          <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white">
            Krijo lead
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <StickyNote className="h-4 w-4 text-amber-600" />
            Shënime të brendshme
          </h3>
          <div className="mt-3">
            <NotesList locale={locale} notes={notes} />
          </div>
          <form action={addWhatsAppInternalNoteAction} className="mt-3 grid gap-2">
            <input name="conversation_id" type="hidden" value={conversation.id} />
            <input name="return_to" type="hidden" value={returnTo} />
            <textarea
              className="min-h-20 rounded-xl border border-slate-200 p-3 text-sm"
              name="body"
              placeholder="Shto shënim të brendshëm. Nuk dërgohet te klienti."
            />
            <button className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800">
              Shto shënim
            </button>
          </form>
        </div>
      </aside>
    </section>
  );
}

export default async function WhatsAppMessagesPage({
  searchParams,
}: WhatsAppPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const allowed = isOperatorRole(profile.role) || isSupportRole(profile.role);

  if (!allowed) {
    return (
      <DashboardShell userEmail={user.email} userRole={profile.role}>
        <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            Kjo llogari nuk ka akses per WhatsApp Inbox.
          </div>
        </section>
      </DashboardShell>
    );
  }

  const setupWarning = await getWhatsAppSetupWarning(supabase);

  if (setupWarning) {
    return (
      <DashboardShell userEmail={user.email} userRole={profile.role}>
        <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            {setupWarning}
          </div>
        </section>
      </DashboardShell>
    );
  }

  const data = await getWhatsAppPageData({
    profile,
    selectedConversationId: params.conversation,
    supabase,
    user,
  });
  const currentTime = new Date().getTime();
  const unread = data.conversations.filter((conversation) => conversation.unread_count > 0).length;
  const unassigned = data.conversations.filter((conversation) => !conversation.assigned_agent_id).length;
  const overdue = data.conversations.filter(
    (conversation) =>
      conversation.sla_due_at && new Date(conversation.sla_due_at).getTime() < currentTime,
  ).length;
  const linkedSellerLeads = data.conversations.filter(
    (conversation) => conversation.linked_seller_lead_id,
  ).length;

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-4 overflow-x-hidden px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                <Send className="h-3.5 w-3.5" />
                WhatsApp CRM
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                Qendra e Komunikimit
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Menaxho bisedat me klientë në WhatsApp pa përzier mesazhet e
                brendshme të ekipit. Lidhu me leads, prona, ndjekje dhe shënime
                private CRM.
              </p>
            </div>
            <div className="grid gap-3">
              <CommunicationChannelTabs active="whatsapp" locale={locale} />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <StatCard label="Të palexuara" tone="rose" value={unread} />
                <StatCard label="Të pacaktuara" tone="amber" value={unassigned} />
                <StatCard label="Të vonuara" tone="amber" value={overdue} />
                <StatCard label="Leads WhatsApp" tone="emerald" value={linkedSellerLeads} />
              </div>
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {!data.isConfigured ? <NotConfiguredState isAdmin={profile.role === "admin"} /> : null}

        <div className="grid min-h-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <ConversationList
            activeId={data.activeConversationId}
            conversations={data.conversations}
            locale={locale}
          />
          <ConversationPanel
            conversation={data.activeConversation}
            isConfigured={data.isConfigured}
            locale={locale}
            messages={data.messages}
            notes={data.notes}
            profiles={data.profiles}
            templates={data.templates}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Rregull i privatësisë
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Shënimet e brendshme që shtohen këtu nuk dërgohen në WhatsApp.
                Mesazhet e ekipit vazhdojnë të qëndrojnë te “Mesazhe të
                brendshme”.
              </p>
            </div>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
