"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ListChecks,
  MessageSquareText,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { LogoutIcon } from "@/components/LogoutIcon";
import { PronaAvatar } from "@/components/PronaAvatar";
import {
  formatWorkspaceDateTime,
  getAvailabilityStatusLabels,
  getAvailabilityStatusToneClass,
  type AgentWorkspaceData,
} from "@/lib/agent-workspace";
import { getRoleLabel, type Locale } from "@/lib/i18n";
import { ActivityFeed } from "@/components/profile/ActivityFeed";
import { AvailabilityStatusSelector } from "@/components/profile/AvailabilityStatusSelector";
import { ProfileAvatarButton } from "@/components/profile/ProfileAvatarButton";
import { QuickActionsGrid } from "@/components/profile/QuickActionsGrid";
import { TodayAgendaPreview } from "@/components/profile/TodayAgendaPreview";
import { UserNotificationsPreview } from "@/components/profile/UserNotificationsPreview";

type ProfileWorkspacePanelProps = {
  data: AgentWorkspaceData;
  locale: Locale;
};

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="crm-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function ProfileWorkspacePanel({ data, locale }: ProfileWorkspacePanelProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const statusLabels = getAvailabilityStatusLabels(locale);
  const unreadCount = data.productivity.unread_notifications;
  const displayName = data.profile.full_name || data.profile.email || "PRONA X";
  const returnTo = "/profile";
  const role = String(data.profile.role);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const scrollY = window.scrollY;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const baseLinks = [
    { href: "/profile", icon: User, label: locale === "sq" ? "Profili im" : "My Profile" },
    { href: "/profile?section=settings", icon: Settings, label: locale === "sq" ? "Cilesimet" : "Settings" },
    { href: "/profile?section=security", icon: ShieldCheck, label: locale === "sq" ? "Siguria" : "Security" },
  ];
  const operatorLinks = [
    { href: "/appointments", icon: CalendarDays, label: locale === "sq" ? "Takimet e mia" : "My Meetings" },
    { href: "/messages", icon: MessageSquareText, label: locale === "sq" ? "Mesazhet" : "Messages" },
    { href: "/seller-leads", icon: BriefcaseBusiness, label: locale === "sq" ? "Lead-et e mia" : "My Leads" },
    { href: "/requests", icon: ListChecks, label: locale === "sq" ? "Kërkesat e mia" : "My Requests" },
    { href: "/sales", icon: BriefcaseBusiness, label: locale === "sq" ? "Pronat e mia" : "My Properties" },
    { href: "/profile?section=tasks", icon: ListChecks, label: locale === "sq" ? "Detyrat e mia" : "My Tasks" },
    { href: "/profile?section=commissions", icon: BarChart3, label: locale === "sq" ? "Komisionet" : "My Commissions" },
    { href: "/profile?section=performance", icon: BarChart3, label: locale === "sq" ? "Performanca" : "Performance" },
  ];
  const viewerLinks = [
    { href: "/sales", icon: BriefcaseBusiness, label: locale === "sq" ? "Shitje" : "Sales" },
    { href: "/rentals", icon: BriefcaseBusiness, label: locale === "sq" ? "Qira" : "Rentals" },
    { href: "/requests", icon: ListChecks, label: locale === "sq" ? "Kërkesa" : "Requests" },
    { href: "/sales?type=development_land", icon: BriefcaseBusiness, label: locale === "sq" ? "Toke" : "Land" },
  ];
  const supportLinks = [
    { href: "/support", icon: ListChecks, label: locale === "sq" ? "Support" : "Support" },
    { href: "/messages", icon: MessageSquareText, label: locale === "sq" ? "Mesazhet" : "Messages" },
  ];
  const links = [
    ...baseLinks,
    ...(["admin", "manager", "agent"].includes(role) ? operatorLinks : []),
    ...(role === "viewer" ? viewerLinks : []),
    ...(role === "support" ? supportLinks : []),
  ];

  const profilePanel =
    open
      ? createPortal(
        <div
          aria-label={locale === "sq" ? "Paneli i profilit" : "Profile workspace"}
          className="crm-modal-backdrop fixed inset-0 z-[80] flex h-[100dvh] min-h-[100svh] bg-slate-950/35 p-0 backdrop-blur-sm md:items-start md:justify-end md:bg-transparent md:p-6 md:pt-20 md:backdrop-blur-none"
          role="dialog"
        >
          <div
            className="crm-modal-panel flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-slate-50 shadow-2xl md:h-auto md:max-h-[calc(100dvh-6rem)] md:w-[440px] md:rounded-2xl md:border md:border-slate-200"
            ref={panelRef}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 gap-3">
                <PronaAvatar
                  alt={displayName}
                  email={data.profile.email}
                  name={data.profile.full_name}
                  shape="rounded"
                  size="lg"
                  src={data.profile.avatar_url}
                  status={data.status.status}
                  statusLabel={statusLabels[data.status.status]}
                />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-950">
                    {displayName}
                  </h2>
                  <p className="truncate text-xs text-slate-500">{data.profile.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getAvailabilityStatusToneClass(data.status.status)}`}
                    >
                      {statusLabels[data.status.status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {getRoleLabel(locale, String(data.profile.role))}
                    </span>
                  </div>
                  {data.profile.agency_name ? (
                    <p className="mt-2 text-xs text-slate-500">{data.profile.agency_name}</p>
                  ) : null}
                </div>
              </div>
              <button
                aria-label={locale === "sq" ? "Mbyll" : "Close"}
                className="crm-icon-button h-9 min-h-9 w-9 shrink-0"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch]">
              <section className="crm-card p-3">
                <AvailabilityStatusSelector
                  locale={locale}
                  returnTo={returnTo}
                  status={data.status}
                />
                {data.status.updated_at ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {locale === "sq" ? "Perditesuar" : "Updated"}{" "}
                    {formatWorkspaceDateTime(data.status.updated_at, locale)}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-950">
                    {locale === "sq" ? "Agjenda sot" : "Today's agenda"}
                  </h3>
                  <Link className="text-xs font-semibold text-emerald-700" href="/appointments">
                    {locale === "sq" ? "Kalendari" : "Calendar"}
                  </Link>
                </div>
                <TodayAgendaPreview
                  agenda={data.todayAgenda}
                  locale={locale}
                  profile={data.profile}
                  returnTo={returnTo}
                />
              </section>

              <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Veprime te shpejta" : "Quick actions"}
                </h3>
                <QuickActionsGrid locale={locale} role={role} />
              </section>

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Produktiviteti" : "Productivity"}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label={locale === "sq" ? "Sot" : "Today"}
                    value={data.productivity.meetings_today}
                  />
                  <MetricCard
                    label={locale === "sq" ? "Ndjekje vonese" : "Overdue"}
                    value={data.productivity.overdue_followups}
                  />
                  <MetricCard
                    label={locale === "sq" ? "Listime aktive" : "Listings"}
                    value={data.productivity.active_listings}
                  />
                  <MetricCard
                    label={locale === "sq" ? "Njoftime" : "Unread"}
                    value={data.productivity.unread_notifications}
                  />
                </div>
              </section>

              <UserNotificationsPreview
                locale={locale}
                notifications={data.notifications}
                returnTo={returnTo}
              />

              <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Hapesira ime" : "My workspace"}
                </h3>
                <div className="crm-card grid gap-1 p-2">
                  {links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        className="crm-nav-link justify-start rounded-lg px-3 py-2 text-sm font-medium text-slate-700"
                        href={link.href}
                        key={link.href}
                        prefetch={false}
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Aktiviteti i fundit" : "Recent activity"}
                </h3>
                <ActivityFeed activityLogs={data.activityLogs.slice(0, 3)} locale={locale} />
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <form action={signOutAction}>
                <button className="crm-button crm-button-primary w-full rounded-xl">
                  <LogoutIcon className="h-6 w-6 object-contain" />
                  {locale === "sq" ? "Dil nga llogaria" : "Logout"}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body,
      )
      : null;

  return (
    <div className="relative" ref={triggerRef}>
      <ProfileAvatarButton
        onClick={() => setOpen((value) => !value)}
        profile={data.profile}
        status={data.status.status}
        statusLabel={statusLabels[data.status.status]}
        unreadCount={unreadCount}
      />
      {profilePanel}
    </div>
  );
}
