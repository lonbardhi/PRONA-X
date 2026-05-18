import Link from "next/link";
import {
  Bell,
  ClipboardList,
  Landmark,
} from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { AddListingMenu } from "@/components/AddListingMenu";
import { AddPropertyIcon } from "@/components/AddPropertyIcon";
import { BrandLockup } from "@/components/BrandLogo";
import { CalendarIcon } from "@/components/CalendarIcon";
import { DashboardIcon } from "@/components/DashboardIcon";
import { DocumentIcon } from "@/components/DocumentIcon";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LeadsIcon } from "@/components/LeadsIcon";
import { LogoutIcon } from "@/components/LogoutIcon";
import { MessagesNavItem } from "@/components/messaging/MessagesNavItem";
import { ProfileWorkspacePanel } from "@/components/profile/ProfileWorkspacePanel";
import { RentalsIcon } from "@/components/RentalsIcon";
import { SalesIcon } from "@/components/SalesIcon";
import { SessionTimeout } from "@/components/SessionTimeout";
import { SupportIcon } from "@/components/SupportIcon";
import { Button, buttonVariants } from "@/components/ui/button";
import { UsersIcon } from "@/components/UsersIcon";
import { getAgentWorkspaceData } from "@/lib/agent-workspace-data";
import { t } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getUnreadMessagingCount } from "@/lib/messaging-data";
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
  const messagingUnreadCount = workspaceContext.user
    ? await getUnreadMessagingCount(workspaceContext.supabase, workspaceContext.user.id)
    : 0;
  const isViewer = userRole === "viewer";
  const isSupportOnly = userRole === "support";
  const showMobileQuickActions = !isViewer && !isSupportOnly;
  const navItems = isSupportOnly
    ? [{ label: t(locale, "nav.support"), href: "/support", icon: SupportIcon }]
    : isViewer
    ? [
        { label: t(locale, "nav.sales"), href: "/sales", icon: SalesIcon },
        { label: t(locale, "nav.rentals"), href: "/rentals", icon: RentalsIcon },
        { label: t(locale, "nav.requests"), href: "/requests", icon: ClipboardList },
        { label: t(locale, "nav.land"), href: "/sales?type=development_land", icon: Landmark },
        { label: t(locale, "nav.support"), href: "/support", icon: SupportIcon },
      ]
    : [
        { label: t(locale, "nav.dashboard"), href: "/dashboard", icon: DashboardIcon },
        { label: t(locale, "nav.sales"), href: "/sales", icon: SalesIcon },
        { label: t(locale, "nav.rentals"), href: "/rentals", icon: RentalsIcon },
        { label: t(locale, "nav.requests"), href: "/requests", icon: ClipboardList },
        { label: t(locale, "nav.calendar"), href: "/appointments", icon: CalendarIcon },
        { label: t(locale, "nav.documents"), href: "/documents", icon: DocumentIcon },
        { label: t(locale, "nav.messages"), href: "/messages", icon: null },
        { label: t(locale, "nav.sellerLeads"), href: "/seller-leads", icon: LeadsIcon },
        { label: t(locale, "nav.support"), href: "/support", icon: SupportIcon },
        ...(userRole === "admin"
          ? [{ label: t(locale, "nav.adminUsers"), href: "/admin/users", icon: UsersIcon }]
          : []),
      ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6">
          <BrandLockup subtitle={t(locale, "brand.subtitle")} />

          <nav className="crm-scroll-area order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1 lg:order-none lg:w-auto">
            {navItems.map((item) => {
              if (item.href === "/messages") {
                return (
                  <MessagesNavItem
                    key={item.href}
                    locale={locale}
                    unreadCount={messagingUnreadCount}
                  />
                );
              }

              const Icon = item.icon;

              return (
                <Link
                  className="crm-nav-link"
                  href={item.href}
                  key={item.label}
                  prefetch={false}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
            {isSupportOnly ? (
              <MessagesNavItem locale={locale} unreadCount={messagingUnreadCount} />
            ) : null}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {!isViewer && !isSupportOnly ? (
              <div className="hidden md:block">
                <AddListingMenu locale={locale} />
              </div>
            ) : null}
            <Link
              aria-label={t(locale, "notifications")}
              className="crm-icon-button hidden md:flex"
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
              <Button
                aria-label={t(locale, "pending.signOut")}
                className="rounded-full"
                size="icon"
                variant="outline"
              >
                <LogoutIcon className="h-6 w-6 object-contain" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <SessionTimeout />
      {showMobileQuickActions ? (
        <nav
          aria-label={locale === "sq" ? "Veprime te shpejta" : "Quick actions"}
          className="crm-scroll-area flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden"
        >
          <Link
            className={buttonVariants({
              className: "h-9 min-h-9 shrink-0 px-3 text-xs",
              size: "sm",
            })}
            href="/sales#add-property"
            prefetch={false}
          >
            <AddPropertyIcon className="h-4 w-4" />
            {locale === "sq" ? "Shto shitje" : "Add sale"}
          </Link>
          <Link
            className={buttonVariants({
              className: "h-9 min-h-9 shrink-0 px-3 text-xs",
              size: "sm",
              variant: "success",
            })}
            href="/rentals#add-property"
            prefetch={false}
          >
            <RentalsIcon className="h-4 w-4" />
            {locale === "sq" ? "Shto qira" : "Add rental"}
          </Link>
          <Link
            className={buttonVariants({
              className: "h-9 min-h-9 shrink-0 px-3 text-xs",
              size: "sm",
              variant: "secondary",
            })}
            href="/requests#add-request"
            prefetch={false}
          >
            <ClipboardList className="h-4 w-4" />
            {locale === "sq" ? "Kërkesë" : "Request"}
          </Link>
        </nav>
      ) : null}
      {children}
    </main>
  );
}

