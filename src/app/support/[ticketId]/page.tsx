import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  History,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  addSupportReplyAction,
  updateSupportTicketAssignmentAction,
  updateSupportTicketPriorityAction,
  updateSupportTicketStatusAction,
} from "@/app/support/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import {
  formatSupportDate,
  formatSupportFileSize,
  getSupportPriorityTone,
  getSupportStatusTone,
  supportActivityLabels,
  supportAttachmentBucket,
  supportPriorityLabels,
  supportStatusLabels,
  supportTicketPriorities,
  supportTicketStatuses,
  type SupportProfileSummary,
  type SupportTicketActivity,
  type SupportTicketAttachment,
  type SupportTicketMessage,
  type SupportTicketRecord,
} from "@/lib/support";
import {
  isSupportRole,
  requireApprovedUser,
} from "@/lib/supabase/server";

type SupportTicketDetailPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
  searchParams: Promise<{
    message?: string;
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAuthorName(author?: SupportProfileSummary | null) {
  return author?.full_name || author?.role || "PRONA X user";
}

function getAttachmentIcon(mimeType: string) {
  return mimeType.startsWith("image/") ? Paperclip : FileText;
}

export default async function SupportTicketDetailPage({
  params,
  searchParams,
}: SupportTicketDetailPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const [{ ticketId }, query] = await Promise.all([params, searchParams]);
  const { profile, supabase, user } = await requireApprovedUser();
  const canManageSupport = isSupportRole(profile.role);
  const supportUsersResult = canManageSupport
    ? supabase
        .from("profiles")
        .select("id,full_name,role")
        .in("role", ["admin", "support"])
        .order("full_name", { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const ticketQuery = supabase.from("support_tickets").select(ticketSelect);
  const { data: ticketData, error: ticketError } = uuidPattern.test(ticketId)
    ? await ticketQuery.eq("id", ticketId).single()
    : await ticketQuery.eq("ticket_number", ticketId).single();

  if (ticketError || !ticketData) {
    notFound();
  }

  const ticket = ticketData as unknown as SupportTicketRecord;
  const [
    messageResult,
    attachmentResult,
    activityResult,
    supportUsers,
  ] = await Promise.all([
    supabase
      .from("support_ticket_messages")
      .select(
        "id,ticket_id,author_id,body,is_internal,created_at,author:profiles!support_ticket_messages_author_id_fkey(id,full_name,role)",
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("support_ticket_attachments")
      .select(
        "id,ticket_id,message_id,bucket_id,storage_path,file_name,mime_type,file_size,is_internal,created_by,created_at",
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("support_ticket_activity")
      .select(
        "id,ticket_id,actor_id,activity_type,from_value,to_value,body,created_at,actor:profiles!support_ticket_activity_actor_id_fkey(id,full_name,role)",
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
    supportUsersResult,
  ]);

  const messages = (messageResult.data || []) as unknown as SupportTicketMessage[];
  const rawAttachments = (attachmentResult.data ||
    []) as unknown as SupportTicketAttachment[];
  const activities = (activityResult.data ||
    []) as unknown as SupportTicketActivity[];
  const supportProfiles = (supportUsers.data ||
    []) as unknown as SupportProfileSummary[];
  const attachments = await Promise.all(
    rawAttachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(supportAttachmentBucket)
        .createSignedUrl(attachment.storage_path, 60 * 10);

      return {
        ...attachment,
        signed_url: data?.signedUrl || null,
      };
    }),
  );
  const ticketAttachments = attachments.filter((attachment) => !attachment.message_id);
  const statusAction = updateSupportTicketStatusAction.bind(null, ticket.id);
  const priorityAction = updateSupportTicketPriorityAction.bind(null, ticket.id);
  const assignmentAction = updateSupportTicketAssignmentAction.bind(null, ticket.id);
  const replyAction = addSupportReplyAction.bind(null, ticket.id);

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/support"
            prefetch={false}
          >
            <ArrowLeft className="h-4 w-4" />
            Support
          </Link>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSupportStatusTone(ticket.status)}`}
            >
              {supportStatusLabels[ticket.status]}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSupportPriorityTone(ticket.priority)}`}
            >
              {supportPriorityLabels[ticket.priority]}
            </span>
          </div>
        </div>

        {query.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {query.message}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="grid min-w-0 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                {ticket.ticket_number}
              </p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {ticket.title}
              </h1>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-950">Created:</span>{" "}
                  {formatSupportDate(ticket.created_at)}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">
                    Last update:
                  </span>{" "}
                  {formatSupportDate(ticket.updated_at)}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">Requester:</span>{" "}
                  {getAuthorName(ticket.creator)}
                </p>
                <p>
                  <span className="font-semibold text-slate-950">Assigned:</span>{" "}
                  {ticket.assignee?.full_name || "Unassigned"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-slate-950">
                Ticket information
              </h2>
              <div className="mt-4 grid gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Description
                  </p>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                    {ticket.description}
                  </p>
                </div>
                {ticket.steps_to_reproduce ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Steps to reproduce
                    </p>
                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                      {ticket.steps_to_reproduce}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
                  <p className="break-words">
                    <span className="font-semibold text-slate-950">Module:</span>{" "}
                    {ticket.related_module || "-"}
                  </p>
                  <p className="break-words">
                    <span className="font-semibold text-slate-950">Property:</span>{" "}
                    {ticket.property?.title || "-"}
                  </p>
                  <p className="break-words">
                    <span className="font-semibold text-slate-950">URL:</span>{" "}
                    {ticket.page_url || "-"}
                  </p>
                  <p className="break-words">
                    <span className="font-semibold text-slate-950">Screen:</span>{" "}
                    {ticket.screen_size || "-"}
                  </p>
                  <p className="break-words">
                    <span className="font-semibold text-slate-950">Device:</span>{" "}
                    {[ticket.device, ticket.os].filter(Boolean).join(" / ") || "-"}
                  </p>
                  <p className="break-words">
                    <span className="font-semibold text-slate-950">Browser:</span>{" "}
                    {ticket.browser || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <Paperclip className="h-4 w-4 text-slate-400" />
                Attachments
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ticketAttachments.length === 0 ? (
                  <p className="text-sm text-slate-500">No ticket attachments.</p>
                ) : null}
                {ticketAttachments.map((attachment) => {
                  const Icon = getAttachmentIcon(attachment.mime_type);

                  return (
                    <a
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition hover:border-emerald-200 hover:bg-emerald-50"
                      href={attachment.signed_url || "#"}
                      key={attachment.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-950">
                          {attachment.file_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatSupportFileSize(attachment.file_size)}
                        </span>
                      </span>
                      <Download className="h-4 w-4 shrink-0 text-slate-400" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                Messages
              </h2>
              <div className="mt-4 grid gap-3">
                {messages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                    No replies yet.
                  </p>
                ) : null}
                {messages.map((message) => {
                  const messageAttachments = attachments.filter(
                    (attachment) => attachment.message_id === message.id,
                  );

                  return (
                    <article
                      className={`rounded-xl border p-4 ${
                        message.is_internal
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                      key={message.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          {message.is_internal ? (
                            <Lock className="h-4 w-4 text-amber-700" />
                          ) : (
                            <UserRound className="h-4 w-4 text-slate-400" />
                          )}
                          {getAuthorName(message.author)}
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatSupportDate(message.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                        {message.body}
                      </p>
                      {messageAttachments.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {messageAttachments.map((attachment) => (
                            <a
                              className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700"
                              href={attachment.signed_url || "#"}
                              key={attachment.id}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {attachment.file_name}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>

            <form
              action={replyAction}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <input name="return_to" type="hidden" value={`/support/${ticket.id}`} />
              <h2 className="text-base font-semibold text-slate-950">
                Add reply
              </h2>
              <textarea
                className="mt-3 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="body"
                placeholder="Write a reply..."
                required
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <input
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.mp4,image/png,image/jpeg,image/webp,application/pdf,video/mp4"
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-orange-700"
                  multiple
                  name="attachments"
                  type="file"
                />
                {canManageSupport ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <input
                      className="h-4 w-4 rounded border-slate-300 text-orange-500"
                      name="is_internal"
                      type="checkbox"
                    />
                    Internal note
                  </label>
                ) : null}
              </div>
              <button className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                <Send className="h-4 w-4" />
                Send reply
              </button>
            </form>
          </section>

          <aside className="grid content-start gap-5">
            {canManageSupport ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  Support controls
                </h2>
                <div className="mt-4 grid gap-3">
                  <form action={statusAction} className="grid gap-2">
                    <input
                      name="return_to"
                      type="hidden"
                      value={`/support/${ticket.id}`}
                    />
                    <label className="text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={ticket.status}
                      name="status"
                    >
                      {supportTicketStatuses.map((status) => (
                        <option key={status} value={status}>
                          {supportStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <button className="h-9 rounded-lg bg-slate-950 text-sm font-semibold text-white">
                      Update status
                    </button>
                  </form>

                  <form action={priorityAction} className="grid gap-2">
                    <input
                      name="return_to"
                      type="hidden"
                      value={`/support/${ticket.id}`}
                    />
                    <label className="text-sm font-medium text-slate-700">
                      Priority
                    </label>
                    <select
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={ticket.priority}
                      name="priority"
                    >
                      {supportTicketPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {supportPriorityLabels[priority]}
                        </option>
                      ))}
                    </select>
                    <button className="h-9 rounded-lg bg-slate-950 text-sm font-semibold text-white">
                      Update priority
                    </button>
                  </form>

                  <form action={assignmentAction} className="grid gap-2">
                    <input
                      name="return_to"
                      type="hidden"
                      value={`/support/${ticket.id}`}
                    />
                    <label className="text-sm font-medium text-slate-700">
                      Assign ticket
                    </label>
                    <select
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={ticket.assigned_to || ""}
                      name="assigned_to"
                    >
                      <option value="">Unassigned</option>
                      {supportProfiles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.full_name || item.role}
                        </option>
                      ))}
                    </select>
                    <button className="h-9 rounded-lg bg-slate-950 text-sm font-semibold text-white">
                      Update assignee
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <History className="h-4 w-4 text-slate-400" />
                Activity history
              </h2>
              <div className="mt-4 grid gap-3">
                {activities.map((activity) => (
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    key={activity.id}
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {supportActivityLabels[activity.activity_type] ||
                        activity.activity_type}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatSupportDate(activity.created_at)}
                      {activity.actor?.full_name
                        ? ` by ${activity.actor.full_name}`
                        : ""}
                    </p>
                    {activity.from_value || activity.to_value ? (
                      <p className="mt-2 break-words text-xs text-slate-600">
                        {activity.from_value || "-"} &rarr;{" "}
                        {activity.to_value || "-"}
                      </p>
                    ) : null}
                    {activity.body ? (
                      <p className="mt-2 text-xs text-slate-600">{activity.body}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
