"use client";

import { useState } from "react";
import { CircleDot } from "lucide-react";

import { updateAvailabilityStatusAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  availabilityStatuses,
  getAvailabilityStatusDotClass,
  getAvailabilityStatusLabels,
  getAvailabilityStatusToneClass,
  type AvailabilityStatus,
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
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>(
    status.status,
  );
  const statusLabels = getAvailabilityStatusLabels(locale);
  const quickStatuses: AvailabilityStatus[] = [
    "available",
    "away",
    "do_not_disturb",
    "offline",
  ];

  return (
    <form action={updateAvailabilityStatusAction} className="grid gap-2">
      <input name="return_to" type="hidden" value={returnTo} />
      <div className="flex flex-wrap gap-1.5">
        {quickStatuses.map((value) => {
          const active = selectedStatus === value;

          return (
            <button
              aria-pressed={active}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition ${
                active
                  ? getAvailabilityStatusToneClass(value)
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              key={value}
              onClick={() => setSelectedStatus(value)}
              type="button"
            >
              <span
                className={`h-2 w-2 rounded-full ${getAvailabilityStatusDotClass(value)}`}
              />
              {statusLabels[value]}
            </button>
          );
        })}
      </div>
      <Label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {locale === "sq" ? "Statusi i punes" : "Work status"}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            className="h-10 text-sm font-semibold normal-case tracking-normal"
            name="status"
            onChange={(event) =>
              setSelectedStatus(event.target.value as AvailabilityStatus)
            }
            value={selectedStatus}
          >
            {availabilityStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </Select>
          <Button className="h-10 min-h-10 px-3 text-sm normal-case tracking-normal">
            <CircleDot className="h-4 w-4" />
            {locale === "sq" ? "Ruaj" : "Save"}
          </Button>
        </div>
      </Label>
      <Input
        className="h-10 min-h-10 text-sm"
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
