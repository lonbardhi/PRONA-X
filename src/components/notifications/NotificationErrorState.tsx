import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

export function NotificationErrorState({
  locale,
  onRetry,
}: {
  locale: Locale;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">
            {locale === "sq"
              ? "Gabim gjate ngarkimit te njoftimeve"
              : "Could not load notifications"}
          </p>
          <p className="mt-1 text-xs text-rose-700">
            {locale === "sq"
              ? "Provo perseri ose vazhdo punen ne CRM."
              : "Try again or continue working in the CRM."}
          </p>
        </div>
      </div>
      <Button className="mt-3 h-9" onClick={onRetry} size="sm" variant="outline">
        <RefreshCw className="h-4 w-4" />
        {locale === "sq" ? "Provo perseri" : "Retry"}
      </Button>
    </div>
  );
}
