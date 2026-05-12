"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import type { PropertyRecord, PropertyStatus, PropertyType } from "@/lib/properties";
import {
  calculateGrossBuildableArea,
  developmentLandStatuses,
  formatPropertyType,
  formatStatusLabel,
  isDevelopmentLand,
  isLandPropertyType,
  propertyTypes,
  standardPropertyStatuses,
} from "@/lib/properties";
import {
  createInitialUploadQueue,
  getMediaMutationErrorMessage,
  type PropertyMutationResponse,
  type PropertyUploadQueueItem,
  uploadPropertyMediaDirect,
  validatePropertyMediaSelection,
} from "@/lib/property-media-client";
import {
  propertyMediaAccept,
  propertyMediaHelpText,
  propertyMediaMaxFiles,
  propertyVideoMaxDurationSeconds,
  propertyVideoMaxSizeMb,
} from "@/lib/property-media";
import { defaultLocale, type Locale } from "@/lib/i18n";

type PropertyFormProps = {
  action: string | ((formData: FormData) => void | Promise<void>);
  locale?: Locale;
  property?: PropertyRecord;
  submitLabel: string;
};

type FieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
};

function Field({ children, className = "", label }: FieldProps) {
  return (
    <label
      className={`grid min-w-0 gap-2 text-sm font-medium text-slate-700 ${className}`}
    >
      {label}
      {children}
    </label>
  );
}

