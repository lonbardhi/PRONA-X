"use client";

import { CircleDot } from "lucide-react";

import { updateAvailabilityStatusAction } from "@/app/profile/actions";
import {
  availabilityStatuses,
  getAvailabilityStatusLabels,
  type UserStatus,
} from "@/lib/agent-workspace";
import type { Locale } from "@/lib/i18n";

type AvailabilityStatusSelectorProps = {
  locale: Locale;
  returnTo: string;
  status: UserStatus;
};

export function AvailabilityStatusSelector({
  locale,
  returnTo,
  status,
}: AvailabilityStatusSelectorProps) {
  const statusLabels = getAvailabilityStatusLabels(locale);

  return (
    <form action={updateAvailabilityStatusAction} className="grid gap-2">
      <input name="return_to" type="hidden" value={returnTo} />
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {locale === "sq" ? "Statusi i punes" : "Work status"}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select
            className="crm-input h-10 min-h-10 min-w-0 text-sm font-semibold normal-case tracking-normal text-slate-800"
            defaultValue={status.status}
            name="status"
          >
            {availabilityStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
          <button className="crm-button crm-button-primary h-10 min-h-10 px-3 text-sm normal-case tracking-normal">
            <CircleDot className="h-4 w-4" />
            {locale === "sq" ? "Ruaj" : "Save"}
          </button>
        </div>
      </label>
      <input
        className="crm-input h-10 min-h-10 text-sm text-slate-800"
        defaultValue={status.status_message || ""}
        maxLength={160}
        name="status_message"
        placeholder={
          locale === "sq"
            ? "Shenim i shkurter, p.sh. Ne vizite deri ne 15:30"
            : "Short note, e.g. At a viewing until 15:30"
        }
      />
    </form>
  );
}
