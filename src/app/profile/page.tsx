import { Bell, BriefcaseBusiness, ShieldCheck, User, Zap } from "lucide-react";

import {
  updateProfileDetailsAction,
} from "@/app/profile/actions";
import { ActivityFeed } from "@/components/profile/ActivityFeed";
import { AvailabilityStatusSelector } from "@/components/profile/AvailabilityStatusSelector";
import { PreferencesForm } from "@/components/profile/PreferencesForm";
import { TodayAgendaPreview } from "@/components/profile/TodayAgendaPreview";
import { UserNotificationsPreview } from "@/components/profile/UserNotificationsPreview";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import {
  agentWorkspaceMigrationMessage,
  formatWorkspaceDateTime,
  getAvailabilityStatusLabels,
  getInitials,
  isMissingAgentWorkspaceSchemaError,
} from "@/lib/agent-workspace";
import { getAgentWorkspaceData } from "@/lib/agent-workspace-data";
import { hasSupabaseEnv } from "@/lib/env";
import { getRoleLabel } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient, requireApprovedUser } from "@/lib/supabase/server";

type ProfilePageProps = {
  searchParams: Promise<{
    message?: string;
    section?: string;
  }>;
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

async function getWorkspaceSetupWarning(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { error } = await supabase
    .from("user_status")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  return isMissingAgentWorkspaceSchemaError(error) ? agentWorkspaceMigrationMessage : null;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const [workspace, setupWarning] = await Promise.all([
    getAgentWorkspaceData(supabase, user, profile),
    getWorkspaceSetupWarning(supabase, user.id),
  ]);
  const statusLabels = getAvailabilityStatusLabels(locale);
  const returnTo = `/profile${params.section ? `?section=${params.section}` : ""}`;
  const displayName = workspace.profile.full_name || user.email || "PRONA X";

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-lg font-bold text-white">
                {workspace.profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={displayName}
                    className="h-full w-full object-cover"
                    src={workspace.profile.avatar_url}
                  />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  <User className="h-3.5 w-3.5" />
                  {locale === "sq" ? "Hapesira e agjentit" : "Agent workspace"}
                </span>
                <h1 className="mt-3 break-words text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {locale === "sq"
                    ? "Menaxho statusin, takimet, njoftimet, preferencat dhe aktivitetin tend nga nje qender personale pune."
                    : "Manage your status, meetings, notifications, preferences, and activity from one personal command center."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {getRoleLabel(locale, profile.role)}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {statusLabels[workspace.status.status]}
                  </span>
                  {workspace.profile.agency_name ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {workspace.profile.agency_name}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              <StatCard
                label={locale === "sq" ? "Takime sot" : "Meetings today"}
                value={workspace.productivity.meetings_today}
              />
              <StatCard
                label={locale === "sq" ? "Ndjekje vonese" : "Overdue"}
                value={workspace.productivity.overdue_followups}
              />
              <StatCard
                label={locale === "sq" ? "Listime" : "Listings"}
                value={workspace.productivity.active_listings}
              />
              <StatCard
                label={locale === "sq" ? "Njoftime" : "Unread"}
                value={workspace.productivity.unread_notifications}
              />
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {isMissingAgentWorkspaceSchemaError({ message: params.message })
              ? agentWorkspaceMigrationMessage
              : params.message}
          </div>
        ) : null}

        {setupWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <strong className="font-semibold">
              {locale === "sq" ? "Nevojitet konfigurim Supabase:" : "Supabase setup needed:"}
            </strong>{" "}
            {setupWarning}
          </div>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Sot dhe urgjencat" : "Today and attention"}
                </h2>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="grid gap-3">
                  <h3 className="text-sm font-semibold text-slate-950">
                    {locale === "sq" ? "Agjenda e sotme" : "Today's agenda"}
                  </h3>
                  <TodayAgendaPreview
                    agenda={workspace.todayAgenda}
                    locale={locale}
                    profile={workspace.profile}
                    returnTo={returnTo}
                  />
                </div>
                <UserNotificationsPreview
                  locale={locale}
                  notifications={workspace.notifications}
                  returnTo={returnTo}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Detajet personale" : "Personal details"}
                </h2>
              </div>
              <form action={updateProfileDetailsAction} className="mt-4 grid gap-4">
                <input name="return_to" type="hidden" value={returnTo} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {locale === "sq" ? "Emri i plote" : "Full name"}
                    <input
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={workspace.profile.full_name || ""}
                      name="full_name"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {locale === "sq" ? "Telefoni" : "Phone"}
                    <input
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={workspace.profile.phone || ""}
                      name="phone"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {locale === "sq" ? "Agjencia / ekipi" : "Agency / team"}
                    <input
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={workspace.profile.agency_name || ""}
                      name="agency_name"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {locale === "sq" ? "URL e avatarit" : "Avatar URL"}
                    <input
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      defaultValue={workspace.profile.avatar_url || ""}
                      name="avatar_url"
                      type="url"
                    />
                  </label>
                </div>
                <button className="h-11 w-full rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-fit">
                  {locale === "sq" ? "Ruaj profilin" : "Save profile"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Preferencat" : "Preferences"}
                </h2>
              </div>
              <div className="mt-4">
                <PreferencesForm
                  locale={locale}
                  preferences={workspace.preferences}
                  returnTo={returnTo}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Aktiviteti" : "Activity feed"}
                </h2>
              </div>
              <div className="mt-4">
                <ActivityFeed activityLogs={workspace.activityLogs} locale={locale} />
              </div>
            </div>
          </section>

          <aside className="grid gap-5 xl:sticky xl:top-24">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-semibold text-slate-950">
                {locale === "sq" ? "Statusi aktual" : "Current status"}
              </h2>
              <div className="mt-4">
                <AvailabilityStatusSelector
                  locale={locale}
                  returnTo={returnTo}
                  status={workspace.status}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Siguria" : "Security"}
                </h2>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Email
                  </dt>
                  <dd className="mt-1 break-all font-medium text-slate-950">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {locale === "sq" ? "Roli" : "Role"}
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {getRoleLabel(locale, profile.role)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {locale === "sq" ? "Krijuar" : "Created"}
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {formatWorkspaceDateTime(user.created_at, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {locale === "sq" ? "Hyrja e fundit" : "Last login"}
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {formatWorkspaceDateTime(user.last_sign_in_at || null, locale)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-semibold text-slate-950">
                {locale === "sq" ? "Performanca" : "Performance"}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatCard
                  label={locale === "sq" ? "Takime jave" : "Week done"}
                  value={workspace.productivity.completed_meetings_this_week}
                />
                <StatCard
                  label={locale === "sq" ? "Lead aktive" : "Active leads"}
                  value={workspace.productivity.active_leads}
                />
                <StatCard
                  label={locale === "sq" ? "Mbyllur" : "Deals"}
                  value={workspace.metrics.deals_closed}
                />
                <StatCard
                  label={locale === "sq" ? "Komisione" : "Commissions"}
                  value="--"
                />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
