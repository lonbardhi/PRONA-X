import {
  ArrowUpDown,
  BadgeCheck,
  Building2,
  CalendarClock,
  ImageUp,
  Landmark,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { createPropertyAction } from "@/app/properties/actions";
import { AppointmentAgenda } from "@/components/AppointmentAgenda";
import { DashboardShell } from "@/components/DashboardShell";
import { PropertyIntakePanel } from "@/components/PropertyIntakePanel";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyGrid } from "@/components/PropertyGrid";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getIlikeSearchTerm,
  parsePropertyFilters,
  propertySortOptions,
  type PropertyFilters as PropertyFilterState,
  type PropertySearchParams,
} from "@/lib/property-filters";
import { normalizeAppointments } from "@/lib/appointments";
import type { PropertyRecord } from "@/lib/properties";
import { isOperatorRole, requireApprovedUser } from "@/lib/supabase/server";

type PropertiesPageProps = {
  searchParams: Promise<PropertySearchParams>;
};

export const propertySelect =
  "id,title,slug,description,type,status,city,neighborhood,address,price_eur,bedrooms,bathrooms,area_m2,year_built,plot_size_m2,land_certificate_number,cadastral_zone,parcel_number,ownership_status,landowners_count,current_land_use,development_zone,building_coefficient,max_floors,estimated_gross_buildable_area_m2,estimated_net_sellable_area_m2,estimated_apartments,estimated_garages,estimated_parking_spaces,estimated_commercial_units,road_access,utilities_access,planning_permission_status,construction_permit_status,urban_study_status,landowner_requested_percentage,minimum_acceptable_percentage,preferred_compensation_type,preferred_floor_allocation,preferred_unit_orientation,agreement_notes,negotiation_status,developer_name,developer_contact,developer_offered_percentage,developer_proposed_project_size,developer_proposed_delivery_timeline,developer_proposed_unit_allocation,developer_conditions,developer_offer_status,visibility,created_at,property_media(id,public_url,alt_text,sort_order)";

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
  property:properties(id,title,city,neighborhood,address),
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
    </>
  );
}

function formatResultCount(count: number) {
  return `${count} ${count === 1 ? "sales property" : "sales properties"} found`;
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

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const filters = parsePropertyFilters(params);
  const { profile, supabase, user } = await requireApprovedUser();
  const canManage = isOperatorRole(profile.role);

  let propertiesQuery = supabase
    .from("properties")
    .select(propertySelect, { count: "exact" });

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
    propertiesQuery = propertiesQuery.eq("city", filters.city);
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

  propertiesQuery = applySort(propertiesQuery, filters.sort);

  const [propertyResult, cityResult, appointmentResult] = await Promise.all([
    propertiesQuery,
    supabase.from("properties").select("city").order("city", { ascending: true }),
    canManage
      ? supabase
          .from("appointments")
          .select(appointmentSelect)
          .order("starts_at", { ascending: true })
          .limit(75)
      : Promise.resolve({ data: [], error: null }),
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
  const cities = Array.from(
    new Set(
      cityRows
        .map((item) => item.city)
        .filter((city): city is string => Boolean(city)),
    ),
  );
  const typedProperties = ((properties || []) as PropertyRecord[]).map((property) => ({
    ...property,
    appointments: appointments.filter(
      (appointment) => appointment.property_id === property.id,
    ),
  }));
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

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  {canManage ? "PRONA X sales" : "PRONA X viewer"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Team CRM
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {canManage ? "Sales Inventory" : "Available Properties"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {canManage
                  ? "Manage PRONA X properties for sale, viewings, buyer interest, offers, and deal progress from one internal workspace."
                  : "Review approved sales, rental, and development land opportunities shared by the PRONA X team."}
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:tracking-[0.12em]">
                  Sales Properties
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {resultCount}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:tracking-[0.12em]">
                  Published
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {publishedCount}
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-2.5 sm:p-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-700 sm:tracking-[0.12em]">
                  {canManage ? (
                    <ImageUp className="h-3.5 w-3.5" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5" />
                  )}
                  {canManage ? "Missing Media" : "Land"}
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
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-950">
                    Upcoming appointments
                  </h2>
                  <p className="text-sm text-slate-500">
                    The next scheduled viewings, calls, and follow-ups.
                  </p>
                </div>
              </div>
              <a
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:w-auto"
                href="/appointments"
              >
                Open calendar
              </a>
            </div>
            <AppointmentAgenda
              appointments={upcomingAppointments}
              density="compact"
              emptyLabel="No upcoming appointments yet."
              layout="grid"
              returnTo="/sales"
            />
          </section>
        ) : null}

        <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <PropertyFilters cities={cities} filters={filters} />

          <section className="grid min-w-0 content-start gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <form action="/sales" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
                <FilterStateFields
                  exclude={["q", "sort"]}
                  filters={filters}
                />

                <label className="relative min-w-0">
                  <span className="sr-only">Search properties</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    defaultValue={filters.q}
                    name="q"
                    placeholder="Search title, city, neighborhood, description"
                  />
                </label>

                <label className="relative min-w-0">
                  <span className="sr-only">Sort properties</span>
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    className="h-11 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    defaultValue={filters.sort}
                    name="sort"
                  >
                    {propertySortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 xl:w-auto">
                  <SlidersHorizontal className="h-4 w-4" />
                  Search
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {formatResultCount(resultCount)}
                </p>
                <p className="text-xs text-slate-500">
                  Sorted by{" "}
                  {
                    propertySortOptions.find((option) => option.value === filters.sort)
                      ?.label
                  }
                </p>
              </div>
              {canManage ? (
                <a
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
                  href="#add-property"
                >
                  <Plus className="h-4 w-4" />
                  Add property
                </a>
              ) : null}
            </div>

            <PropertyGrid canManage={canManage} properties={typedProperties} />
          </section>
        </div>

        {canManage ? (
          <PropertyIntakePanel defaultOpen={Boolean(params.message)}>
            <PropertyForm action={createPropertyAction} submitLabel="Create property" />
          </PropertyIntakePanel>
        ) : null}
      </section>
    </DashboardShell>
  );
}
