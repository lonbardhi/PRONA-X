import Link from "next/link";
import { Building2, ClipboardList, Home, KeyRound, Plus, TrendingUp } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import { countPhysicalAssets } from "@/lib/properties";
import { requireApprovedUser } from "@/lib/supabase/server";

type ListingSummary = {
  asset_id: string | null;
  id: string;
  status: string;
  transaction_type: "sale" | "rent" | "rent_to_own";
};

type RequestSummary = {
  request_type: "buyer" | "tenant" | "owner" | "investor";
  status: string;
};

function countWhere(
  rows: ListingSummary[],
  predicate: (row: ListingSummary) => boolean,
) {
  return rows.filter(predicate).length;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const [{ data }, requestResult] = await Promise.all([
    supabase.from("properties").select("id,asset_id,transaction_type,status"),
    supabase.from("crm_requests").select("request_type,status"),
  ]);
  const rows = ((data || []) as ListingSummary[]).filter(Boolean);
  const requestRows = requestResult.error
    ? []
    : ((requestResult.data || []) as RequestSummary[]).filter(Boolean);
  const sales = rows.filter((row) => row.transaction_type === "sale");
  const rentals = rows.filter((row) => row.transaction_type !== "sale");
  const physicalAssetCount = countPhysicalAssets(rows);
  const linkedListingCount = rows.length - physicalAssetCount;

  const salesMetrics = {
    active: countWhere(sales, (row) =>
      ["published", "negotiation", "reserved"].includes(row.status),
    ),
    negotiations: countWhere(sales, (row) => row.status === "negotiation"),
    reservations: countWhere(sales, (row) => row.status === "reserved"),
    sold: countWhere(sales, (row) => row.status === "sold"),
  };
  const rentalMetrics = {
    active: countWhere(rentals, (row) =>
      ["published", "available", "viewing", "reserved", "contract_drafting"].includes(row.status),
    ),
    viewings: countWhere(rentals, (row) => row.status === "viewing"),
    reservations: countWhere(rentals, (row) => row.status === "reserved"),
    contracts: countWhere(rentals, (row) =>
      ["rented", "contract_active", "contract_expiring"].includes(row.status),
    ),
  };
  const requestMetrics = {
    active: requestRows.filter((row) => !["converted", "lost", "archived"].includes(row.status)).length,
    buyers: requestRows.filter((row) => row.request_type === "buyer").length,
    owners: requestRows.filter((row) => row.request_type === "owner").length,
    tenants: requestRows.filter((row) => row.request_type === "tenant").length,
  };

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                PRONA X CRM
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
                {locale === "sq" ? "Paneli operacional" : "Operational dashboard"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {locale === "sq"
                  ? "Shitjet, qiratë dhe kërkesat lexohen veçmas që ekipi të mos ngatërrojë flukset e punës."
                  : "Sales, rentals, and requests are read separately so the team does not mix workflows."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link className="crm-button crm-button-primary" href="/sales#add-property">
                <Plus className="h-4 w-4" />
                {locale === "sq" ? "Shto pronë për shitje" : "Add property for sale"}
              </Link>
              <Link className="crm-button crm-button-success" href="/rentals#add-property">
                <Plus className="h-4 w-4" />
                {locale === "sq" ? "Shto pronë me qira" : "Add rental property"}
              </Link>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={locale === "sq" ? "Asete fizike" : "Physical assets"}
            value={physicalAssetCount}
          />
          <MetricCard
            label={locale === "sq" ? "Listime shitjeje" : "Sale listings"}
            value={sales.length}
          />
          <MetricCard
            label={locale === "sq" ? "Listime qiraje" : "Rental listings"}
            value={rentals.length}
          />
          {linkedListingCount > 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium leading-5 text-emerald-800 sm:col-span-3">
              {locale === "sq"
                ? `${linkedListingCount} listime ndajnÃ« tÃ« njÃ«jtin aset fizik. Raportimi i aseteve i numÃ«ron vetÃ«m njÃ« herÃ«.`
                : `${linkedListingCount} listings share the same physical asset. Asset reporting counts them once.`}
            </p>
          ) : null}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="crm-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Home className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Shitje" : "Sales"}
                </h2>
                <p className="text-sm text-slate-500">
                  {locale === "sq"
                    ? "Listime, negociata, rezervime dhe shitje të mbyllura."
                    : "Listings, negotiations, reservations, and closed sales."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label={locale === "sq" ? "Aktive" : "Active"}
                value={salesMetrics.active}
              />
              <MetricCard
                label={locale === "sq" ? "Negociata" : "Negotiations"}
                value={salesMetrics.negotiations}
              />
              <MetricCard
                label={locale === "sq" ? "Rezervime" : "Reservations"}
                value={salesMetrics.reservations}
              />
              <MetricCard
                label={locale === "sq" ? "Shitur" : "Sold"}
                value={salesMetrics.sold}
              />
            </div>
            <Link className="crm-button crm-button-secondary mt-4 w-full" href="/sales">
              <TrendingUp className="h-4 w-4" />
              {locale === "sq" ? "Hap shitjet" : "Open sales"}
            </Link>
          </section>

          <section className="crm-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Qira" : "Rentals"}
                </h2>
                <p className="text-sm text-slate-500">
                  {locale === "sq"
                    ? "Listime qiraje, rezervime, kontrata aktive dhe ndjekje."
                    : "Rental listings, reservations, active contracts, and follow-ups."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label={locale === "sq" ? "Aktive" : "Active"}
                value={rentalMetrics.active}
              />
              <MetricCard
                label={locale === "sq" ? "Vizita" : "Viewings"}
                value={rentalMetrics.viewings}
              />
              <MetricCard
                label={locale === "sq" ? "Rezervime" : "Reservations"}
                value={rentalMetrics.reservations}
              />
              <MetricCard
                label={locale === "sq" ? "Kontrata aktive" : "Active contracts"}
                value={rentalMetrics.contracts}
              />
            </div>
            <Link className="crm-button crm-button-secondary mt-4 w-full" href="/rentals">
              <Building2 className="h-4 w-4" />
              {locale === "sq" ? "Hap qiratë" : "Open rentals"}
            </Link>
          </section>
        </div>

        <section className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {locale === "sq" ? "Kërkesa" : "Requests"}
                </h2>
                <p className="text-sm text-slate-500">
                  {locale === "sq"
                    ? "Blerësit dhe qiramarrësit ruhen veçmas nga listimet për të shmangur numërime të gabuara."
                    : "Buyer and tenant requests stay separate from listings to avoid incorrect counts."}
                </p>
              </div>
            </div>
            <Link className="crm-button crm-button-secondary w-full lg:w-auto" href="/requests">
              <ClipboardList className="h-4 w-4" />
              {locale === "sq" ? "Hap kërkesat" : "Open requests"}
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={locale === "sq" ? "Aktive" : "Active"}
              value={requestMetrics.active}
            />
            <MetricCard
              label={locale === "sq" ? "Kërkesa blerësish" : "Buyer requests"}
              value={requestMetrics.buyers}
            />
            <MetricCard
              label={locale === "sq" ? "Kërkesa qiramarrësish" : "Tenant requests"}
              value={requestMetrics.tenants}
            />
            <MetricCard
              label={locale === "sq" ? "Kërkesa pronarësh" : "Owner requests"}
              value={requestMetrics.owners}
            />
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}
