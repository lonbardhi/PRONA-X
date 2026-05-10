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
            className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue={status.status}
            name="status"
          >
            {availabilityStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold normal-case tracking-normal text-white transition hover:bg-slate-800">
            <CircleDot className="h-4 w-4" />
            {locale === "sq" ? "Ruaj" : "Save"}
          </button>
        </div>
      </label>
      <input
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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