function Section({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100";
const textareaClass =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

function toNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function numberValue(value: number | null | undefined) {
  return value ?? "";
}

function getQueueStatusLabel(
  status: PropertyUploadQueueItem["status"],
  locale: Locale,
) {
  const isSq = locale === "sq";

  switch (status) {
    case "validating":
      return isSq ? "Po validohet" : "Validating";
    case "ready":
      return isSq ? "Gati" : "Ready";
    case "uploading":
      return isSq ? "Po ngarkohet" : "Uploading";
    case "saving":
      return isSq ? "Po lidhet me pronen" : "Saving to property";
    case "done":
      return isSq ? "U ruajt" : "Saved";
    case "error":
      return isSq ? "Deshtoi" : "Failed";
    default:
      return isSq ? "Ne radhe" : "Queued";
  }
}

export function PropertyForm({
  action,
  locale = defaultLocale,
  property,
  submitLabel,
}: PropertyFormProps) {
  const initialType = property?.type || "apartment";
  const [selectedType, setSelectedType] = useState<PropertyType>(initialType);
  const developmentLand = isDevelopmentLand(selectedType);
  const landProperty = isLandPropertyType(selectedType);
  const statusOptions = developmentLand
    ? developmentLandStatuses
    : standardPropertyStatuses;
  const initialStatus =
    property?.status && (statusOptions as readonly string[]).includes(property.status)
      ? property.status
      : "draft";
  const [selectedStatus, setSelectedStatus] =
    useState<PropertyStatus>(initialStatus);
  const [plotSize, setPlotSize] = useState(
    String(property?.plot_size_m2 ?? property?.area_m2 ?? ""),
  );
  const [coefficient, setCoefficient] = useState(
    String(property?.building_coefficient ?? ""),
  );
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<PropertyUploadQueueItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const isSq = locale === "sq";

  const grossBuildableArea = useMemo(() => {
    return calculateGrossBuildableArea(toNumber(plotSize), toNumber(coefficient));
  }, [coefficient, plotSize]);

  function changeType(type: PropertyType) {
    if (
      type === "development_land" &&
      property?.type &&
      property.type !== "development_land" &&
      property.price_eur != null
    ) {
      const confirmed = window.confirm(
        locale === "sq"
          ? "Ndryshimi i këtij listimi në Tokë Zhvillimi do të heqë çmimin nga formulari aktiv dhe do ta kalojë validimin në kushte me përqindje."
          : "Changing this listing to Development Land will remove the asking price from the active form and switch validation to percentage-based terms.",
      );

      if (!confirmed) {
        return;
      }
    }

    setSelectedType(type);
    const nextStatuses =
      type === "development_land" ? developmentLandStatuses : standardPropertyStatuses;

    if (!(nextStatuses as readonly string[]).includes(selectedStatus)) {
      setSelectedStatus("draft");
    }
  }

  function updateQueueItem(
    index: number,
    patch: Partial<PropertyUploadQueueItem>,
  ) {
    setUploadQueue((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setSelectedMediaFiles(files);
    setUploadQueue(createInitialUploadQueue(files));
    setUploadError(null);
  }

  async function handleDirectMediaSubmit(event: FormEvent<HTMLFormElement>) {
    if (typeof action !== "string" || selectedMediaFiles.length === 0) {
      return;
    }

    event.preventDefault();
    setUploadError(null);
    setUploadQueue(
      createInitialUploadQueue(selectedMediaFiles).map((item) => ({
        ...item,
        status: "validating",
      })),
    );

    const validationError = await validatePropertyMediaSelection(
      selectedMediaFiles,
      locale,
      property?.property_media,
    );

    if (validationError) {
      setUploadError(validationError);
      setUploadQueue((current) =>
        current.map((item) => ({ ...item, error: validationError, status: "error" })),
      );
      return;
    }

    setUploadQueue((current) =>
      current.map((item) => ({ ...item, status: "ready" })),
    );
    setIsUploadingMedia(true);
    let savedPropertyId = property?.id;

    try {
      const payload = new FormData(event.currentTarget);
      payload.delete("media");

      const response = await fetch(action, {
        body: payload,
        headers: {
          "x-prona-response": "json",
        },
        method: "POST",
      });

      const result = (await response.json()) as PropertyMutationResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.propertyId ||
        !result.propertyTitle
      ) {
        setUploadError(getMediaMutationErrorMessage(locale, result));
        setIsUploadingMedia(false);
        return;
      }

      savedPropertyId = result.propertyId;

      await uploadPropertyMediaDirect({
        files: selectedMediaFiles,
        locale,
        propertyId: result.propertyId,
        propertyTitle: result.propertyTitle,
        startIndex: result.mediaCount || 0,
        updateQueueItem,
      });

      window.location.assign(result.redirectPath || "/sales");
    } catch {
      const message = isSq
        ? "Prona u ruajt, por ngarkimi i medias deshtoi. Do te kalosh te faqja e ndryshimit per te provuar perseri."
        : "The property was saved, but media upload failed. You will be taken to the edit page to try again.";

      setUploadError(message);

      if (savedPropertyId) {
        window.location.assign(
          `/properties/${savedPropertyId}/edit?message=${encodeURIComponent(message)}`,
        );
      }
    } finally {
      setIsUploadingMedia(false);
    }
  }

  return (
    <form
      action={action}
      className="grid gap-5"
      encType={typeof action === "string" ? "multipart/form-data" : undefined}
      onSubmit={(event) => {
        if (typeof action === "string" && selectedMediaFiles.length > 0) {
          void handleDirectMediaSubmit(event);
        }
      }}
      method={typeof action === "string" ? "post" : undefined}
    >
      {!developmentLand ? (
        <input
          name="visibility"
          type="hidden"
          value={property?.visibility || "internal_only"}
        />
      ) : null}

      <Section
        description={
          developmentLand
            ? locale === "sq"
              ? "Toka për zhvillim ndiqet si mundësi me përqindje midis pronarit të tokës dhe zhvilluesit. Nuk përdoret çmim fiks."
              : "Development Land is tracked as a percentage-based landowner-to-developer opportunity. No fixed asking price is used."
            : locale === "sq"
              ? "Krijo një listim standard shitjeje me çmim, sipërfaqe, dhoma, media dhe status publikimi."
              : "Create a standard sales listing with price, size, rooms, media, and publishing status."
        }
        title={
          developmentLand
            ? locale === "sq"
              ? "Detajet bazë të tokës"
              : "Basic Land Details"
            : locale === "sq"
              ? "Detajet e pronës"
              : "Property details"
        }
      >
        <Field
          className="md:col-span-2"
          label={locale === "sq" ? "Titulli i pronës" : "Property title"}
        >
          <input
            className={inputClass}
            defaultValue={property?.title}
            name="title"
            placeholder={
              developmentLand
                ? isSq
                  ? "Tokë zhvillimi në Kodra Priftit"
                  : "Development land in Kodra Priftit"
                : isSq
                  ? "Apartament modern në Blloku"
                  : "Modern apartment in Blloku"
            }
            required
          />
        </Field>

        <Field label={locale === "sq" ? "Tipi" : "Type"}>
          <select
            className={inputClass}
            name="type"
            onChange={(event) => changeType(event.target.value as PropertyType)}
            required
            value={selectedType}
          >
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {formatPropertyType(type, locale)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={locale === "sq" ? "Statusi" : "Status"}>
          <select
            className={inputClass}
            name="status"
            onChange={(event) => setSelectedStatus(event.target.value as PropertyStatus)}
            required
            value={selectedStatus}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status, locale)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={locale === "sq" ? "Qyteti" : "City"}>
          <input
            className={inputClass}
            defaultValue={property?.city}
            name="city"
            placeholder="Tirana"
            required
          />
        </Field>

        <Field
          label={
            developmentLand
              ? locale === "sq"
                ? "Zona / lagjja"
                : "Zone / neighborhood"
              : locale === "sq"
                ? "Lagjja"
                : "Neighborhood"
          }
        >
          <input
            className={inputClass}
            defaultValue={property?.neighborhood || ""}
            name="neighborhood"
            placeholder="Farka, Blloku, Kodra Priftit"
          />
        </Field>

        <Field
          className="md:col-span-2"
          label={
            locale === "sq"
              ? "Adresa ose vendndodhja e përafërt"
              : "Address or approximate location"
          }
        >
          <input
            className={inputClass}
            defaultValue={property?.address || ""}
            name="address"
            placeholder={
              isSq
                ? "Rruga, kufijtë ose detajet e aksesit në parcelë"
                : "Street, boundary, or site access details"
            }
          />
        </Field>
      </Section>

      {developmentLand ? (
        <>
          <Section
            description={
              isSq
                ? "Këto fusha ndihmojnë ekipin të vlerësojë fizibilitetin para se mundësia t'u prezantohet zhvilluesve."
                : "These fields help the team evaluate feasibility before presenting the opportunity to developers."
            }
            title={isSq ? "Vendndodhja & informacioni kadastral" : "Location & Cadastral Information"}
          >
            <Field label={isSq ? "Sipërfaqja e parcelës m2" : "Plot size m2"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.plot_size_m2 ?? property?.area_m2)}
                min="0"
                name="plot_size_m2"
                onChange={(event) => setPlotSize(event.target.value)}
                placeholder="800"
                required={selectedStatus !== "draft"}
                step="1"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Zona kadastrale" : "Cadastral zone"}>
              <input
                className={inputClass}
                defaultValue={property?.cadastral_zone || ""}
                name="cadastral_zone"
                placeholder="Kodra Priftit"
              />
            </Field>

            <Field label={isSq ? "Numri i parcelës" : "Parcel number"}>
              <input
                className={inputClass}
                defaultValue={property?.parcel_number || ""}
                name="parcel_number"
                placeholder={isSq ? "Parcela / ID reference" : "Parcel / reference ID"}
              />
            </Field>

            <Field label={isSq ? "Numri i certifikatës së pronësisë" : "Land certificate number"}>
              <input
                className={inputClass}
                defaultValue={property?.land_certificate_number || ""}
                name="land_certificate_number"
                placeholder={isSq ? "Numri i certifikatës" : "Certificate number"}
              />
            </Field>

            <Field label={isSq ? "Statusi i pronësisë" : "Ownership status"}>
              <input
                className={inputClass}
                defaultValue={property?.ownership_status || ""}
                name="ownership_status"
                placeholder={
                  isSq
                    ? "Një pronar, e përbashkët, në konflikt, e verifikuar"
                    : "Single owner, shared, disputed, verified"
                }
              />
            </Field>

            <Field label={isSq ? "Numri i pronarëve të tokës" : "Number of landowners"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.landowners_count)}
                min="0"
                name="landowners_count"
                type="number"
              />
            </Field>
          </Section>

          <Section title={isSq ? "Parcela & potenciali i zhvillimit" : "Plot & Development Potential"}>
            <Field label={isSq ? "Përdorimi aktual i tokës" : "Current land use"}>
              <input
                className={inputClass}
                defaultValue={property?.current_land_use || ""}
                name="current_land_use"
                placeholder={isSq ? "Rezidenciale, e përzier, bujqësore" : "Residential, mixed, agricultural"}
              />
            </Field>

            <Field label={isSq ? "Zona e zhvillimit" : "Development zone"}>
              <input
                className={inputClass}
                defaultValue={property?.development_zone || ""}
                name="development_zone"
                placeholder={isSq ? "Zonë urbane / destinacion planifikimi" : "Urban zone / planning designation"}
              />
            </Field>

            <Field label={isSq ? "Koeficienti i ndërtimit" : "Building coefficient"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.building_coefficient)}
                min="0"
                name="building_coefficient"
                onChange={(event) => setCoefficient(event.target.value)}
                placeholder="2.5"
                step="0.01"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Numri maksimal i kateve" : "Maximum floors allowed"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.max_floors)}
                min="0"
                name="max_floors"
                placeholder="8"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Sipërfaqja bruto e ndërtueshme m2" : "Estimated gross buildable area m2"}>
              <input
                className={inputClass}
                name="estimated_gross_buildable_area_m2"
                readOnly
                value={
                  grossBuildableArea ??
                  property?.estimated_gross_buildable_area_m2 ??
                  ""
                }
              />
            </Field>

            <Field label={isSq ? "Sipërfaqja neto e shitshme m2" : "Estimated net sellable area m2"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_net_sellable_area_m2)}
                min="0"
                name="estimated_net_sellable_area_m2"
                placeholder="1600"
                step="1"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Apartamente të vlerësuara" : "Estimated apartments"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_apartments)}
                min="0"
                name="estimated_apartments"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Garazhe të vlerësuara" : "Estimated garages"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_garages)}
                min="0"
                name="estimated_garages"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Vende parkimi" : "Parking spaces"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_parking_spaces)}
                min="0"
                name="estimated_parking_spaces"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Njësi komerciale" : "Commercial units"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_commercial_units)}
                min="0"
                name="estimated_commercial_units"
                type="number"
              />
            </Field>
          </Section>

          <Section title={isSq ? "Marrëveshja me pronarin e tokës" : "Landowner Agreement"}>
            <Field label={isSq ? "Përqindja e kërkuar nga pronari" : "Landowner requested percentage"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.landowner_requested_percentage)}
                max="100"
                min="0"
                name="landowner_requested_percentage"
                placeholder="35"
                required={selectedStatus === "ready_for_developers"}
                step="0.01"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Përqindja minimale e pranueshme" : "Minimum acceptable percentage"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.minimum_acceptable_percentage)}
                max="100"
                min="0"
                name="minimum_acceptable_percentage"
                placeholder="30"
                step="0.01"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Forma e preferuar e kompensimit" : "Preferred compensation type"}>
              <select
                className={inputClass}
                defaultValue={property?.preferred_compensation_type || ""}
                name="preferred_compensation_type"
              >
                <option value="">
                  {isSq ? "Zgjidh kompensimin" : "Choose compensation"}
                </option>
                <option value="apartments">{isSq ? "Apartamente" : "Apartments"}</option>
                <option value="garages">{isSq ? "Garazhe" : "Garages"}</option>
                <option value="commercial_units">
                  {isSq ? "Njësi komerciale" : "Commercial units"}
                </option>
                <option value="mixed_units">{isSq ? "Njësi të përziera" : "Mixed units"}</option>
              </select>
            </Field>

            <Field label={isSq ? "Shpërndarja e preferuar e kateve" : "Preferred floor allocation"}>
              <input
                className={inputClass}
                defaultValue={property?.preferred_floor_allocation || ""}
                name="preferred_floor_allocation"
                placeholder={isSq ? "Kate të mesme, kati i fundit, të përziera" : "Middle floors, top floor, mixed"}
              />
            </Field>

            <Field label={isSq ? "Orientimi i preferuar" : "Preferred orientation"}>
              <input
                className={inputClass}
                defaultValue={property?.preferred_unit_orientation || ""}
                name="preferred_unit_orientation"
                placeholder={isSq ? "Nga jugu, pamje deti, nga rruga" : "South-facing, sea view, street side"}
              />
            </Field>

            <Field label={isSq ? "Statusi i negociimit" : "Negotiation status"}>
              <input
                className={inputClass}
                defaultValue={property?.negotiation_status || ""}
                name="negotiation_status"
                placeholder={isSq ? "Hapur, në shqyrtim, dakordësuar, refuzuar" : "Open, under review, agreed, rejected"}
              />
            </Field>

            <Field className="md:col-span-2" label={isSq ? "Shënime marrëveshjeje" : "Agreement notes"}>
              <textarea
                className={textareaClass}
                defaultValue={property?.agreement_notes || ""}
                name="agreement_notes"
                placeholder={
                  isSq
                    ? "Pritshmëritë e pronarit, rreziqet, kushtet e dakordësuara dhe kufizimet."
                    : "Owner expectations, risks, agreed terms, and constraints."
                }
                rows={4}
              />
            </Field>
          </Section>

          <Section title={isSq ? "Interesi i zhvilluesit" : "Developer Interest"}>
            <Field label={isSq ? "Emri i zhvilluesit" : "Developer name"}>
              <input
                className={inputClass}
                defaultValue={property?.developer_name || ""}
                name="developer_name"
                placeholder={isSq ? "Kompania zhvilluese ose kontakti" : "Developer company or contact"}
              />
            </Field>

            <Field label={isSq ? "Kontakti i zhvilluesit" : "Developer contact"}>
              <input
                className={inputClass}
                defaultValue={property?.developer_contact || ""}
                name="developer_contact"
                placeholder={isSq ? "Telefon, email ose shënime" : "Phone, email, or notes"}
              />
            </Field>

            <Field label={isSq ? "Përqindja e ofruar nga zhvilluesi" : "Developer offered percentage"}>
              <input
                className={inputClass}
                defaultValue={numberValue(property?.developer_offered_percentage)}
                max="100"
                min="0"
                name="developer_offered_percentage"
                placeholder="32"
                step="0.01"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Statusi i ofertës" : "Offer status"}>
              <input
                className={inputClass}
                defaultValue={property?.developer_offer_status || ""}
                name="developer_offer_status"
                placeholder={isSq ? "Marrë, prezantuar, pranuar, refuzuar" : "Received, presented, accepted, rejected"}
              />
            </Field>

            <Field label={isSq ? "Madhësia e propozuar e projektit" : "Proposed project size"}>
              <input
                className={inputClass}
                defaultValue={property?.developer_proposed_project_size || ""}
                name="developer_proposed_project_size"
                placeholder={isSq ? "Afërsisht 2,000 m2 / 24 njësi" : "Approx. 2,000 m2 / 24 units"}
              />
            </Field>

            <Field label={isSq ? "Afati i dorëzimit" : "Delivery timeline"}>
              <input
                className={inputClass}
                defaultValue={property?.developer_proposed_delivery_timeline || ""}
                name="developer_proposed_delivery_timeline"
                placeholder={isSq ? "24 muaj pas lejes" : "24 months after permit"}
              />
            </Field>

            <Field className="md:col-span-2" label={isSq ? "Shpërndarja e propozuar e njësive" : "Proposed unit allocation"}>
              <input
                className={inputClass}
                defaultValue={property?.developer_proposed_unit_allocation || ""}
                name="developer_proposed_unit_allocation"
                placeholder={isSq ? "6 apartamente, 2 garazhe, 1 njësi komerciale" : "6 apartments, 2 garages, 1 commercial unit"}
              />
            </Field>

            <Field className="md:col-span-2" label={isSq ? "Kushtet e zhvilluesit" : "Developer conditions"}>
              <textarea
                className={textareaClass}
                defaultValue={property?.developer_conditions || ""}
                name="developer_conditions"
                placeholder={isSq ? "Leja, aksesi në rrugë, verifikimi i dokumenteve, kushtet e pagesës." : "Permit, road access, document verification, payment terms."}
                rows={4}
              />
            </Field>
          </Section>

          <Section title={isSq ? "Planifikimi, aksesi & dukshmëria" : "Planning, Access & Visibility"}>
            <Field label={isSq ? "Aksesi në rrugë" : "Road access"}>
              <input
                className={inputClass}
                defaultValue={property?.road_access || ""}
                name="road_access"
                placeholder={isSq ? "Rrugë publike, akses privat, në pritje" : "Public road, private access, pending"}
              />
            </Field>

            <Field label={isSq ? "Aksesi në utilitete" : "Utilities access"}>
              <input
                className={inputClass}
                defaultValue={property?.utilities_access || ""}
                name="utilities_access"
                placeholder={isSq ? "Ujë, energji elektrike, kanalizime, në pritje" : "Water, electricity, sewage, pending"}
              />
            </Field>

            <Field label={isSq ? "Statusi i lejes së planifikimit" : "Planning permission status"}>
              <input
                className={inputClass}
                defaultValue={property?.planning_permission_status || ""}
                name="planning_permission_status"
                placeholder={isSq ? "I panjohur, në pritje, miratuar" : "Unknown, pending, approved"}
              />
            </Field>

            <Field label={isSq ? "Statusi i lejes së ndërtimit" : "Construction permit status"}>
              <input
                className={inputClass}
                defaultValue={property?.construction_permit_status || ""}
                name="construction_permit_status"
                placeholder={isSq ? "E pafilluar, në pritje, miratuar" : "Not started, pending, approved"}
              />
            </Field>

            <Field label={isSq ? "Statusi i studimit urbanistik" : "Urban study status"}>
              <input
                className={inputClass}
                defaultValue={property?.urban_study_status || ""}
                name="urban_study_status"
                placeholder={isSq ? "Kërkohet, në shqyrtim, miratuar" : "Required, in review, approved"}
              />
            </Field>

            <Field label={isSq ? "Dukshmëria" : "Visibility"}>
              <select
                className={inputClass}
                defaultValue={property?.visibility || "internal_only"}
                name="visibility"
              >
                <option value="internal_only">
                  {isSq ? "Vetëm e brendshme" : "Internal Only"}
                </option>
                <option value="available_to_developers">
                  {isSq ? "E disponueshme për zhvillues" : "Available to Developers"}
                </option>
                <option value="manager_approved_public">
                  {isSq ? "Publike me miratim menaxheri" : "Manager Approved Public"}
                </option>
              </select>
            </Field>
          </Section>
        </>
      ) : (
        <Section
          title={
            locale === "sq" ? "Informacioni i listimit për shitje" : "Sales Listing Information"
          }
        >
          <Field label={locale === "sq" ? "Çmimi EUR" : "Price EUR"}>
            <input
              className={inputClass}
              defaultValue={numberValue(property?.price_eur)}
              min="0"
              name="price_eur"
              placeholder="245000"
              required
              step="100"
              type="number"
            />
          </Field>

          <Field label={locale === "sq" ? "Sipërfaqe m2" : "Area m2"}>
            <input
              className={inputClass}
              defaultValue={numberValue(property?.area_m2)}
              min="0"
              name="area_m2"
              placeholder="118"
              step="1"
              type="number"
            />
          </Field>

          {!landProperty ? (
            <>
              <Field label={locale === "sq" ? "Dhoma gjumi" : "Bedrooms"}>
                <input
                  className={inputClass}
                  defaultValue={numberValue(property?.bedrooms)}
                  min="0"
                  name="bedrooms"
                  type="number"
                />
              </Field>

              <Field label={locale === "sq" ? "Banjo" : "Bathrooms"}>
                <input
                  className={inputClass}
                  defaultValue={numberValue(property?.bathrooms)}
                  min="0"
                  name="bathrooms"
                  type="number"
                />
              </Field>

              <Field label={locale === "sq" ? "Viti i ndërtimit" : "Year built"}>
                <input
                  className={inputClass}
                  defaultValue={numberValue(property?.year_built)}
                  max="2100"
                  min="1800"
                  name="year_built"
                  type="number"
                />
              </Field>
            </>
          ) : null}
        </Section>
      )}

      <Section
        title={
          developmentLand
            ? locale === "sq"
              ? "Dokumente / Media / Harta"
              : "Documents / Media / Maps"
            : locale === "sq"
              ? "Media dhe shënime"
              : "Media and notes"
        }
      >
        <Field
          label={
            developmentLand
              ? locale === "sq"
                ? "Media dhe dokumente të tokës"
                : "Land media and documents"
              : locale === "sq"
                ? "Media e pronës"
                : "Property media"
          }
        >
          <input
            accept={propertyMediaAccept}
            className="w-full min-w-0 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-orange-700"
            onChange={handleMediaChange}
            multiple
            name="media"
            type="file"
          />
          <span className="text-xs font-normal leading-5 text-slate-500">
            {isSq
              ? `Ngarko deri ne ${propertyMediaMaxFiles} skedare njekohesisht. Foto: JPG, PNG, WebP, AVIF, GIF. Video: MP4, WebM, MOV deri ne ${propertyVideoMaxDurationSeconds} sekonda dhe ${propertyVideoMaxSizeMb} MB. Dokumente: PDF.`
              : propertyMediaHelpText}
          </span>
          {uploadError ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              {uploadError}
            </div>
          ) : null}
          {uploadQueue.length > 0 ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {isSq ? "Radha e ngarkimit" : "Upload queue"}
                </p>
                <p className="text-xs text-slate-500">
                  {isSq
                    ? "Video: maksimumi 1 minute dhe 25 MB."
                    : "Video: maximum 1 minute and 25 MB."}
                </p>
              </div>
              <div className="grid gap-2">
                {uploadQueue.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getQueueStatusLabel(item.status, locale)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        {item.progress}%
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === "error"
                            ? "bg-rose-500"
                            : item.status === "done"
                              ? "bg-emerald-500"
                              : "bg-orange-500"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.error ? (
                      <p className="mt-2 text-xs text-rose-600">{item.error}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Field>

        <Field
          className="md:col-span-2"
          label={
            locale === "sq"
              ? "Përshkrimi / shënime të brendshme"
              : "Description / internal notes"
          }
        >
          <textarea
            className={textareaClass}
            defaultValue={property?.description || ""}
            name="description"
            placeholder={
              developmentLand
                ? locale === "sq"
                  ? "Përmbledhje e mundësisë së tokës, shënime pronësie, kontekst planifikimi dhe hapi i radhës."
                  : "Land opportunity summary, ownership notes, planning context, and next action."
                : locale === "sq"
                  ? "Pikat kryesore të shitjes, rifiniturat, pamja, parkimi dhe statusi ligjor."
                  : "Key selling points, finishes, view, parking, and legal status."
            }
            rows={4}
          />
        </Field>
      </Section>

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300 sm:w-fit"
        disabled={isUploadingMedia}
      >
        {isUploadingMedia
          ? isSq
            ? "Po ruhet dhe po ngarkohet media..."
            : "Saving and uploading media..."
          : submitLabel}
      </button>
    </form>
  );
}
