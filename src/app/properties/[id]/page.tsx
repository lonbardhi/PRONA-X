import { MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import { BrandLockup } from "@/components/BrandLogo";
import { PropertyMediaPreview } from "@/components/PropertyMediaPreview";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import type { PropertyRecord } from "@/lib/properties";
import {
  formatDevelopmentAgreement,
  formatEuro,
  formatPropertyType,
  isDevelopmentLand,
} from "@/lib/properties";
import { pickPrimaryPropertyMedia } from "@/lib/property-media";
import { createClient } from "@/lib/supabase/server";

type PublicPropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3 sm:p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 sm:text-base">
        {value}
      </p>
    </div>
  );
}

const propertySelect =
  "id,title,slug,description,type,status,city,neighborhood,address,price_eur,bedrooms,bathrooms,area_m2,year_built,plot_size_m2,land_certificate_number,cadastral_zone,parcel_number,ownership_status,landowners_count,current_land_use,development_zone,building_coefficient,max_floors,estimated_gross_buildable_area_m2,estimated_net_sellable_area_m2,estimated_apartments,estimated_garages,estimated_parking_spaces,estimated_commercial_units,road_access,utilities_access,planning_permission_status,construction_permit_status,urban_study_status,landowner_requested_percentage,minimum_acceptable_percentage,preferred_compensation_type,preferred_floor_allocation,preferred_unit_orientation,agreement_notes,negotiation_status,developer_name,developer_contact,developer_offered_percentage,developer_proposed_project_size,developer_proposed_delivery_timeline,developer_proposed_unit_allocation,developer_conditions,developer_offer_status,visibility,created_at,property_media(id,public_url,alt_text,sort_order)";

export default async function PublicPropertyPage({ params }: PublicPropertyPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select(propertySelect)
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!property) {
    notFound();
  }

  const typedProperty = property as PropertyRecord;
  const developmentLand = isDevelopmentLand(typedProperty);
  const media = [...(typedProperty.property_media || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const cover = pickPrimaryPropertyMedia(media);
  const gallery = cover ? media.filter((item) => item.id !== cover.id) : media;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-4 sm:px-6">
          <BrandLockup href="/" subtitle="Property listing" />
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
            {typedProperty.status}
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-3 py-5 sm:gap-8 sm:px-6 sm:py-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
          <div className="relative h-[260px] overflow-hidden bg-slate-100 sm:h-[460px] lg:h-[560px]">
            <PropertyMediaPreview
              emptyLabel="No media available"
              fit="cover"
              media={cover}
              priority
              sizes="(min-width: 1024px) 1152px, 100vw"
              title={typedProperty.title}
              zoom
            />
          </div>

          <div className="grid gap-5 p-4 sm:gap-8 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                {typedProperty.city}
                {typedProperty.neighborhood ? ` / ${typedProperty.neighborhood}` : ""}
              </p>
              <h1 className="mt-3 break-words text-2xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                {typedProperty.title}
              </h1>
              <p className="mt-3 text-base capitalize text-slate-600">
                {formatPropertyType(typedProperty.type)}
              </p>

              {typedProperty.address ? (
                <div className="mt-5 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <span className="break-words">{typedProperty.address}</span>
                </div>
              ) : null}

              {typedProperty.description ? (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-slate-950">Description</h2>
                  <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                    {typedProperty.description}
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm text-slate-500">
                {developmentLand ? "Development exchange" : "Price"}
              </p>
              <p className="mt-1 break-words text-2xl font-semibold text-slate-950 sm:text-3xl">
                {developmentLand
                  ? formatDevelopmentAgreement(typedProperty)
                  : formatEuro(typedProperty.price_eur || 0)}
              </p>
              {developmentLand ? (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <DetailItem
                    label="Plot"
                    value={
                      typedProperty.plot_size_m2
                        ? `${typedProperty.plot_size_m2} m2`
                        : "-"
                    }
                  />
                  <DetailItem
                    label="Coefficient"
                    value={typedProperty.building_coefficient ?? "-"}
                  />
                  <DetailItem
                    label="Buildable"
                    value={
                      typedProperty.estimated_gross_buildable_area_m2
                        ? `${typedProperty.estimated_gross_buildable_area_m2} m2`
                        : "-"
                    }
                  />
                  <DetailItem
                    label="Max floors"
                    value={typedProperty.max_floors ?? "-"}
                  />
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <DetailItem
                    label="Area"
                    value={
                      typedProperty.area_m2 ? `${typedProperty.area_m2} m2` : "-"
                    }
                  />
                  <DetailItem label="Beds" value={typedProperty.bedrooms ?? "-"} />
                  <DetailItem label="Baths" value={typedProperty.bathrooms ?? "-"} />
                  <DetailItem
                    label="Built"
                    value={typedProperty.year_built ?? "-"}
                  />
                </div>
              )}
            </aside>
          </div>
        </div>

        {gallery.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="text-xl font-semibold text-slate-950">Gallery</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"
                >
                  <PropertyMediaPreview
                    fit="cover"
                    media={item}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                    title={typedProperty.title}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
