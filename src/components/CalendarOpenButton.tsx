"use client";

import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowRight } from "lucide-react";

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
      className="group inline-flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:w-auto sm:min-w-60"
      href={href}
      prefetch={false}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 transition group-hover:bg-white"
        >
          <DotLottieReact
            autoplay
            className="h-14 w-14 scale-125"
            loop
            src="https://lottie.host/874c77df-3d74-4078-8035-3a581d58565e/hyPifMzCbR.lottie"
          />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
      />
    </Link>
  );
}
