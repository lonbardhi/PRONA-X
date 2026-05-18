"use client";

import { CircleDot } from "lucide-react";

import { updateAvailabilityStatusAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
      <Label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {locale === "sq" ? "Statusi i punes" : "Work status"}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            className="h-10 text-sm font-semibold normal-case tracking-normal"
            defaultValue={status.status}
            name="status"
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
