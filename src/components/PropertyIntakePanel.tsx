"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { defaultLocale, type Locale } from "@/lib/i18n";

type PropertyIntakePanelProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  locale?: Locale;
};

export function PropertyIntakePanel({
  children,
  defaultOpen = false,
  locale = defaultLocale,
}: PropertyIntakePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  useEffect(() => {
    function openFromHash() {
      if (window.location.hash === "#add-property") {
        setIsOpen(true);
      }
    }

    function openFromAddPropertyLink(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (anchor instanceof HTMLAnchorElement && anchor.hash === "#add-property") {
        setIsOpen(true);
      }
    }

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", openFromAddPropertyLink);

    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", openFromAddPropertyLink);
    };
  }, []);

  return (
    <section
      className="crm-card overflow-hidden"
      id="add-property"
    >
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:gap-4 sm:p-5"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Plus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {locale === "sq" ? "Regjistrim shitjeje" : "Sales intake"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {locale === "sq" ? "Shto pronë" : "Add property"}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-slate-500 md:inline">
            {isOpen
              ? locale === "sq"
                ? "Mbyll formularin"
                : "Collapse form"
              : locale === "sq"
                ? "Hap formularin"
                : "Open form"}
          </span>
          <span className="crm-icon-button h-9 min-h-9 w-9">
            <ChevronDown
              className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
            />
          </span>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        id={contentId}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 p-4 sm:p-5">
            <div className="mb-5 max-w-3xl text-sm leading-6 text-slate-500">
              {locale === "sq"
                ? "Regjistrimet e reja futen në të njëjtin inventar të kërkueshëm dhe mund të filtrohen, shpërndahen, përditësohen ose arkivohen ndërsa portofoli rritet."
                : "New records enter the same searchable inventory and can be filtered, shared, updated, or archived as the portfolio grows."}
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
