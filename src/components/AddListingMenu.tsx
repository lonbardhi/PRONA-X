"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  Plus,
  Users,
} from "lucide-react";

import { AddPropertyIcon } from "@/components/AddPropertyIcon";
import { RentalsIcon } from "@/components/RentalsIcon";
import type { Locale } from "@/lib/i18n";

type AddListingMenuProps = {
  locale: Locale;
};

type AddAction = {
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

export function AddListingMenu({ locale }: AddListingMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSq = locale === "sq";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const primaryActions: AddAction[] = [
    {
      description: isSq ? "Listim me çmim shitjeje" : "Listing with sale pricing",
      href: "/sales#add-property",
      icon: AddPropertyIcon,
      label: isSq ? "Shto pronë për shitje" : "Add property for sale",
    },
    {
      description: isSq ? "Listim me qira dhe periudhë" : "Listing with rent and period",
      href: "/rentals#add-property",
      icon: RentalsIcon,
      label: isSq ? "Shto pronë me qira" : "Add rental property",
    },
  ];

  const requestActions: AddAction[] = [
    {
      description: isSq ? "Kërkesë klienti për blerje" : "Customer request to buy",
      href: "/requests?type=buyer#add-request",
      icon: Users,
      label: isSq ? "Shto kërkesë blerësi" : "Add buyer request",
    },
    {
      description: isSq ? "Kërkesë klienti për qira" : "Customer request to rent",
      href: "/requests?type=tenant#add-request",
      icon: ClipboardList,
      label: isSq ? "Shto kërkesë qiramarrësi" : "Add tenant request",
    },
  ];

  const assetActions: AddAction[] = [
    {
      description: isSq ? "Tokë ose projekt për shitje" : "Land or project for sale",
      href: "/sales?type=development_project#add-property",
      icon: Building2,
      label: isSq ? "Shto projekt zhvillimi" : "Add development project",
    },
    {
      description: isSq ? "Biznes për shitje ose qira" : "Business sale or rental flow",
      href: "/sales?type=business#add-property",
      icon: BriefcaseBusiness,
      label: isSq ? "Shto biznes" : "Add business",
    },
  ];

  const renderAction = (action: AddAction) => {
    const Icon = action.icon;

    return (
      <Link
        className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        href={action.href}
        key={action.href}
        onClick={() => setOpen(false)}
        prefetch={false}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-950">
            {action.label}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {action.description}
          </span>
        </span>
      </Link>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="crm-button crm-button-primary h-9 min-h-9 px-3 text-sm"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Plus className="h-4 w-4" />
        {isSq ? "Shto" : "Add"}
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
          role="menu"
        >
          <div className="grid gap-1">
            {primaryActions.map(renderAction)}
          </div>
          <div className="my-2 h-px bg-slate-100" />
          <div className="grid gap-1">
            {requestActions.map(renderAction)}
          </div>
          <div className="my-2 h-px bg-slate-100" />
          <div className="grid gap-1">
            {assetActions.map(renderAction)}
          </div>
          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            {isSq
              ? "Zgjidh fillimisht qëllimin. Shitjet, qiratë dhe kërkesat ruhen si procese të ndara."
              : "Choose the intent first. Sales, rentals, and requests stay as separate workflows."}
          </div>
        </div>
      ) : null}
    </div>
  );
}
