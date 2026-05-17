import Link from "next/link";
import { ArrowRightLeft, Plus } from "lucide-react";

import { createLinkedListingAction } from "@/app/properties/actions";
import {
  formatTransactionBadge,
  formatStatusLabel,
  getLinkedListingId,
  getLinkedListingNotice,
  getOppositeListingTransactionType,
  isRentalTransaction,
  type PropertyRecord,
  type PropertyTransactionType,
} from "@/lib/properties";
import type { Locale } from "@/lib/i18n";

type PropertyLinkedListingPanelProps = {
  canManage?: boolean;
  linkedListing?: {
    id: string;
    status: PropertyRecord["status"];
    title: string;
    transaction_type: PropertyTransactionType;
  } | null;
  locale: Locale;
  property: PropertyRecord;
};

export function PropertyLinkedListingPanel({
  canManage = true,
  linkedListing,
  locale,
  property,
}: PropertyLinkedListingPanelProps) {
  const inferredProperty = linkedListing
    ? {
        linked_rental_property_id: isRentalTransaction(property.transaction_type)
          ? property.linked_rental_property_id
          : linkedListing.id,
        linked_sale_property_id: isRentalTransaction(property.transaction_type)
          ? linkedListing.id
          : property.linked_sale_property_id,
        transaction_type: property.transaction_type,
      }
    : property;
  const linkedId = getLinkedListingId(property) || linkedListing?.id || null;
  const notice = getLinkedListingNotice(inferredProperty, locale);
  const targetTransactionType = getOppositeListingTransactionType(
    property.transaction_type,
  );

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
            <ArrowRightLeft className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {locale === "sq" ? "Aset i lidhur" : "Linked asset"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {notice.label}
            </p>
            {linkedListing ? (
              <p className="mt-1 break-words text-xs font-medium text-emerald-800">
                {linkedListing.title} ·{" "}
                {formatStatusLabel(linkedListing.status, locale)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-600">
              {locale === "sq"
                ? "Listimet mbeten te ndara: cmimet, statuset dhe ciklet e shitjes/qirase nuk ndryshojne njeri-tjetrin."
                : "Listings stay separate: prices, statuses, and sale/rental lifecycles do not overwrite each other."}
            </p>
          </div>
        </div>

        {linkedId && notice.href ? (
          <Link
            className="crm-button crm-button-secondary w-full sm:w-auto"
            href={notice.href}
            prefetch={false}
          >
            {notice.linkLabel}
          </Link>
        ) : canManage ? (
          <form action={createLinkedListingAction}>
            <input name="property_id" type="hidden" value={property.id} />
            <input
              name="target_transaction_type"
              type="hidden"
              value={targetTransactionType}
            />
            <button className="crm-button crm-button-success w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              {notice.linkLabel}
              <span className="sr-only">
                {" "}
                {formatTransactionBadge(targetTransactionType, locale)}
              </span>
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
