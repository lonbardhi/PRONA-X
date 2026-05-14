"use client";

import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowRight } from "lucide-react";

type CalendarOpenButtonProps = {
  caption?: string;
  href?: string;
  label: string;
};

export function CalendarOpenButton({
  caption,
  href = "/appointments",
  label,
}: CalendarOpenButtonProps) {
  return (
    <Link
      aria-label={label}
      className="group inline-flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/70 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:w-[260px]"
      href={href}
      prefetch={false}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 transition group-hover:bg-white"
        >
          <DotLottieReact
            autoplay
            className="h-16 w-16 scale-125"
            loop
            src="https://lottie.host/874c77df-3d74-4078-8035-3a581d58565e/hyPifMzCbR.lottie"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-950">
            {label}
          </span>
          {caption ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
              {caption}
            </span>
          ) : null}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
      />
    </Link>
  );
}
