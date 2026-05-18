import Link from "next/link";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronDown,
  Euro,
  Filter,
  MapPin,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { defaultLocale, type Locale, t } from "@/lib/i18n";
import {
  formatPropertyType,
  formatRentPeriodLabel,
  formatStatusLabel,
  getPropertyWorkflowStatuses,
  propertyTypes,
  rentPeriods,
  type PropertyModule,
} from "@/lib/properties";
import {
  getActivePropertyFilterCount,
  type PropertyFilters as PropertyFilterState,
} from "@/lib/property-filters";
import { getCanonicalAlbaniaLocation } from "@/lib/albania-locations";

type PropertyFiltersProps = {
  cities: string[];
  filters: PropertyFilterState;
  locale?: Locale;
  module?: PropertyModule;
};

function getModulePath(module: PropertyModule) {
  return module === "rentals" ? "/rentals" : "/sales";
}

function HiddenSearchFields({ filters }: { filters: PropertyFilterState }) {
  return (
    <>
      {filters.q ? <input name="q" type="hidden" value={filters.q} /> : null}
      <input name="sort" type="hidden" value={filters.sort} />
    </>
  );
}

function FilterHeader({
  activeFilterCount,
  compact = false,
  locale = defaultLocale,
  module = "sales",
}: {
  activeFilterCount: number;
  compact?: boolean;
  locale?: Locale;
  module?: PropertyModule;
}) {
  const isRental = module === "rentals";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Filter className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">
          {compact
            ? t(locale, "property.filters")
            : isRental
              ? locale === "sq"
                ? "Filtra qiraje"
                : "Rental filters"
              : t(locale, "property.salesFilters")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {activeFilterCount} {locale === "sq" ? "aktiv" : "active"}
        </p>
      </div>
    </div>
  );
}

