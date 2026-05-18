import { ShieldCheck, UserCheck, UserCog, UserRoundX } from "lucide-react";

import { updateUserRoleAction } from "@/app/admin/users/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import {
  getAvailabilityStatusDotClass,
  getAvailabilityStatusLabels,
  getAvailabilityStatusToneClass,
  type AvailabilityStatus,
} from "@/lib/agent-workspace";
import { hasSupabaseEnv } from "@/lib/env";
import { getIntlLocale, getRoleLabel, type Locale, t } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { type AppRole, requireAdminUser } from "@/lib/supabase/server";

type AdminUsersPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type ProfileRow = {
  account_status?: string | null;
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  created_at: string;
};

type UserStatusRow = {
  status: AvailabilityStatus;
  status_message: string | null;
  updated_at: string | null;
  user_id: string;
};

const roleOptions: Array<{ value: AppRole; label: string }> = [
  { value: "pending", label: "Pending approval" },
  { value: "viewer", label: "Viewer" },
  { value: "agent", label: "Agent" },
  { value: "manager", label: "Manager" },
  { value: "support", label: "Support" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
];

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireAdminUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const profiles = (data || []) as ProfileRow[];
  let statusRows: UserStatusRow[] = [];

  if (profiles.length > 0) {
    const { data: userStatusRows } = await supabase
      .from("user_status")
      .select("user_id,status,status_message,updated_at")
      .in(
        "user_id",
        profiles.map((item) => item.id),
      );

    statusRows = (userStatusRows || []) as UserStatusRow[];
  }

  const statusMap = new Map(statusRows.map((status) => [status.user_id, status]));
  const statusLabels = getAvailabilityStatusLabels(locale);
  const pendingCount = profiles.filter(
    (item) => item.role === "pending" || item.account_status === "pending_approval",
  ).length;
  const viewerCount = profiles.filter((item) => item.role === "viewer").length;
  const approvedCount = profiles.length - pendingCount;
  const adminCount = profiles.filter((item) => item.role === "admin").length;

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t(locale, "admin.subtitle")}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {t(locale, "admin.heading")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {t(locale, "admin.copy.description")}
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
              <div className="crm-card border-amber-200 bg-amber-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 sm:tracking-[0.12em]">
                  {t(locale, "admin.stat.pending")}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {pendingCount}
                </p>
              </div>
              <div className="crm-card border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:tracking-[0.12em]">
                  {t(locale, "admin.stat.approved")}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {approvedCount}
                </p>
              </div>
              <div className="crm-card border-blue-200 bg-blue-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700 sm:tracking-[0.12em]">
                  {t(locale, "admin.stat.admins")}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {adminCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="crm-card grid gap-3 p-4 text-sm text-slate-600 md:grid-cols-3">
          <p>
            <span className="font-semibold text-slate-950">
              {t(locale, "admin.stat.pending")}
            </span>{" "}
            {locale === "sq"
              ? "shohin vetëm ekranin e miratimit."
              : "users can only see the approval screen."}
          </p>
          <p>
            <span className="font-semibold text-slate-950">
              {getRoleLabel(locale, "viewer")} ({viewerCount})
            </span>{" "}
            {locale === "sq"
              ? "janë përdorues të jashtëm të miratuar me akses vetëm për lexim."
              : "are approved external users with read-only inventory access."}
          </p>
          <p>
            <span className="font-semibold text-slate-950">
              {locale === "sq" ? "Operatorët" : "Operators"}
            </span>{" "}
            {locale === "sq"
              ? "janë agjentët, menaxherët dhe adminët. Support menaxhon biletat pa akses më të gjerë."
              : "are agents, managers, and admins. Support users manage ticket triage without broader access."}
          </p>
        </div>

        {params.message ? (
          <div className="crm-card border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {error ? (
          <div className="crm-card border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error.message}
          </div>
        ) : null}

        <section className="crm-card overflow-hidden">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              {t(locale, "admin.userAccounts")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t(locale, "admin.usersIntro")}
            </p>
          </div>

          <div className="grid gap-3 p-3 sm:p-4">
            {profiles.length === 0 ? (
              <div className="crm-empty-state p-6 text-sm text-slate-500">
                {t(locale, "admin.usersEmpty")}
              </div>
            ) : null}

            {profiles.map((item) => {
              const approved =
                item.role !== "pending" &&
                item.account_status !== "pending_approval" &&
                item.account_status !== "disabled" &&
                item.account_status !== "rejected" &&
                item.account_status !== "deleted";
              const status = statusMap.get(item.id);
              const availabilityStatus = status?.status || "offline";
              const availabilityLabel = statusLabels[availabilityStatus];

              return (
                <div
                  className="crm-card-interactive grid gap-4 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_220px]"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          approved
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {approved ? (
                          <UserCheck className="h-3.5 w-3.5" />
                        ) : (
                          <UserRoundX className="h-3.5 w-3.5" />
                        )}
                        {approved ? t(locale, "admin.stat.approved") : t(locale, "admin.stat.pending")}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                        {getRoleLabel(locale, item.role)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getAvailabilityStatusToneClass(availabilityStatus)}`}
                        title={status?.status_message || availabilityLabel}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${getAvailabilityStatusDotClass(availabilityStatus)}`}
                        />
                        {availabilityLabel}
                      </span>
                      {item.role === "viewer" ? (
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                          {locale === "sq" ? "Vetëm lexim" : "Read-only"}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 break-words text-base font-semibold text-slate-950">
                      {item.full_name || item.id}
                    </h3>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      {item.id}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{locale === "sq" ? "U bashkua" : "Joined"} {formatDate(item.created_at, locale)}</span>
                      {item.phone ? <span>{item.phone}</span> : null}
                      <span className="font-mono">{item.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <form
                    action={updateUserRoleAction}
                    className="grid content-start gap-2"
                  >
                    <input name="profile_id" type="hidden" value={item.id} />
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-slate-400" />
                        {t(locale, "admin.role")}
                      </span>
                      <select
                        className="crm-input h-10 min-h-10 text-sm font-semibold capitalize text-slate-800"
                        defaultValue={item.role}
                        name="role"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {getRoleLabel(locale, role.value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="crm-button crm-button-primary h-10 min-h-10 px-4">
                      {t(locale, "admin.saveRole")}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}
