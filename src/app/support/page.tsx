import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Filter,
  LifeBuoy,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { SupportReportModal } from "@/components/SupportReportModal";
import { hasSupabaseEnv } from "@/lib/env";
import {
  formatSupportDate,
  getSupportPriorityTone,
  getSupportStatusTone,
  supportCategoryLabels,
  supportPriorityLabels,
  supportStatusLabels,
  supportTicketCategories,
  supportTicketPriorities,
  supportTicketStatuses,
  type SupportPropertyOption,
  type SupportTicketRecord,
} from "@/lib/support";
import {
  isSupportRole,
  requireApprovedUser,
} from "@/lib/supabase/server";

type SupportPageProps = {
  searchParams: Promise<{
    category?: string;
    message?: string;
    priority?: string;
    q?: string;
    status?: string;
    tab?: string;
  }>;
};

const ticketSelect = `
  id,
  ticket_number,
  title,
  category,
  priority,
  status,
  related_module,
  related_property_id,
  description,
  steps_to_reproduce,
  page_url,
  browser,
  device,
  os,
  screen_size,
  created_by,
  assigned_to,
  resolved_at,
  created_at,
  updated_at,
  creator:profiles!support_tickets_created_by_fkey(id,full_name,role),
  assignee:profiles!support_tickets_assigned_to_fkey(id,full_name,role),
  property:properties(id,title,city,neighborhood)
`;

function getValidParam<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
) {
  return value && allowed.includes(value) ? value : "";
}

function getSearchPattern(value?: string) {
  const term = value?.trim();

  return term ? `%${term.replace(/[%_]/g, "")}%` : "";
}

function getStatCount(
  tickets: Array<{ priority: string; status: string }>,
  type: "critical" | "in_progress" | "open" | "resolved",
) {
  if (type === "critical") {
    return tickets.filter((ticket) => ticket.priority === "critical").length;
  }

  if (type === "resolved") {
    return tickets.filter((ticket) =>
      ["resolved", "closed"].includes(ticket.status),
    ).length;
  }

  return tickets.filter((ticket) => ticket.status === type).length;
}

