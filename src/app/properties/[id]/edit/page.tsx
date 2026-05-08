import { notFound, redirect } from "next/navigation";

import { updatePropertyAction } from "@/app/properties/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { PropertyForm } from "@/components/PropertyForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import type { PropertyRecord } from "@/lib/properties";
import {
  getClearSessionPath,
  getCurrentUser,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";

const propertySelect =
  "id,title,slug,description,type,status,city,neighborhood,address,price_eur,bedrooms,bathrooms,area_m2,year_built,plot_size_m2,land_certificate_number,cadastral_zone,parcel_number,ownership_status,landowners_count,current_land_use,development_zone,building_coefficient,max_floors,estimated_gross_buildable_area_m2,estimated_net_sellable_area_m2,estimated_apartments,estimated_garages,estimated_parking_spaces,estimated_commercial_units,road_access,utilities_access,planning_permission_status,construction_permit_status,urban_study_status,landowner_requested_percentage,minimum_acceptable_percentage,preferred_compensation_type,preferred_floor_allocation,preferred_unit_orientation,agreement_notes,negotiation_status,developer_name,developer_contact,developer_offered_percentage,developer_proposed_project_size,developer_proposed_delivery_timeline,developer_proposed_unit_allocation,developer_conditions,developer_offer_status,visibility,created_at,property_media(id,public_url,alt_text,sort_order)";

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
  const { authError, supabase, user } = await getCurrentUser();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        "Your session expired. Sign in again to continue.",
      ),
    );
  }

  if (!user) {
    redirect("/login");
  }

  const { data: property } = await supabase
    .from("properties")
    .select(propertySelect)
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
      <section className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Edit listing
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
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
