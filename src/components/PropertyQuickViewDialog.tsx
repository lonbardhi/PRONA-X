"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Bath,
  BedDouble,
  Calendar,
  Edit3,
  Home,
  Images,
  Landmark,
  MapPin,
  Percent,
  Ruler,
  Trash2,
  X,
} from "lucide-react";

import { deletePropertyAction } from "@/app/properties/actions";
import { AppointmentAgenda } from "@/components/AppointmentAgenda";
import { FavoritePropertyButton } from "@/components/FavoritePropertyButton";
import { PropertyMediaViewer } from "@/components/PropertyMediaViewer";
import { PropertyMediaPreview } from "@/components/PropertyMediaPreview";
import { SharePropertyButton } from "@/components/SharePropertyButton";
import type { PropertyMedia, PropertyRecord } from "@/lib/properties";
import {
  formatDevelopmentAgreement,
  formatEuro,
  formatPropertyType,
  formatStatusLabel,
  isDevelopmentLand,
} from "@/lib/properties";
import { pickPrimaryPropertyMedia } from "@/lib/property-media";

type PropertyQuickViewDialogProps = {
  onClose: () => void;
  property: PropertyRecord | null;
};

function getStatusTone(status: PropertyRecord["status"]) {
  if (
    status === "published" ||
    status === "ready_for_developers" ||
    status === "documents_verified" ||
    status === "agreement_signed" ||
    status === "completed"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "reserved" ||
    status === "offer_received" ||
    status === "negotiation" ||
    status === "agreement_in_principle" ||
    status === "contract_drafting"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "sold" || status === "project_in_progress") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "archived") {
    return "bg-slate-200 text-slate-600";
  }

  return "bg-slate-100 text-slate-700";
}

function DetailMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getOrderedMedia(media: PropertyMedia[]) {
  const sortedMedia = [...media].sort((a, b) => a.sort_order - b.sort_order);
  const cover = pickPrimaryPropertyMedia(sortedMedia);

  if (!cover) {
    return sortedMedia;
  }

  return [cover, ...sortedMedia.filter((item) => item.id !== cover.id)];
}

function getMediaButtonLabel(
  item: PropertyMedia,
  index: number,
  total: number,
  title: string,
) {
  return item.alt_text || `${title} media ${index + 1} of ${total}`;
}

