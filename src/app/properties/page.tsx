import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Globe2,
  ImageUp,
  ShieldCheck,
} from "lucide-react";

import { createPropertyAction } from "@/app/properties/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyGrid } from "@/components/PropertyGrid";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import type { PropertyRecord } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

type PropertiesPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      "id,title,slug,description,type,status,city,neighborhood,address,price_eur,bedrooms,bathrooms,area_m2,year_built,created_at,property_media(id,public_url,alt_text,sort_order)",
    )
    .order("created_at", { ascending: false });

  const params = await searchParams;
  const typedProperties = (properties || []) as PropertyRecord[];
  const publishedCount = typedProperties.filter(
    (item) => item.status === "published",
  ).length;
  const mediaCount = typedProperties.reduce(
    (total, item) => total + (item.property_media?.length || 0),
    0,
  );

  return (
    <DashboardShell userEmail={user.email}>
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  PRONA X Workspace
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <Globe2 className="h-3.5 w-3.5 text-orange-500" />
                  www.pronax.al
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Team access
                </span>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">
                    Internal product console
                  </p>
                  <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 lg:text-5xl">
                    Property operations, branded for the PRONA X team.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                    Manage Albanian listings, media, publishing status, and buyer-ready
                    share links from the official PRONA X workspace.
                  </p>
                </div>

                <div className="grid content-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
                      <BadgeCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        Organisation workspace
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white p-3">
                      <p className="font-semibold text-slate-950">PRONA X</p>
                      <p className="mt-1 text-slate-500">Official platform</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="font-semibold text-slate-950">Private</p>
                      <p className="mt-1 text-slate-500">Team operations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 self-stretch sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Portfolio
                  </p>
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {typedProperties.length}
                </p>
                <p className="mt-1 text-sm text-slate-500">Total listings</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Live market
                  </p>
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {publishedCount}
                </p>
                <p className="mt-1 text-sm text-emerald-700">Published listings</p>
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    Media library
                  </p>
                  <ImageUp className="h-4 w-4 text-cyan-600" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {mediaCount}
                </p>
                <p className="mt-1 text-sm text-cyan-700">Uploaded assets</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-950 px-6 py-3 lg:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-white/72">
              <span>www.pronax.al product environment</span>
              <span>Inventory, media, roles, public sharing</span>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Add property</h2>
            <p className="mt-2 text-sm text-slate-500">
              Start with the operational fields needed for Albanian residential and land
              listings.
            </p>
            <div className="mt-5">
              <PropertyForm action={createPropertyAction} submitLabel="Create property" />
            </div>
          </section>

          <section className="grid min-w-0 gap-4">
            <PropertyGrid properties={typedProperties} />
          </section>
        </div>
      </section>
    </DashboardShell>
  );
}
