"use client";

import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowRight, CalendarPlus } from "lucide-react";

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
      className="group relative flex min-h-[150px] w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/70 to-cyan-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 xl:absolute xl:inset-y-4 xl:right-4 xl:w-[320px]"
      href={href}
      prefetch={false}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 opacity-95 transition duration-300 group-hover:scale-105 sm:-bottom-14 sm:-left-12 sm:h-52 sm:w-52"
      >
        <DotLottieReact
          autoplay
          className="h-full w-full"
          loop
          src="https://lottie.host/874c77df-3d74-4078-8035-3a581d58565e/hyPifMzCbR.lottie"
        />
      </span>

      <span className="relative z-10 flex h-full w-full flex-col justify-between gap-8">
        <span className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-emerald-700 shadow-sm ring-1 ring-emerald-100">
            <CalendarPlus className="h-3.5 w-3.5" />
            CRM
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </span>

        <span className="ml-auto max-w-[190px] text-right">
          <span className="block text-base font-bold leading-tight text-slate-950">
            {label}
          </span>
          {caption ? (
            <span className="mt-1 block text-xs font-semibold leading-snug text-slate-500">
              {caption}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
