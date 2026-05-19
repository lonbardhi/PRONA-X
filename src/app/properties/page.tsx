import {
  ArrowUpDown,
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Landmark,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { AppointmentAgenda } from "@/components/AppointmentAgenda";
import { CalendarOpenButton } from "@/components/CalendarOpenButton";
import { DashboardShell } from "@/components/DashboardShell";
import { PropertyIntakePanel } from "@/components/PropertyIntakePanel";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyGrid } from "@/components/PropertyGrid";
import { SetupNotice } from "@/components/SetupNotice";
import {
  getAlbaniaLocationFilterValues,
  getAlbaniaLocationOptions,
} from "@/lib/albania-locations";
import { hasSupabaseEnv } from "@/lib/env";
import {
  defaultPropertyPageSize,
  getPropertySortOptions,
  getIlikeSearchTerm,
  maxPropertyPageSize,
  parsePropertyFilters,
  parsePropertyPagination,
  propertyMobileLoadStep,
  propertyPageSizeOptions,
  type PropertyFilters as PropertyFilterState,
  type PropertyPagination,
  type PropertySearchParams,
} from "@/lib/property-filters";
import { normalizeAppointments } from "@/lib/appointments";
import { t } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  type AssetDuplicateCandidate,
  getTransactionTypeForModule,
  normalizeAssignedAgent,
  type PropertyAgentOption,
  type PropertyModule,
  type PropertyRecord,
} from "@/lib/properties";
import { isOperatorRole, requireApprovedUser } from "@/lib/supabase/server";

type PropertiesPageProps = {
  module?: PropertyModule;
  searchParams: Promise<PropertySearchParams>;
};

export const propertySelect =
  "id,title,slug,description,type,transaction_type,status,city,neighborhood,address,price_eur,price_on_request,rent_period,available_from,deposit_eur,minimum_lease_months,maximum_lease_months,furnished_state,utilities_included,sublease_allowed,business_use_allowed,asset_id,linked_sale_property_id,linked_rental_property_id,bedrooms,bathrooms,area_m2,year_built,plot_size_m2,land_certificate_number,cadastral_zone,parcel_number,ownership_status,landowners_count,current_land_use,development_zone,building_coefficient,max_floors,estimated_gross_buildable_area_m2,estimated_net_sellable_area_m2,estimated_apartments,estimated_garages,estimated_parking_spaces,estimated_commercial_units,road_access,utilities_access,planning_permission_status,construction_permit_status,urban_study_status,landowner_requested_percentage,minimum_acceptable_percentage,preferred_compensation_type,preferred_floor_allocation,preferred_unit_orientation,agreement_notes,negotiation_status,developer_name,developer_contact,developer_offered_percentage,developer_proposed_project_size,developer_proposed_delivery_timeline,developer_proposed_unit_allocation,developer_conditions,developer_offer_status,visibility,assigned_agent_id,created_at,assigned_agent:profiles!properties_assigned_agent_id_fkey(id,full_name,email,phone,role,avatar_url,agency_name),property_media(id,public_url,alt_text,sort_order)";

const assetCandidateSelect =
  "id,title,type,transaction_type,status,city,neighborhood,address,area_m2,plot_size_m2,asset_id,linked_sale_property_id,linked_rental_property_id";

const appointmentSelect = `
  id,
  property_id,
  assigned_agent_id,
  created_by,
  title,
  appointment_type,
  status,
  client_name,
  client_phone,
  client_email,
  starts_at,
  ends_at,
  location,
  notes,
  created_at,
  property:properties(id,title,city,neighborhood,address,transaction_type),
  agent:profiles!appointments_assigned_agent_id_fkey(id,full_name)
`;

