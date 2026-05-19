"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  Plus,
  Users,
  X,
} from "lucide-react";

import { AddPropertyIcon } from "@/components/AddPropertyIcon";
import { RentalsIcon } from "@/components/RentalsIcon";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

type AddActionGroup = {
  actions: AddAction[];
  title: string;
};

export function AddListingMenu({ locale }: AddListingMenuProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSq = locale === "sq";

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

  const actionGroups: AddActionGroup[] = [
    {
      actions: primaryActions,
      title: isSq ? "Prona" : "Properties",
    },
    {
      actions: requestActions,
      title: isSq ? "Kërkesa" : "Requests",
    },
    {
      actions: assetActions,
      title: isSq ? "Speciale" : "Special",
    },
  ];

  const closeMenus = () => {
    setDesktopOpen(false);
    setMobileOpen(false);
  };

  const renderAction = (action: AddAction, mode: "desktop" | "mobile") => {
    const Icon = action.icon;

    return (
      <Link
        className={[
          "group flex items-center gap-3 rounded-xl text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
          mode === "mobile" ? "min-h-14 px-3 py-3" : "min-h-12 px-3 py-2",
        ].join(" ")}
        href={action.href}
        key={action.href}
        onClick={closeMenus}
        prefetch={false}
      >
        <span
          className={[
            "flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700",
            mode === "mobile" ? "h-11 w-11" : "h-9 w-9",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block break-words text-sm font-semibold leading-5 text-slate-950">
            {action.label}
          </span>
          <span className="block break-words text-xs leading-5 text-slate-500">
            {action.description}
          </span>
        </span>
      </Link>
    );
  };

  const renderGroups = (mode: "desktop" | "mobile") => (
    <div className={mode === "mobile" ? "grid gap-4" : "grid gap-3"}>
      {actionGroups.map((group) => (
        <section className="grid gap-1" key={group.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {group.title}
          </p>
          <div className="grid gap-1">
            {group.actions.map((action) => renderAction(action, mode))}
          </div>
        </section>
      ))}
    </div>
  );

  const helperText = isSq
    ? "Zgjidh çfarë dëshiron të krijosh. Shitjet, qiratë dhe kërkesat ruhen në module të ndara."
    : "Choose what you want to create. Sales, rentals, and requests stay in separate modules.";

  const renderTrigger = () => (
    <button
      aria-label={isSq ? "Hap menunë Shto" : "Open Add menu"}
      className="crm-button crm-button-primary h-9 min-h-9 px-3 text-sm"
      type="button"
    >
      <Plus className="h-4 w-4" />
      {isSq ? "Shto" : "Add"}
      <ChevronDown className="h-4 w-4" />
    </button>
  );

  return (
    <>
      <div className="hidden md:block">
        <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
          <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl border-slate-200 bg-white p-2 shadow-xl"
            side="bottom"
            sideOffset={8}
          >
            <div className="grid gap-3">
              {renderGroups("desktop")}
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                {helperText}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerTrigger asChild>{renderTrigger()}</DrawerTrigger>
          <DrawerContent className="max-h-[86dvh] rounded-t-2xl">
            <DrawerHeader className="border-b border-slate-100 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle>{isSq ? "Shto" : "Add"}</DrawerTitle>
                  <DrawerDescription className="mt-1 leading-5">
                    {helperText}
                  </DrawerDescription>
                </div>
                <button
                  aria-label={isSq ? "Mbyll menunë" : "Close menu"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                  onClick={() => setMobileOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DrawerHeader>
            <div className="overflow-y-auto px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {renderGroups("mobile")}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
