"use client";

import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
      className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:w-auto"
      href={href}
      prefetch={false}
    >
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-50 transition group-hover:bg-white"
      >
        <DotLottieReact
          autoplay
          className="h-8 w-8"
          loop
          src="https://lottie.host/874c77df-3d74-4078-8035-3a581d58565e/hyPifMzCbR.lottie"
        />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