function FilterStateFields({
  exclude = [],
  filters,
}: {
  exclude?: Array<keyof PropertyFilterState>;
  filters: PropertyFilterState;
}) {
  const excluded = new Set(exclude);

  return (
    <>
      {!excluded.has("types")
        ? filters.types.map((type) => (
            <input key={`type-${type}`} name="type" type="hidden" value={type} />
          ))
        : null}
      {!excluded.has("statuses")
        ? filters.statuses.map((status) => (
            <input
              key={`status-${status}`}
              name="status"
              type="hidden"
              value={status}
            />
          ))
        : null}
      {!excluded.has("city") && filters.city ? (
        <input name="city" type="hidden" value={filters.city} />
      ) : null}
      {!excluded.has("minPrice") && filters.minPrice ? (
        <input name="minPrice" type="hidden" value={filters.minPrice} />
      ) : null}
      {!excluded.has("maxPrice") && filters.maxPrice ? (
        <input name="maxPrice" type="hidden" value={filters.maxPrice} />
      ) : null}
      {!excluded.has("minBedrooms") && filters.minBedrooms ? (
        <input name="minBedrooms" type="hidden" value={filters.minBedrooms} />
      ) : null}
      {!excluded.has("rentPeriod") && filters.rentPeriod ? (
        <input name="rentPeriod" type="hidden" value={filters.rentPeriod} />
      ) : null}
    </>
  );
}

function formatResultCount(count: number, module: PropertyModule) {
  const noun =
    module === "rentals"
      ? count === 1
        ? "rental property"
        : "rental properties"
      : count === 1
        ? "sales property"
        : "sales properties";

  return `${count} ${noun} found`;
}

function formatLocalizedResultCount(
  count: number,
  locale: "sq" | "en",
  module: PropertyModule,
) {
  if (locale === "sq") {
    return module === "rentals"
      ? `${count} ${count === 1 ? "prone me qira u gjet" : "prona me qira u gjeten"}`
      : `${count} ${count === 1 ? "prone shitjeje u gjet" : "prona shitjeje u gjeten"}`;
  }

  return formatResultCount(count, module);
}

function getAgentOptions(
  profiles: PropertyAgentOption[],
  currentUser: { email?: string | null; id: string },
) {
  const seen = new Set<string>();
  const options: PropertyAgentOption[] = [];

  for (const profile of profiles) {
    if (seen.has(profile.id)) {
      continue;
    }

    seen.add(profile.id);
    options.push(profile);
  }

  if (!seen.has(currentUser.id)) {
    options.unshift({
      agency_name: null,
      avatar_url: null,
      email: currentUser.email || null,
      full_name: currentUser.email || "Current user",
      id: currentUser.id,
      phone: null,
      role: "agent",
    });
  }

  return options;
}

