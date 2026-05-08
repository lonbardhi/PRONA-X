import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import { PropertyMediaPreview } from "@/components/PropertyMediaPreview";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import type { PropertyRecord } from "@/lib/properties";
import { formatEuro } from "@/lib/properties";
import { pickPrimaryPropertyMedia } from "@/lib/property-media";
import { createClient } from "@/lib/supabase/server";

type PublicPropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function PublicPropertyPage({ params }: PublicPropertyPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select(
      "id,title,slug,description,type,status,city,neighborhood,address,price_eur,bedrooms,bathrooms,area_m2,year_built,created_at,property_media(id,public_url,alt_text,sort_order)",
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!property) {
    notFound();
  }

  const typedProperty = property as PropertyRecord;
  const media = [...(typedProperty.property_media || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const cover = pickPrimaryPropertyMedia(media);
  const gallery = cover ? media.filter((item) => item.id !== cover.id) : media;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-950">PRONA X</p>
              <p className="text-xs text-slate-500">Property listing</p>
            </div>
          </Link>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
            {typedProperty.status}
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-[320px] overflow-hidden bg-slate-100 sm:h-[460px] lg:h-[560px]">
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

          <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                {typedProperty.city}
                {typedProperty.neighborhood ? ` / ${typedProperty.neighborhood}` : ""}
              </p>
              <h1 className="mt-3 break-words text-4xl font-semibold leading-tight text-slate-950">
                {typedProperty.title}
              </h1>
              <p className="mt-3 text-base capitalize text-slate-600">
                {typedProperty.type}
              </p>

              {typedProperty.address ? (
                <div className="mt-5 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <span>{typedProperty.address}</span>
                </div>
              ) : null}

              {typedProperty.description ? (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-slate-950">Description</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {typedProperty.description}
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Price</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">
                {formatEuro(typedProperty.price_eur)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <DetailItem
                  label="Area"
                  value={typedProperty.area_m2 ? `${typedProperty.area_m2} m2` : "-"}
                />
                <DetailItem label="Beds" value={typedProperty.bedrooms ?? "-"} />
                <DetailItem label="Baths" value={typedProperty.bathrooms ?? "-"} />
                <DetailItem
                  label="Built"
                  value={typedProperty.year_built ?? "-"}
                />
              </div>
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
