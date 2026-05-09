import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarDays,
  Home,
  Landmark,
  LogOut,
  Plus,
  ShieldCheck,
  UserPlus,
  UserCircle,
} from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { BrandLockup } from "@/components/BrandLogo";
import { SessionTimeout } from "@/components/SessionTimeout";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  userRole?: string | null;
};

export function DashboardShell({
  children,
  userEmail,
  userRole,
}: DashboardShellProps) {
  const isViewer = userRole === "viewer";
  const navItems = isViewer
    ? [
        { label: "Sales", href: "/sales", icon: Building2 },
        { label: "Rentals", href: "/sales?status=rented", icon: Building2 },
        { label: "Land", href: "/sales?type=development_land", icon: Landmark },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Sales", href: "/sales", icon: Building2 },
        { label: "Rentals", href: "/rentals", icon: Building2 },
        { label: "Calendar", href: "/appointments", icon: CalendarDays },
        { label: "Seller Leads", href: "/seller-leads", icon: UserPlus },
        { label: "Add Property", href: "/sales#add-property", icon: Plus },
        ...(userRole === "admin"
          ? [{ label: "Admin Users", href: "/admin/users", icon: ShieldCheck }]
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
            <a
              className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
              href="mailto:support@pronax.al"
            >
              Support
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Notifications"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 md:flex"
              type="button"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden max-w-56 text-right lg:block">
              <p className="text-sm font-medium text-slate-900">{userEmail}</p>
              <p className="text-xs text-slate-500">Workspace account</p>
            </div>
            <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 md:flex">
              <UserCircle className="h-5 w-5" />
            </span>
            <form action={signOutAction}>
              <button
                aria-label="Sign out"
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

