"use client";

import Image from "next/image";

import { setLocaleAction } from "@/app/language/actions";
import { type Locale, t } from "@/lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
  returnTo?: string;
};

const languageOptions = [
  {
    locale: "sq",
    src: "/brand/flag-albania.png",
    labelKey: "language.albanian",
  },
  {
    locale: "en",
    src: "/brand/flag-united-kingdom.png",
    labelKey: "language.english",
  },
] as const;

export function LanguageToggle({ locale, returnTo }: LanguageToggleProps) {
  return (
    <form
      action={setLocaleAction}
      aria-label={t(locale, "language.label")}
      className="inline-flex h-10 shrink-0 items-center gap-1 overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-sm"
    >
      {returnTo ? <input name="return_to" type="hidden" value={returnTo} /> : null}
      {languageOptions.map((item) => {
        const active = item.locale === locale;
        const label = t(locale, item.labelKey);

        return (
          <button
            aria-pressed={active}
            aria-label={label}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 ${
              active
                ? "bg-slate-950 shadow-sm ring-2 ring-slate-950 ring-offset-1"
                : "hover:bg-slate-50"
            }`}
            key={item.locale}
            name="locale"
            title={label}
            type="submit"
            value={item.locale}
          >
            <Image
              alt=""
              aria-hidden="true"
              className="h-6 w-6 rounded-full object-cover"
              height={24}
              priority={false}
              src={item.src}
              width={24}
            />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </form>
  );
}