export function PropertyQuickViewDialog({
  onClose,
  property,
}: PropertyQuickViewDialogProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const lastMediaTriggerRef = useRef<HTMLElement | null>(null);

  const closeMediaViewer = useCallback(() => {
    setActiveMediaIndex(null);
    window.requestAnimationFrame(() => lastMediaTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!property) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (activeMediaIndex !== null) {
        return;
      }

      if (event.key === "Escape") {
        onClose();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeMediaIndex, onClose, property]);

  useEffect(() => {
    if (!property) {
      const frame = window.requestAnimationFrame(() => setActiveMediaIndex(null));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [property]);

  if (!property) {
    return null;
  }

  const media = getOrderedMedia(property.property_media || []);
  const cover = media[0];
  const developmentLand = isDevelopmentLand(property);
  const appointments = [...(property.appointments || [])].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const location = property.neighborhood
    ? `${property.neighborhood}, ${property.city}`
    : property.city;

  function openMediaViewer(index: number, event: MouseEvent<HTMLElement>) {
    lastMediaTriggerRef.current = event.currentTarget;
    setActiveMediaIndex(index);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-2 py-3 backdrop-blur-sm sm:px-6 sm:py-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="mx-auto grid min-h-full max-w-[1180px] items-start sm:items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-4 sm:gap-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(property.status)}`}
                >
                  {formatStatusLabel(property.status)}
                </span>
              </div>
              <h2 className="mt-2 break-words text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">
                {property.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatPropertyType(property.type)}
              </p>
            </div>
            <button
              aria-label="Close property details"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
            <div className="min-w-0 border-b border-slate-200 lg:border-b-0">
              {cover ? (
                <button
                  aria-label={`Open ${getMediaButtonLabel(
                    cover,
                    0,
                    media.length,
                    property.title,
                  )}`}
                  className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-100 text-left focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  onClick={(event) => openMediaViewer(0, event)}
                  type="button"
                >
                  <PropertyMediaPreview
                    emptyLabel="No media available"
                    fit="cover"
                    media={cover}
                    priority
                    sizes="(min-width: 1024px) 760px, 100vw"
                    title={property.title}
                    zoom
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    Click to inspect media
                  </span>
                </button>
              ) : (
                <div className="relative aspect-[16/10] bg-slate-100">
                  <PropertyMediaPreview
                    emptyLabel="No media available"
                    fit="cover"
                    media={cover}
                    priority
                    sizes="(min-width: 1024px) 760px, 100vw"
                    title={property.title}
                  />
                </div>
              )}

              <div className="grid gap-4 p-3 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {developmentLand ? "Development exchange" : "Asking price"}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
                      {developmentLand
                        ? formatDevelopmentAgreement(property)
                        : formatEuro(property.price_eur || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FavoritePropertyButton
                      propertyId={property.id}
                      title={property.title}
                    />
                    <button
                      aria-label={`Open media viewer with ${media.length} media items`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={media.length === 0}
                      onClick={(event) => openMediaViewer(0, event)}
                      type="button"
                    >
                      <Images className="h-3.5 w-3.5" />
                      {media.length} media
                    </button>
                  </div>
                </div>

                {developmentLand ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-[360px]:grid-cols-1">
                    <DetailMetric
                      icon={Landmark}
                      label="Plot"
                      value={
                        property.plot_size_m2 != null
                          ? `${property.plot_size_m2} m2`
                          : "-"
                      }
                    />
                    <DetailMetric
                      icon={Percent}
                      label="Owner %"
                      value={
                        property.landowner_requested_percentage != null
                          ? `${property.landowner_requested_percentage}%`
                          : "-"
                      }
                    />
                    <DetailMetric
                      icon={Ruler}
                      label="Buildable"
                      value={
                        property.estimated_gross_buildable_area_m2 != null
                          ? `${property.estimated_gross_buildable_area_m2} m2`
                          : "-"
                      }
                    />
                    <DetailMetric
                      icon={Calendar}
                      label="Max floors"
                      value={property.max_floors ?? "-"}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-[360px]:grid-cols-1">
                    <DetailMetric
                      icon={BedDouble}
                      label="Beds"
                      value={property.bedrooms ?? "-"}
                    />
                    <DetailMetric
                      icon={Bath}
                      label="Baths"
                      value={property.bathrooms ?? "-"}
                    />
                    <DetailMetric
                      icon={Ruler}
                      label="Area"
                      value={
                        property.area_m2 != null ? `${property.area_m2} m2` : "-"
                      }
                    />
                    <DetailMetric
                      icon={Calendar}
                      label="Built"
                      value={property.year_built ?? "-"}
                    />
                  </div>
                )}

                {media.length > 0 ? (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-950">
                        More media
                      </h3>
                      <p className="text-xs text-slate-400">Scroll to inspect all</p>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
                      <div
                        className="flex snap-x gap-3 overflow-x-auto pb-2"
                        onWheel={(event) => {
                          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                            event.currentTarget.scrollLeft += event.deltaY;
                            event.preventDefault();
                          }
                        }}
                      >
                        {media.map((item, index) => (
                          <button
                            aria-label={`Open ${getMediaButtonLabel(
                              item,
                              index,
                              media.length,
                              property.title,
                            )}`}
                            className="relative aspect-[4/3] w-36 shrink-0 snap-start overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left transition hover:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:w-40"
                            key={item.id}
                            onClick={(event) => openMediaViewer(index, event)}
                            type="button"
                          >
                            <PropertyMediaPreview
                              fit="cover"
                              media={item}
                              sizes="160px"
                              title={property.title}
                            />
                            <span className="absolute bottom-1 left-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                              {index + 1} / {media.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="grid min-w-0 content-start gap-4 bg-white p-3 sm:gap-5 sm:p-6 lg:border-l lg:border-slate-200">
              <div className="grid min-w-0 gap-3">
                <h3 className="text-base font-semibold text-slate-950">
                  Property details
                </h3>
                <div className="grid min-w-0 gap-3 text-sm">
                  <div className="flex min-w-0 items-start gap-2 rounded-lg bg-slate-50 p-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-950">
                        {location}
                      </p>
                      <p className="mt-1 break-words text-slate-500">
                        {property.address || "No street address added"}
                      </p>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <DetailMetric
                      icon={Home}
                      label="Type"
                      value={formatPropertyType(property.type)}
                    />
                    <DetailMetric
                      icon={Calendar}
                      label="Created"
                      value={formatDate(property.created_at)}
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-950">Description</h3>
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                  {property.description ||
                    "No description has been added for this property yet."}
                </p>
              </div>

              {developmentLand ? (
                <>
                  <div className="min-w-0 rounded-lg border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-950">
                      Development feasibility
                    </h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-950">
                          Cadastral zone:
                        </span>{" "}
                        {property.cadastral_zone || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Parcel:
                        </span>{" "}
                        {property.parcel_number || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Coefficient:
                        </span>{" "}
                        {property.building_coefficient ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Planning:
                        </span>{" "}
                        {property.planning_permission_status || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Road / utilities:
                        </span>{" "}
                        {[property.road_access, property.utilities_access]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-950">
                      Landowner and developer terms
                    </h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-950">
                          Owner request:
                        </span>{" "}
                        {property.landowner_requested_percentage != null
                          ? `${property.landowner_requested_percentage}%`
                          : "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Minimum:
                        </span>{" "}
                        {property.minimum_acceptable_percentage != null
                          ? `${property.minimum_acceptable_percentage}%`
                          : "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Developer:
                        </span>{" "}
                        {property.developer_name || "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Developer offer:
                        </span>{" "}
                        {property.developer_offered_percentage != null
                          ? `${property.developer_offered_percentage}%`
                          : "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">
                          Visibility:
                        </span>{" "}
                        {property.visibility || "internal_only"}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="min-w-0 rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-950">
                    Appointments
                  </h3>
                  <Link
                    className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    href={`/appointments?property_id=${property.id}#new-appointment`}
                    prefetch={false}
                  >
                    Schedule
                  </Link>
                </div>
                <AppointmentAgenda
                  appointments={appointments}
                  density="compact"
                  emptyLabel="No appointments for this property yet."
                  layout="stack"
                  returnTo="/sales"
                  showProperty={false}
                />
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-2 border-t border-slate-200 pt-4 min-[420px]:flex min-[420px]:flex-wrap">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  href={`/properties/${property.id}/edit`}
                  prefetch={false}
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Link>
                <form action={deletePropertyAction}>
                  <input name="property_id" type="hidden" value={property.id} />
                  <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
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
            </aside>
          </div>
        </div>
      </div>
      {activeMediaIndex !== null ? (
        <PropertyMediaViewer
          activeIndex={activeMediaIndex}
          media={media}
          onActiveIndexChange={setActiveMediaIndex}
          onClose={closeMediaViewer}
          title={property.title}
        />
      ) : null}
    </div>
  );
}