function FilterControls({
  cities,
  filters,
  locale = defaultLocale,
  module = "sales",
}: PropertyFiltersProps) {
  const isRental = module === "rentals";
  const statuses = getPropertyWorkflowStatuses(isRental ? "rent" : "sale");
  const selectedCity = getCanonicalAlbaniaLocation(filters.city);

  return (
    <>
      <HiddenSearchFields filters={filters} />

      <div className="grid gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Euro className="h-4 w-4 text-muted-foreground" />
          {isRental
            ? locale === "sq"
              ? "Qiraja"
              : "Rent"
            : locale === "sq"
              ? "Çmimi i shitjes"
              : "Sale price"}
        </div>
        <div className="grid grid-cols-2 gap-2 max-[380px]:grid-cols-1">
          <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
            {locale === "sq" ? "Min EUR" : "Min EUR"}
            <Input
              className="h-10 text-sm"
              defaultValue={filters.minPrice}
              min="0"
              name="minPrice"
              placeholder={isRental ? "500" : "100000"}
              step={isRental ? "50" : "1000"}
              type="number"
            />
          </Label>
          <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
            {locale === "sq" ? "Max EUR" : "Max EUR"}
            <Input
              className="h-10 text-sm"
              defaultValue={filters.maxPrice}
              min="0"
              name="maxPrice"
              placeholder={isRental ? "1500" : "750000"}
              step={isRental ? "50" : "1000"}
              type="number"
            />
          </Label>
        </div>
      </div>

      {isRental ? (
        <div className="grid gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {locale === "sq" ? "Periudha e qirasë" : "Rent period"}
          </div>
          <Select
            className="h-10 text-sm"
            defaultValue={filters.rentPeriod}
            name="rentPeriod"
          >
            <option value="">{locale === "sq" ? "Të gjitha periudhat" : "All periods"}</option>
            {rentPeriods.map((period) => (
              <option key={period} value={period}>
                {formatRentPeriodLabel(period, locale)}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="grid gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {locale === "sq" ? "Lloji i pronës" : "Property type"}
        </div>
        <div className="grid gap-2">
          {propertyTypes.map((type) => {
            const typeInputId = `${module}-property-type-${type}`;

            return (
              <div className="flex items-center gap-2" key={type}>
                <Checkbox
                  id={typeInputId}
                  defaultChecked={filters.types.includes(type)}
                  name="type"
                  value={type}
                />
                <Label
                  className="cursor-pointer text-sm font-normal text-foreground"
                  htmlFor={typeInputId}
                >
                  {formatPropertyType(type, locale)}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {locale === "sq" ? "Qyteti / lokacioni" : "City / location"}
        </div>
        <Select
          className="h-10 text-sm"
          defaultValue={selectedCity}
          name="city"
        >
          <option value="">{locale === "sq" ? "Të gjitha lokacionet" : "All locations"}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BedDouble className="h-4 w-4 text-muted-foreground" />
          {locale === "sq" ? "Dhomat e pronës" : "Property rooms"}
        </div>
        <Select
          className="h-10 text-sm"
          defaultValue={filters.minBedrooms}
          name="minBedrooms"
        >
          <option value="">{locale === "sq" ? "Çdo numër dhomash" : "Any bedrooms"}</option>
          <option value="1">1+ {locale === "sq" ? "dhomë" : "bedroom"}</option>
          <option value="2">2+ {locale === "sq" ? "dhoma" : "bedrooms"}</option>
          <option value="3">3+ {locale === "sq" ? "dhoma" : "bedrooms"}</option>
          <option value="4">4+ {locale === "sq" ? "dhoma" : "bedrooms"}</option>
        </Select>
      </div>

      <div className="grid gap-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {isRental
            ? locale === "sq"
              ? "Statusi i qirasë"
              : "Rental status"
            : locale === "sq"
              ? "Statusi i shitjes"
              : "Sale status"}
        </div>
        <div className="grid gap-2">
          {statuses.map((status) => {
            const statusInputId = `${module}-property-status-${status}`;

            return (
              <div className="flex items-center gap-2" key={status}>
                <Checkbox
                  id={statusInputId}
                  defaultChecked={filters.statuses.includes(status)}
                  name="status"
                  value={status}
                />
                <Label
                  className="cursor-pointer text-sm font-normal text-foreground"
                  htmlFor={statusInputId}
                >
                  {formatStatusLabel(status, locale)}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <Button className="h-10 min-h-10 w-full" type="submit">
          <Filter className="h-4 w-4" />
          {locale === "sq" ? "Apliko filtrat" : "Apply filters"}
        </Button>
      </div>
    </>
  );
}

export function PropertyFilters({
  cities,
  filters,
  locale = defaultLocale,
  module = "sales",
}: PropertyFiltersProps) {
  const activeFilterCount = getActivePropertyFilterCount(filters);
  const modulePath = getModulePath(module);

  return (
    <>
      <details className="crm-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
          <FilterHeader
            activeFilterCount={activeFilterCount}
            compact
            locale={locale}
            module={module}
          />
          <div className="flex shrink-0 items-center gap-3">
            <Link
              className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
              href={modulePath}
              prefetch={false}
            >
              {t(locale, "common.clear")}
            </Link>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </summary>
        <form action={modulePath} className="grid gap-0 border-t border-border">
          <FilterControls
            cities={cities}
            filters={filters}
            locale={locale}
            module={module}
          />
        </form>
      </details>

      <aside className="crm-card hidden lg:sticky lg:top-24 lg:block lg:h-fit">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
          <FilterHeader
            activeFilterCount={activeFilterCount}
            locale={locale}
            module={module}
          />
          <Link
            className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
            href={modulePath}
            prefetch={false}
          >
            {t(locale, "common.clearAll")}
          </Link>
        </div>

        <form action={modulePath} className="grid gap-0">
          <FilterControls
            cities={cities}
            filters={filters}
            locale={locale}
            module={module}
          />
        </form>
      </aside>
    </>
  );
}
