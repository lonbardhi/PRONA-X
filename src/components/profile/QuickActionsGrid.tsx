import Link from "next/link";
import { Building2, CalendarPlus, ListChecks, Plus, UserPlus } from "lucide-react";

import type { Locale } from "@/lib/i18n";

type QuickActionsGridProps = {
  locale: Locale;
  role: string;
};

export function QuickActionsGrid({ locale, role }: QuickActionsGridProps) {
  const isOperator = ["admin", "manager", "agent"].includes(role);
  const isSupportOnly = role === "support";
  const actions = isSupportOnly
    ? [
        {
          href: "/support",
          icon: ListChecks,
          label: locale === "sq" ? "Biletat support" : "Support tickets",
        },
        {
          href: "/profile?section=notifications",
          icon: CalendarPlus,
          label: locale === "sq" ? "Njoftime" : "Notifications",
        },
      ]
    : isOperator
    ? [
        {
          href: "/appointments#new-appointment",
          icon: CalendarPlus,
          label: locale === "sq" ? "Takim i ri" : "Add meeting",
        },
        {
          href: "/seller-leads",
          icon: UserPlus,
          label: locale === "sq" ? "Lead i ri" : "Add lead",
        },
        {
          href: "/sales#add-property",
          icon: Plus,
          label: locale === "sq" ? "Prone e re" : "Add property",
        },
        {
          href: "/profile?section=tasks",
          icon: ListChecks,
          label: locale === "sq" ? "Ndjekje" : "Follow-up task",
        },
        {
          href: "/appointments",
          icon: CalendarPlus,
          label: locale === "sq" ? "Kalendari" : "Calendar",
        },
        {
          href: "/sales",
          icon: Building2,
          label: locale === "sq" ? "Listimet e mia" : "My listings",
        },
      ]
    : [
        {
          href: "/sales",
          icon: Building2,
          label: locale === "sq" ? "Shitje" : "Sales",
        },
        {
          href: "/rentals",
          icon: Building2,
          label: locale === "sq" ? "Qira" : "Rentals",
        },
        {
          href: "/sales?type=development_land",
          icon: Building2,
          label: locale === "sq" ? "Toke" : "Land",
        },
        {
          href: "/support",
          icon: ListChecks,
          label: locale === "sq" ? "Ndihme" : "Support",
        },
      ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            className="flex min-h-16 items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            href={action.href}
            key={action.href}
            prefetch={false}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon className="h-4 w-4" />
            </span>
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
