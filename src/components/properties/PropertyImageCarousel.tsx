import Link from "next/link";
import { ImageOff, Images, MapPin, Pencil, Plus } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import {
  formatPropertyPrice,
  formatStatusLabel,
  type PropertyModule,
  type PropertyRecord,
} from "@/lib/properties";
import { getPropertyMediaKindFromUrl } from "@/lib/property-media";
import { cn } from "@/lib/utils";

type PropertyImageCarouselProps = {
  canManage: boolean;
  locale: Locale;
  module: PropertyModule;
  properties: PropertyRecord[];
};

type CarouselItem = {
  city: string;
  href: string;
  id: string;
  imageAlt: string;
  imageCount: number;
  imageId: string;
  imageUrl: string;
  location: string;
  price: string;
  status: string;
  title: string;
};

function getModuleCopy(module: PropertyModule, locale: Locale) {
  const isSq = locale === "sq";
  const isRental = module === "rentals";

  return {
    addLabel: isRental
      ? isSq
        ? "Shto qira"
        : "Add rental"
      : isSq
        ? "Shto shitje"
        : "Add sale",
    emptyBody: isSq
      ? "Shto foto ne listimet e filtruara qe galeria te ndihmoje ekipin te skanoje pronat me shpejt."
      : "Add photos to the filtered listings so the gallery helps the team scan properties faster.",
    emptyTitle: isSq ? "Nuk ka foto per keto filtra" : "No photos for these filters",
    subtitle: isRental
      ? isSq
        ? "Pamje te qirave ne filtrat aktuale. Ne desktop leviz ngadale; ne mobile rreshqit me gisht."
        : "Rental visuals in the current filters. It moves slowly on desktop; swipe on mobile."
      : isSq
        ? "Pamje te shitjeve ne filtrat aktuale. Ne desktop leviz ngadale; ne mobile rreshqit me gisht."
        : "Sales visuals in the current filters. It moves slowly on desktop; swipe on mobile.",
    title: isSq ? "Galeria e pronave" : "Property gallery",
  };
}

function getImageItems({
  canManage,
  locale,
  properties,
}: {
  canManage: boolean;
  locale: Locale;
  properties: PropertyRecord[];
}) {
  return properties
    .flatMap<CarouselItem>((property) => {
      const imageMedia = (property.property_media || [])
        .filter((media) => getPropertyMediaKindFromUrl(media.public_url) === "image")
        .sort((a, b) => a.sort_order - b.sort_order);
      const primaryImage = imageMedia[0];

      if (!primaryImage) {
        return [];
      }

      const location = property.neighborhood
        ? `${property.neighborhood}, ${property.city}`
        : property.city;

      return [
        {
          city: property.city,
          href: canManage ? `/properties/${property.id}/edit` : `/properties/${property.id}`,
          id: property.id,
          imageAlt: primaryImage.alt_text || property.title,
          imageCount: imageMedia.length,
          imageId: primaryImage.id,
          imageUrl: primaryImage.public_url,
          location,
          price: formatPropertyPrice(property, locale),
          status: formatStatusLabel(property.status, locale),
          title: property.title,
        },
      ];
    })
    .slice(0, 18);
}

function fillDesktopItems(items: CarouselItem[]) {
  if (items.length === 0) {
    return [];
  }

  const filled = [...items];

  while (filled.length < 8) {
    filled.push(...items.slice(0, 8 - filled.length));
  }

  return filled.slice(0, 18);
}

function PropertyImageCard({
  canManage,
  duplicate = false,
  item,
  locale,
}: {
  canManage: boolean;
  duplicate?: boolean;
  item: CarouselItem;
  locale: Locale;
}) {
  const content = (
    <article
      className={cn(
        "group grid h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition",
        !duplicate && "hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={item.imageAlt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          src={item.imageUrl}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <span className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-800 shadow-sm">
            {item.status}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            <Images className="h-3 w-3" />
            {item.imageCount}
          </span>
        </div>
      </div>

      <div className="grid gap-2 p-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-950">
            {item.title}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            <span className="truncate">{item.location}</span>
          </p>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-950">{item.price}</p>
          <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-slate-950 px-2.5 text-xs font-semibold text-white">
            {canManage ? <Pencil className="h-3.5 w-3.5" /> : null}
            {canManage
              ? locale === "sq"
                ? "Ndrysho"
                : "Edit"
              : locale === "sq"
                ? "Hap"
                : "Open"}
          </span>
        </div>
      </div>
    </article>
  );

  if (duplicate) {
    return (
      <div
        aria-hidden="true"
        className="w-[236px] shrink-0 snap-start sm:w-[268px] lg:w-[248px] xl:w-[276px]"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      className="w-[236px] shrink-0 snap-start focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-[268px] lg:w-[248px] xl:w-[276px]"
      href={item.href}
      prefetch={false}
    >
      {content}
    </Link>
  );
}

export function PropertyImageCarousel({
  canManage,
  locale,
  module,
  properties,
}: PropertyImageCarouselProps) {
  const copy = getModuleCopy(module, locale);
  const items = getImageItems({ canManage, locale, properties });
  const desktopItems = fillDesktopItems(items);
  const missingMediaProperty = properties.find(
    (property) => (property.property_media?.length || 0) === 0,
  );
  const mediaActionHref = missingMediaProperty
    ? `/properties/${missingMediaProperty.id}/edit`
    : "#add-property";
  const isSq = locale === "sq";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Images className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">{copy.title}</h2>
            <p className="text-sm leading-5 text-slate-500">{copy.subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
            {items.length} {isSq ? "me foto" : "with photos"}
          </span>
          {canManage ? (
            <Link
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
              href="#add-property"
            >
              <Plus className="h-3.5 w-3.5" />
              {copy.addLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div
            aria-label={copy.title}
            className="property-image-carousel mt-4 overflow-x-auto pb-1 lg:hidden"
          >
            <div className="flex snap-x snap-mandatory gap-3">
              {items.map((item, index) => (
                <PropertyImageCard
                  canManage={canManage}
                  item={item}
                  key={`${item.id}-${item.imageId}-mobile-${index}`}
                  locale={locale}
                />
              ))}
            </div>
          </div>

          <div
            aria-label={copy.title}
            className="property-image-carousel mt-4 hidden overflow-hidden lg:block"
          >
            <div className="property-image-carousel-track flex gap-3">
              {desktopItems.map((item, index) => (
                <PropertyImageCard
                  canManage={canManage}
                  item={item}
                  key={`${item.id}-${item.imageId}-desktop-${index}`}
                  locale={locale}
                />
              ))}
              {desktopItems.map((item, index) => (
                <PropertyImageCard
                  canManage={canManage}
                  duplicate
                  item={item}
                  key={`${item.id}-${item.imageId}-desktop-duplicate-${index}`}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
            <ImageOff className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-950">{copy.emptyTitle}</p>
            <p className="mt-1 leading-5">{copy.emptyBody}</p>
          </div>
          {canManage ? (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={mediaActionHref}
            >
              {isSq ? "Shto media" : "Add media"}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
