import { notFound, redirect } from "next/navigation";

import { updatePropertyAction } from "@/app/properties/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { PropertyForm } from "@/components/PropertyForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import type { PropertyRecord } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

type EditPropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function EditPropertyPage({
  params,
  searchParams,
}: EditPropertyPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: property } = await supabase
    .from("properties")
    .select(
      "id,title,slug,description,type,status,city,neighborhood,address,price_eur,bedrooms,bathrooms,area_m2,year_built,created_at,property_media(id,public_url,alt_text,sort_order)",
    )
    .eq("id", id)
    .single();

  if (!property) {
    notFound();
  }

  const typedProperty = property as PropertyRecord;
  const updateAction = updatePropertyAction.bind(null, id);
  const query = await searchParams;

  return (
    <DashboardShell userEmail={user.email}>
      <section className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Edit listing
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {typedProperty.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Update property details or append more photos, videos, and PDF files.
          </p>

          {query.message ? (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {query.message}
            </div>
          ) : null}

          <div className="mt-6">
            <PropertyForm
              action={updateAction}
              property={typedProperty}
              submitLabel="Save changes"
            />
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