function buildPropertyModuleHref({
  filters,
  modulePath,
  page,
  pageSize,
}: {
  filters: PropertyFilterState;
  modulePath: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  filters.types.forEach((type) => params.append("type", type));
  filters.statuses.forEach((status) => params.append("status", status));

  if (filters.city) {
    params.set("city", filters.city);
  }

  if (filters.minPrice) {
    params.set("minPrice", filters.minPrice);
  }

  if (filters.maxPrice) {
    params.set("maxPrice", filters.maxPrice);
  }

  if (filters.minBedrooms) {
    params.set("minBedrooms", filters.minBedrooms);
  }

  if (filters.rentPeriod) {
    params.set("rentPeriod", filters.rentPeriod);
  }

  if (filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  if (pageSize !== defaultPropertyPageSize) {
    params.set("pageSize", String(pageSize));
  }

  const query = params.toString();

  return query ? `${modulePath}?${query}` : modulePath;
}

function getPaginationItems(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (previousPage && page - previousPage > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  });

  return items;
}

function PropertyPaginationControls({
  filters,
  locale,
  modulePath,
  pagination,
  totalCount,
}: {
  filters: PropertyFilterState;
  locale: "sq" | "en";
  modulePath: string;
  pagination: PropertyPagination;
  totalCount: number;
}) {
  if (totalCount <= 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const currentPage = Math.min(Math.max(pagination.page, 1), totalPages);
  const visibleFrom = (currentPage - 1) * pagination.pageSize + 1;
  const visibleTo = Math.min(currentPage * pagination.pageSize, totalCount);
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const mobileLoadedCount = Math.min(
    currentPage * pagination.pageSize,
    totalCount,
  );
  const nextMobilePageSize = Math.min(
    mobileLoadedCount + propertyMobileLoadStep,
    maxPropertyPageSize,
    totalCount,
  );
  const canLoadMoreMobile =
    mobileLoadedCount < totalCount && nextMobilePageSize > pagination.pageSize;

  const pageHref = (page: number, pageSize = pagination.pageSize) =>
    buildPropertyModuleHref({ filters, modulePath, page, pageSize });

  const rangeLabel =
    locale === "sq"
      ? `Shfaqen ${visibleFrom}-${visibleTo} nga ${totalCount}`
      : `Showing ${visibleFrom}-${visibleTo} of ${totalCount}`;

  return (
    <nav
      aria-label={locale === "sq" ? "Faqosja e listimeve" : "Listing pagination"}
      className="grid gap-3"
    >
      <div className="hidden items-center justify-between gap-4 rounded-2xl border border-border bg-white px-3 py-3 shadow-sm md:flex">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{rangeLabel}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <span>{locale === "sq" ? "Për faqe:" : "Per page:"}</span>
            {propertyPageSizeOptions.map((size) => {
              const active = pagination.pageSize === size;

              return (
                <a
                  aria-current={active ? "true" : undefined}
                  className={[
                    "rounded-full px-2 py-1 font-semibold transition",
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                  href={pageHref(1, size)}
                  key={size}
                >
                  {size}
                </a>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {hasPrevious ? (
            <a
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={pageHref(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {locale === "sq" ? "Mbrapa" : "Previous"}
            </a>
          ) : (
            <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-slate-50 px-3 text-sm font-semibold text-slate-400">
              <ChevronLeft className="h-4 w-4" />
              {locale === "sq" ? "Mbrapa" : "Previous"}
            </span>
          )}

          <div className="flex items-center gap-1">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  className="flex h-9 w-9 items-center justify-center text-sm font-semibold text-slate-400"
                  key={`ellipsis-${index}`}
                >
                  ...
                </span>
              ) : (
                <a
                  aria-current={item === currentPage ? "page" : undefined}
                  className={[
                    "flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition",
                    item === currentPage
                      ? "bg-slate-950 text-white shadow-sm"
                      : "border border-border text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  href={pageHref(item)}
                  key={item}
                >
                  {item}
                </a>
              ),
            )}
          </div>

          {hasNext ? (
            <a
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={pageHref(currentPage + 1)}
            >
              {locale === "sq" ? "Para" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </a>
          ) : (
            <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-slate-50 px-3 text-sm font-semibold text-slate-400">
              {locale === "sq" ? "Para" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-3 shadow-sm md:hidden">
        <p className="text-center text-sm font-semibold text-slate-950">
          {locale === "sq"
            ? `Shfaqen ${mobileLoadedCount} nga ${totalCount}`
            : `Showing ${mobileLoadedCount} of ${totalCount}`}
        </p>
        {canLoadMoreMobile ? (
          <a
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
            href={buildPropertyModuleHref({
              filters,
              modulePath,
              page: 1,
              pageSize: nextMobilePageSize,
            })}
          >
            {locale === "sq" ? "Ngarko më shumë" : "Load more"}
          </a>
        ) : (
          <p className="mt-2 text-center text-xs text-slate-500">
            {locale === "sq"
              ? "Të gjitha listimet janë shfaqur."
              : "All listings are visible."}
          </p>
        )}
      </div>
    </nav>
  );
}

function applySort<
  T extends {
    order: (
      column: string,
      options?: { ascending?: boolean; nullsFirst?: boolean },
    ) => T;
  },
>(query: T, sort: PropertyFilterState["sort"]) {
  if (sort === "price_asc") {
    return query
      .order("price_eur", { ascending: true, nullsFirst: false })
      .order("created_at", {
        ascending: false,
      });
  }

  if (sort === "price_desc") {
    return query
      .order("price_eur", { ascending: false, nullsFirst: false })
      .order("created_at", {
        ascending: false,
      });
  }

  if (sort === "area_desc") {
    return query.order("area_m2", { ascending: false, nullsFirst: false });
  }

  if (sort === "status") {
    return query.order("status", { ascending: true }).order("created_at", {
      ascending: false,
    });
  }

  return query.order("created_at", { ascending: false });
}

export async function PropertyModulePage({
  module = "sales",
  searchParams,
}: PropertiesPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const isRentalModule = module === "rentals";
  const modulePath = isRentalModule ? "/rentals" : "/sales";
  const transactionType = getTransactionTypeForModule(module);
  const params = await searchParams;
  const locale = await getCurrentLocale();
  const filters = parsePropertyFilters(params);
  const pagination = parsePropertyPagination(params);
  const rangeFrom = (pagination.page - 1) * pagination.pageSize;
  const rangeTo = rangeFrom + pagination.pageSize - 1;
  const { profile, supabase, user } = await requireApprovedUser();
  const canManage = isOperatorRole(profile.role);

  let propertiesQuery = supabase
    .from("properties")
    .select(propertySelect, { count: "exact" });

  propertiesQuery = isRentalModule
    ? propertiesQuery.in("transaction_type", ["rent", "rent_to_own"])
    : propertiesQuery.eq("transaction_type", "sale");

  const searchTerm = getIlikeSearchTerm(filters.q);
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    propertiesQuery = propertiesQuery.or(
      `title.ilike.${pattern},city.ilike.${pattern},neighborhood.ilike.${pattern},description.ilike.${pattern},parcel_number.ilike.${pattern},cadastral_zone.ilike.${pattern},land_certificate_number.ilike.${pattern},developer_name.ilike.${pattern},agreement_notes.ilike.${pattern}`,
    );
  }

  if (filters.types.length === 1) {
    propertiesQuery = propertiesQuery.eq("type", filters.types[0]);
  } else if (filters.types.length > 1) {
    propertiesQuery = propertiesQuery.in("type", filters.types);
  }

  if (filters.statuses.length === 1) {
    propertiesQuery = propertiesQuery.eq("status", filters.statuses[0]);
  } else if (filters.statuses.length > 1) {
    propertiesQuery = propertiesQuery.in("status", filters.statuses);
  }

  if (filters.city) {
    const locationFilterValues = getAlbaniaLocationFilterValues(filters.city);

    propertiesQuery =
      locationFilterValues.length > 1
        ? propertiesQuery.in("city", locationFilterValues)
        : propertiesQuery.eq("city", filters.city);
  }

  if (filters.minPrice && filters.maxPrice) {
    propertiesQuery = propertiesQuery.or(
      `and(price_eur.gte.${filters.minPrice},price_eur.lte.${filters.maxPrice}),type.eq.development_land`,
    );
  } else if (filters.minPrice) {
    propertiesQuery = propertiesQuery.or(
      `price_eur.gte.${filters.minPrice},type.eq.development_land`,
    );
  } else if (filters.maxPrice) {
    propertiesQuery = propertiesQuery.or(
      `price_eur.lte.${filters.maxPrice},type.eq.development_land`,
    );
  }

  if (filters.minBedrooms) {
    propertiesQuery = propertiesQuery.gte("bedrooms", Number(filters.minBedrooms));
  }

  if (isRentalModule && filters.rentPeriod) {
    propertiesQuery = propertiesQuery.eq("rent_period", filters.rentPeriod);
  }

  propertiesQuery = applySort(propertiesQuery, filters.sort).range(rangeFrom, rangeTo);

  let cityQuery = supabase
    .from("properties")
    .select("city")
    .order("city", { ascending: true });
  cityQuery = isRentalModule
    ? cityQuery.in("transaction_type", ["rent", "rent_to_own"])
    : cityQuery.eq("transaction_type", "sale");

  const [
    propertyResult,
    cityResult,
    appointmentResult,
    assetCandidateResult,
    profileResult,
  ] = await Promise.all([
    propertiesQuery,
    cityQuery,
    canManage
      ? supabase
          .from("appointments")
          .select(appointmentSelect)
          .order("starts_at", { ascending: true })
          .limit(75)
      : Promise.resolve({ data: [], error: null }),
    canManage
      ? supabase
          .from("properties")
          .select(assetCandidateSelect)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as AssetDuplicateCandidate[], error: null }),
    canManage
      ? supabase
          .from("profiles")
          .select("id,full_name,email,phone,role,avatar_url,agency_name")
          .in("role", ["admin", "manager", "agent"])
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [] as PropertyAgentOption[], error: null }),
  ]);

  const { data: properties, error, count } = propertyResult;
  const appointments = normalizeAppointments(appointmentResult.data).sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        appointment.status === "scheduled" &&
        new Date(appointment.starts_at) >= new Date(),
    )
    .slice(0, 3);
  const cityRows = cityResult.data || [];
  const cities = getAlbaniaLocationOptions(
    cityRows
      .map((item) => item.city)
      .filter((city): city is string => Boolean(city)),
  );
  const typedProperties = ((properties || []) as unknown as PropertyRecord[]).map((property) => ({
    ...property,
    assigned_agent: normalizeAssignedAgent(property.assigned_agent),
    appointments: appointments.filter(
      (appointment) => appointment.property_id === property.id,
    ),
  }));
  const agentOptions = getAgentOptions(
    (profileResult.data || []) as PropertyAgentOption[],
    { email: user.email, id: user.id },
  );
  const assetCandidates = ((assetCandidateResult.data || []) as AssetDuplicateCandidate[])
    .filter((candidate) => Boolean(candidate.id));
  const resultCount = count ?? typedProperties.length;
  const publishedCount = typedProperties.filter(
    (item) => item.status === "published",
  ).length;
  const missingMediaCount = typedProperties.filter(
    (item) => (item.property_media?.length || 0) === 0,
  );
  const developmentLandCount = typedProperties.filter(
    (item) => item.type === "development_land",
  ).length;
  const localizedSortOptions = getPropertySortOptions(locale, module);

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  {canManage
                    ? isRentalModule
                      ? locale === "sq"
                        ? "PRONA X Qira"
                        : "PRONA X Rentals"
                      : locale === "sq"
                        ? "PRONA X Shitje"
                        : "PRONA X Sales"
                    : t(locale, "property.viewer")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {t(locale, "property.teamCrm")}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {canManage
                  ? isRentalModule
                    ? locale === "sq"
                      ? "Prona me Qira"
                      : "Properties for Rent"
                    : locale === "sq"
                      ? "Prona për Shitje"
                      : "Properties for Sale"
                  : locale === "sq"
                    ? "Prona të Disponueshme"
                    : "Available Properties"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {canManage
                  ? isRentalModule
                    ? locale === "sq"
                      ? "Menaxho pronat, bizneset, tokat dhe projektet që ofrohen me qira ose lease, pa i përzier me listimet për shitje."
                      : "Manage properties, businesses, land, and projects offered for rent or lease without mixing them into sales."
                    : locale === "sq"
                      ? "Menaxho pronat, bizneset, tokat dhe projektet që ofrohen për shitje, me oferta, vizita dhe progres marrëveshjesh të ndara nga qiratë."
                      : "Manage properties, businesses, land, and projects offered for sale with offers, viewings, and deal progress separate from rentals."
                  : locale === "sq"
                    ? "Shiko mundësitë e miratuara për shitje, qira dhe tokë zhvillimi të ndara nga ekipi PRONA X."
                    : "Review approved sales, rental, and development land opportunities shared by the PRONA X team."}
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
              <div className="crm-card bg-slate-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:tracking-[0.12em]">
                  {isRentalModule
                    ? locale === "sq"
                      ? "Prona me qira"
                      : "Rental properties"
                    : t(locale, "property.salesProperties")}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {resultCount}
                </p>
              </div>
              <div className="crm-card border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Publikuar në faqe" : "Published on page"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {publishedCount}
                </p>
              </div>
              <div className="crm-card border-cyan-200 bg-cyan-50 p-2.5 sm:p-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-700 sm:tracking-[0.12em]">
                  {canManage ? (
                    <ImageUp className="h-3.5 w-3.5" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5" />
                  )}
                  {canManage
                    ? locale === "sq"
                      ? "Pa media në faqe"
                      : "Missing media on page"
                    : t(locale, "property.land")}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {canManage ? missingMediaCount.length : developmentLandCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error.message}
          </div>
        ) : null}

        {canManage && !appointmentResult.error ? (
          <section className="crm-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-950">
                    {locale === "sq" ? "Takimet e ardhshme" : "Upcoming appointments"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {locale === "sq"
                      ? "Vizitat, telefonatat dhe ndjekjet e radhës."
                      : "The next scheduled viewings, calls, and follow-ups."}
                  </p>
                </div>
              </div>
              <CalendarOpenButton
                label={locale === "sq" ? "Hap kalendarin" : "Open calendar"}
              />
            </div>
            <AppointmentAgenda
              appointments={upcomingAppointments}
              density="compact"
              emptyLabel={locale === "sq" ? "Ende nuk ka takime të ardhshme." : "No upcoming appointments yet."}
              layout="grid"
              locale={locale}
              returnTo={modulePath}
            />
          </section>
        ) : null}

        <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <PropertyFilters
            cities={cities}
            filters={filters}
            locale={locale}
            module={module}
            pageSize={pagination.pageSize}
          />

          <section className="grid min-w-0 content-start gap-4">
            <div className="crm-card p-3">
              <form action={modulePath} className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
                <FilterStateFields
                  exclude={["q", "sort"]}
                  filters={filters}
                />
                <input name="page" type="hidden" value="1" />
                <input
                  name="pageSize"
                  type="hidden"
                  value={pagination.pageSize}
                />

                <label className="relative min-w-0">
                  <span className="sr-only">{t(locale, "property.searchPlaceholder")}</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="crm-input bg-slate-50 pl-9 pr-3 text-sm focus:bg-white"
                    defaultValue={filters.q}
                    name="q"
                    placeholder={t(locale, "property.searchPlaceholder")}
                  />
                </label>

                <label className="relative min-w-0">
                  <span className="sr-only">Sort properties</span>
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    className="crm-input appearance-none bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-700 focus:bg-white"
                    defaultValue={filters.sort}
                    name="sort"
                  >
                    {localizedSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="crm-button crm-button-primary w-full xl:w-auto">
                  <SlidersHorizontal className="h-4 w-4" />
                  {t(locale, "common.search")}
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {formatLocalizedResultCount(resultCount, locale, module)}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === "sq" ? "Renditur sipas" : "Sorted by"}{" "}
                  {
                    localizedSortOptions.find((option) => option.value === filters.sort)
                      ?.label
                  }
                </p>
              </div>
              {canManage ? (
                <a
                  className="crm-button crm-button-success w-full sm:w-auto"
                  href="#add-property"
                >
                  <Plus className="h-4 w-4" />
                  {isRentalModule
                    ? locale === "sq"
                      ? "Shto pronë me qira"
                      : "Add rental property"
                    : locale === "sq"
                      ? "Shto pronë për shitje"
                      : "Add property for sale"}
                </a>
              ) : null}
            </div>

            <PropertyGrid canManage={canManage} locale={locale} properties={typedProperties} />
            <PropertyPaginationControls
              filters={filters}
              locale={locale}
              modulePath={modulePath}
              pagination={pagination}
              totalCount={resultCount}
            />
          </section>
        </div>

        {canManage ? (
          <PropertyIntakePanel
            defaultOpen={Boolean(params.message)}
            locale={locale}
            mode={module}
          >
            <PropertyForm
              action="/properties/create"
              agentOptions={agentOptions}
              assetCandidates={assetCandidates}
              defaultType={filters.types.length === 1 ? filters.types[0] : undefined}
              locale={locale}
              submitLabel={
                isRentalModule
                  ? locale === "sq"
                    ? "Krijo listim qiraje"
                    : "Create rental listing"
                  : locale === "sq"
                    ? "Krijo listim shitjeje"
                    : "Create sale listing"
              }
              transactionType={transactionType}
            />
          </PropertyIntakePanel>
        ) : null}
      </section>
    </DashboardShell>
  );
}

export default async function PropertiesPage(props: PropertiesPageProps) {
  return <PropertyModulePage {...props} module="sales" />;
}
