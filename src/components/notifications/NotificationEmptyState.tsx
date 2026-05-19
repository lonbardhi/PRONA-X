import { BellOff } from "lucide-react";

import type { Locale } from "@/lib/i18n";

export function NotificationEmptyState({ locale }: { locale: Locale }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
        <BellOff className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-900">
        {locale === "sq" ? "Nuk ka njoftime te reja" : "No new notifications"}
      </p>
      <p className="mt-1 max-w-64 text-xs text-slate-500">
        {locale === "sq"
          ? "Kur dicka kerkon vemendje ne CRM, do te shfaqet ketu."
          : "When something needs attention in the CRM, it will appear here."}
      </p>
    </div>
  );
}
