"use client";

import Link from "next/link";

type CalendarOpenButtonProps = {
  href?: string;
  label: string;
};

export function CalendarOpenButton({
  href = "/appointments",
  label,
}: CalendarOpenButtonProps) {
  return (
    <Link
      aria-label={label}
      className="crm-button crm-button-secondary w-full sm:w-auto"
      href={href}
      prefetch={false}
    >
      {label}
    </Link>
  );
}
