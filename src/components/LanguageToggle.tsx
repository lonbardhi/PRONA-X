"use client";

import { setLocaleAction } from "@/app/language/actions";
import { type Locale, t } from "@/lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
  returnTo?: string;
};

export function LanguageToggle({ locale, returnTo }: LanguageToggleProps) {
  return (
    <form
      action={setLocaleAction}
      aria-label={t(locale, "language.label")}
      className="inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-sm"
    >
      {returnTo ? <input name="return_to" type="hidden" value={returnTo} /> : null}
      {(["sq", "en"] as const).map((item) => {
        const active = item === locale;

        return (
          <button
            aria-pressed={active}
            className={`h-7 rounded-full px-2.5 text-xs font-bold uppercase tracking-[0.08em] transition ${
              active
                ? "bg-slate-950 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
            }`}
            key={item}
            name="locale"
            title={t(locale, item === "sq" ? "language.albanian" : "language.english")}
            type="submit"
            value={item}
          >
            {item === "sq" ? "SQ" : "EN"}
          </button>
        );
      })}
    </form>
  );
}
