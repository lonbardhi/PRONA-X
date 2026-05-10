import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarDays,
  Home,
  Landmark,
  LifeBuoy,
  LogOut,
  Plus,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { BrandLockup } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProfileWorkspacePanel } from "@/components/profile/ProfileWorkspacePanel";
import { SessionTimeout } from "@/components/SessionTimeout";
import { getAgentWorkspaceData } from "@/lib/agent-workspace-data";
import { t } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getCurrentUserWithProfile } from "@/lib/supabase/server";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  userRole?: string | null;
};

export async function DashboardShell({
  children,
  userEmail,
  userRole,
}: DashboardShellProps) {
  const locale = await getCurrentLocale();
  const workspaceContext = await getCurrentUserWithProfile();
  const workspaceData =
    workspaceContext.user && workspaceContext.profile
      ? await getAgentWorkspaceData(
          workspaceContext.supabase,
          workspaceContext.user,
          workspaceContext.profile,
        )
      : null;
  const isViewer = userRole === "viewer";
  const isSupportOnly = userRole === "support";
  const navItems = isSupportOnly
    ? [{ label: t(locale, "nav.support"), href: "/support", icon: LifeBuoy }]
    : isViewer
    ? [
        { label: t(locale, "nav.sales"), href: "/sales", icon: Building2 },
        { label: t(locale, "nav.rentals"), href: "/sales?status=rented", icon: Building2 },
        { label: t(locale, "nav.land"), href: "/sales?type=development_land", icon: Landmark },
        { label: t(locale, "nav.support"), href: "/support", icon: LifeBuoy },
      ]
    : [
        { label: t(locale, "nav.dashboard"), href: "/dashboard", icon: Home },
        { label: t(locale, "nav.sales"), href: "/sales", icon: Building2 },
        { label: t(locale, "nav.rentals"), href: "/rentals", icon: Building2 },
        { label: t(locale, "nav.calendar"), href: "/appointments", icon: CalendarDays },
        { label: t(locale, "nav.sellerLeads"), href: "/seller-leads", icon: UserPlus },
        { label: t(locale, "nav.addProperty"), href: "/sales#add-property", icon: Plus },
        { label: t(locale, "nav.support"), href: "/support", icon: LifeBuoy },
        ...(userRole === "admin"
          ? [{ label: t(locale, "nav.adminUsers"), href: "/admin/users", icon: ShieldCheck }]
          : []),
      ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6">
          <BrandLockup />

          <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:order-none lg:w-auto [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
                  href={item.href}
                  key={item.label}
                  prefetch={false}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              aria-label={t(locale, "notifications")}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 md:flex"
              href="/profile?section=notifications"
              prefetch={false}
            >
              <Bell className="h-4 w-4" />
            </Link>
            <div className="hidden max-w-56 text-right lg:block">
              <p className="text-sm font-medium text-slate-900">
                {workspaceData?.profile.full_name || userEmail}
              </p>
              <p className="text-xs text-slate-500">{t(locale, "account.workspace")}</p>
            </div>
            <LanguageToggle locale={locale} />
            {workspaceData ? (
              <ProfileWorkspacePanel data={workspaceData} locale={locale} />
            ) : null}
            <form action={signOutAction}>
              <button
                aria-label={t(locale, "pending.signOut")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <SessionTimeout />
      {children}
    </main>
  );
}

