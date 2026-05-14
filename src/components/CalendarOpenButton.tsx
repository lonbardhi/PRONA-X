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
      className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:w-auto"
      href={href}
      prefetch={false}
    >
      {label}
    </Link>
  );
}
