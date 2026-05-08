import Link from "next/link";
import { Edit3, Trash2 } from "lucide-react";

import { deletePropertyAction } from "@/app/properties/actions";
import { PropertyMediaPreview } from "@/components/PropertyMediaPreview";
import type { PropertyRecord } from "@/lib/properties";
import { formatEuro } from "@/lib/properties";
import { pickPrimaryPropertyMedia } from "@/lib/property-media";
import { SharePropertyButton } from "@/components/SharePropertyButton";

type PropertyGridProps = {
  properties: PropertyRecord[];
};

export function PropertyGrid({ properties }: PropertyGridProps) {
  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No properties yet</h2>
        <p className="mt-2 text-sm text-slate-500">
          Create the first Tirana, Durres, Vlora, or Lalzi Bay listing to test the CRUD flow.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {properties.map((property, index) => {
        const cover = pickPrimaryPropertyMedia(property.property_media || []);

        return (
          <article
            key={property.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="relative h-72 w-full overflow-hidden bg-slate-100 sm:h-80 lg:h-[360px]">
              <PropertyMediaPreview
                emptyLabel="No media"
                fit="cover"
                media={cover}
                priority={index === 0}
                sizes="(min-width: 1024px) 780px, 100vw"
                title={property.title}
                zoom
              />
            </div>

            <div className="grid min-w-0 gap-5 p-5">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                    {property.city}
                    {property.neighborhood ? ` / ${property.neighborhood}` : ""}
                  </p>
                  <h3 className="mt-2 break-words text-2xl font-semibold leading-tight text-slate-950">
                    {property.title}
                  </h3>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {property.type} / {property.status}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                  {property.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 lg:grid-cols-4">
                <div className="min-w-0 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Price</p>
                  <p className="break-words font-semibold text-slate-950">
                    {formatEuro(property.price_eur)}
                  </p>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Area</p>
                  <p className="break-words font-semibold text-slate-950">
                    {property.area_m2 ? `${property.area_m2} m2` : "-"}
                  </p>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Beds</p>
                  <p className="font-semibold text-slate-950">{property.bedrooms ?? "-"}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Media</p>
                  <p className="font-semibold text-slate-950">
                    {property.property_media?.length || 0}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/properties/${property.id}/edit`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Link>
                <form action={deletePropertyAction}>
                  <input type="hidden" name="property_id" value={property.id} />
                  <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                    Delete
                    </button>
                  </form>
                <SharePropertyButton
                  isPublished={property.status === "published"}
                  propertyId={property.id}
                  title={property.title}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