function tabHref(tab: string) {
  return `/support?tab=${tab}`;
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const { profile, supabase, user } = await requireApprovedUser();
  const canManageSupport = isSupportRole(profile.role);
  const activeTab = params.tab || "tickets";
  const status = getValidParam(params.status, supportTicketStatuses);
  const priority = getValidParam(params.priority, supportTicketPriorities);
  const category = getValidParam(params.category, supportTicketCategories);
  const searchPattern = getSearchPattern(params.q);

  let ticketQuery = supabase
    .from("support_tickets")
    .select(ticketSelect)
    .order("updated_at", { ascending: false });

  if (status) {
    ticketQuery = ticketQuery.eq("status", status);
  }

  if (priority) {
    ticketQuery = ticketQuery.eq("priority", priority);
  }

  if (category) {
    ticketQuery = ticketQuery.eq("category", category);
  }

  if (searchPattern) {
    ticketQuery = ticketQuery.or(
      `ticket_number.ilike.${searchPattern},title.ilike.${searchPattern},description.ilike.${searchPattern},related_module.ilike.${searchPattern}`,
    );
  }

  const [ticketResult, statsResult, propertyResult] = await Promise.all([
    ticketQuery.limit(60),
    supabase.from("support_tickets").select("status,priority"),
    supabase
      .from("properties")
      .select("id,title,city,neighborhood")
      .order("title", { ascending: true })
      .limit(200),
  ]);

  const tickets = (ticketResult.data || []) as unknown as SupportTicketRecord[];
  const statsRows = (statsResult.data || []) as Array<{
    priority: string;
    status: string;
  }>;
  const propertyOptions = (propertyResult.data || []) as SupportPropertyOption[];

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                <LifeBuoy className="h-3.5 w-3.5" />
                PRONA X Support
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                Support
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Report problems, request help, and track support tickets.
              </p>
            </div>

            <SupportReportModal properties={propertyOptions} />
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {ticketResult.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {ticketResult.error.message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Ticket className="h-4 w-4" />
              Open
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {getStatCount(statsRows, "open")}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              <Clock3 className="h-4 w-4" />
              In Progress
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {getStatCount(statsRows, "in_progress")}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Resolved
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {getStatCount(statsRows, "resolved")}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              Critical
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {getStatCount(statsRows, "critical")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2">
            {[
              ["tickets", "My Tickets", MessageSquare],
              ["knowledge", "Knowledge Base", BookOpen],
              ["contact", "Contact Support", Mail],
            ].map(([value, label, Icon]) => {
              const TabIcon = Icon as typeof MessageSquare;
              const active = activeTab === value;

              return (
                <Link
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                  href={tabHref(String(value))}
                  key={String(value)}
                  prefetch={false}
                >
                  <TabIcon className="h-4 w-4" />
                  {String(label)}
                </Link>
              );
            })}
          </div>

          {activeTab === "knowledge" ? (
            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-3">
              {[
                [
                  "Uploading property media",
                  "Use JPG, PNG, WebP, PDF, or MP4 files and keep large videos short.",
                ],
                [
                  "User access and approvals",
                  "Pending users must be approved as Viewer, Agent, Manager, Support, or Admin.",
                ],
                [
                  "Calendar troubleshooting",
                  "If appointments are missing, check the related property and assigned agent.",
                ],
              ].map(([title, body]) => (
                <article
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  key={title}
                >
                  <h2 className="text-base font-semibold text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "contact" ? (
            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-base font-semibold text-slate-950">
                  Contact support
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Create a ticket for traceable support. For urgent account lockout
                  cases, email support with the affected user email and workspace.
                </p>
                <a
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  href="mailto:support@pronax.al"
                >
                  support@pronax.al
                </a>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h2 className="text-base font-semibold text-slate-950">
                  What to include
                </h2>
                <ul className="mt-2 grid gap-2 text-sm text-slate-600">
                  <li>Ticket title and affected module</li>
                  <li>Steps to reproduce</li>
                  <li>Screenshots or screen recording</li>
                  <li>Expected result and actual result</li>
                </ul>
              </div>
            </div>
          ) : null}

          {activeTab === "tickets" ? (
            <div className="grid gap-4 p-4 sm:p-5">
              <form className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px_auto]">
                <label className="relative min-w-0">
                  <span className="sr-only">Search tickets</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    defaultValue={params.q}
                    name="q"
                    placeholder="Search ticket ID, title, description"
                  />
                </label>

                <select
                  className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  defaultValue={status}
                  name="status"
                >
                  <option value="">All statuses</option>
                  {supportTicketStatuses.map((item) => (
                    <option key={item} value={item}>
                      {supportStatusLabels[item]}
                    </option>
                  ))}
                </select>

                <select
                  className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  defaultValue={priority}
                  name="priority"
                >
                  <option value="">All priorities</option>
                  {supportTicketPriorities.map((item) => (
                    <option key={item} value={item}>
                      {supportPriorityLabels[item]}
                    </option>
                  ))}
                </select>

                <select
                  className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  defaultValue={category}
                  name="category"
                >
                  <option value="">All categories</option>
                  {supportTicketCategories.map((item) => (
                    <option key={item} value={item}>
                      {supportCategoryLabels[item]}
                    </option>
                  ))}
                </select>

                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <Filter className="h-4 w-4" />
                  Filter
                </button>
              </form>

              <div className="grid gap-3">
                {tickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                    <Ticket className="mx-auto h-8 w-8 text-slate-300" />
                    <h2 className="mt-3 text-base font-semibold text-slate-950">
                      No support tickets found
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Report an issue or clear filters to see more tickets.
                    </p>
                  </div>
                ) : null}

                {tickets.map((ticket) => (
                  <Link
                    className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30 md:grid-cols-[minmax(0,1fr)_auto]"
                    href={`/support/${ticket.id}`}
                    key={ticket.id}
                    prefetch={false}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {ticket.ticket_number}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSupportStatusTone(ticket.status)}`}
                        >
                          {supportStatusLabels[ticket.status]}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSupportPriorityTone(ticket.priority)}`}
                        >
                          {supportPriorityLabels[ticket.priority]}
                        </span>
                      </div>
                      <h2 className="mt-3 break-words text-base font-semibold text-slate-950">
                        {ticket.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {supportCategoryLabels[ticket.category]}
                        {ticket.related_module
                          ? ` / ${ticket.related_module}`
                          : ""}
                      </p>
                    </div>
                    <div className="grid gap-1 text-sm text-slate-500 md:text-right">
                      <span>Created {formatSupportDate(ticket.created_at)}</span>
                      <span>Updated {formatSupportDate(ticket.updated_at)}</span>
                      {canManageSupport && ticket.creator?.full_name ? (
                        <span>By {ticket.creator.full_name}</span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {canManageSupport ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Support/admin view: you can see all workspace tickets and internal notes.
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}
