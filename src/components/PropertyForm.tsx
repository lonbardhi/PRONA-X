"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AssetDuplicateCandidate,
  PropertyRecord,
  PropertyStatus,
  PropertyTransactionType,
  PropertyType,
} from "@/lib/properties";
import {
  calculateGrossBuildableArea,
  findDuplicateAssetCandidates,
  formatRentPeriodLabel,
  formatPropertyType,
  formatStatusLabel,
  getPropertyWorkflowStatuses,
  isSameTransactionWorkflow,
  isRentalTransaction,
  isDevelopmentLand,
  isLandPropertyType,
  rentPeriods,
  propertyTypes,
} from "@/lib/properties";
import {
  createInitialUploadQueue,
  getExistingPropertyMediaCount,
  getMediaMutationErrorMessage,
  getPropertyMediaSelectionLimitMessage,
  getUploadSummaryMessage,
  type PropertyMutationResponse,
  type PropertyUploadQueueItem,
  uploadPropertyMediaDirect,
  validatePropertyMediaQueueItem,
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
  assetCandidates?: AssetDuplicateCandidate[];
  defaultType?: PropertyType;
  locale?: Locale;
  property?: PropertyRecord;
  submitLabel: string;
  transactionType?: PropertyTransactionType;
};

type FieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
};

function Field({ children, className = "", label }: FieldProps) {
  return (
    <Label
      className={`grid min-w-0 gap-2 text-sm font-medium text-foreground ${className}`}
    >
      {label}
      {children}
    </Label>
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
    <section className="crm-section">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

const inputClass = "focus-visible:border-orange-500 focus-visible:ring-orange-100";
const textareaClass = "focus-visible:border-orange-500 focus-visible:ring-orange-100";

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
      return isSq ? "Po lidhet me pronën" : "Saving to property";
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
  assetCandidates = [],
  defaultType,
  locale = defaultLocale,
  property,
  submitLabel,
  transactionType,
}: PropertyFormProps) {
  const activeTransactionType =
    transactionType || property?.transaction_type || "sale";
  const rentalWorkflow = isRentalTransaction(activeTransactionType);
  const initialType = property?.type || defaultType || "apartment";
  const [selectedType, setSelectedType] = useState<PropertyType>(initialType);
  const developmentLand = isDevelopmentLand(selectedType);
  const developmentExchangeWorkflow = developmentLand && !rentalWorkflow;
  const landProperty = isLandPropertyType(selectedType);
  const statusOptions = getPropertyWorkflowStatuses(
    activeTransactionType,
    selectedType,
  );
  const initialStatus =
    property?.status && (statusOptions as readonly string[]).includes(property.status)
      ? property.status
      : "draft";
  const [selectedStatus, setSelectedStatus] =
    useState<PropertyStatus>(initialStatus);
  const [plotSize, setPlotSize] = useState(
    String(property?.plot_size_m2 ?? property?.area_m2 ?? ""),
  );
  const [areaSize, setAreaSize] = useState(String(property?.area_m2 ?? ""));
  const [cityValue, setCityValue] = useState(property?.city || "");
  const [neighborhoodValue, setNeighborhoodValue] = useState(
    property?.neighborhood || "",
  );
  const [addressValue, setAddressValue] = useState(property?.address || "");
  const [coefficient, setCoefficient] = useState(
    String(property?.building_coefficient ?? ""),
  );
  const [priceOnRequest, setPriceOnRequest] = useState(
    Boolean(property?.price_on_request),
  );
  const [uploadQueue, setUploadQueue] = useState<PropertyUploadQueueItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [savedMediaProperty, setSavedMediaProperty] = useState<{
    id: string;
    redirectPath?: string;
    startIndex: number;
    title: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaUploadLockRef = useRef(false);
  const isSq = locale === "sq";
  const existingMediaCount = getExistingPropertyMediaCount(property?.property_media);
  const mediaItemsPendingUpload = uploadQueue.filter(
    (item) => item.status !== "done" && item.status !== "cancelled",
  );
  const hasBlockingMediaState = uploadQueue.some(
    (item) => item.status === "validating" || item.status === "uploading" || item.status === "saving",
  );
  const isValidatingMedia = uploadQueue.some((item) => item.status === "validating");

  const grossBuildableArea = useMemo(() => {
    return calculateGrossBuildableArea(toNumber(plotSize), toNumber(coefficient));
  }, [coefficient, plotSize]);
  const duplicateAssetMatches = useMemo(() => {
    if (property || assetCandidates.length === 0) {
      return [];
    }

    return findDuplicateAssetCandidates(
      {
        address: addressValue,
        area_m2: toNumber(areaSize),
        city: cityValue,
        neighborhood: neighborhoodValue,
        plot_size_m2: toNumber(plotSize),
        type: selectedType,
      },
      assetCandidates,
    );
  }, [
    addressValue,
    areaSize,
    assetCandidates,
    cityValue,
    neighborhoodValue,
    plotSize,
    property,
    selectedType,
  ]);

  function changeType(type: PropertyType) {
    if (
      type === "development_land" &&
      !rentalWorkflow &&
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
    const nextStatuses = getPropertyWorkflowStatuses(activeTransactionType, type);

    if (!(nextStatuses as readonly string[]).includes(selectedStatus)) {
      setSelectedStatus("draft");
    }
  }

  function updateQueueItem(
    itemId: string,
    patch: Partial<PropertyUploadQueueItem>,
  ) {
    setUploadQueue((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    setUploadError(null);

    const activeQueueCount = uploadQueue.filter(
      (item) => item.status !== "cancelled",
    ).length;
    const remainingSlots = Math.max(
      0,
      propertyMediaMaxFiles - existingMediaCount - activeQueueCount,
    );

    if (remainingSlots <= 0) {
      setUploadError(
        getPropertyMediaSelectionLimitMessage(locale, existingMediaCount + activeQueueCount),
      );
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    const rejectedCount = files.length - acceptedFiles.length;
    const nextItems = createInitialUploadQueue(acceptedFiles, activeQueueCount);

    if (rejectedCount > 0) {
      setUploadError(
        isSq
          ? `${rejectedCount} skedarë nuk u shtuan sepse maksimumi është ${propertyMediaMaxFiles}.`
          : `${rejectedCount} files were not added because the maximum is ${propertyMediaMaxFiles}.`,
      );
    }

    setUploadQueue((current) => [...current, ...nextItems]);

    await Promise.all(
      nextItems.map(async (item) => {
        const error = await validatePropertyMediaQueueItem(item, locale);
        updateQueueItem(
          item.id,
          error ? { error, status: "error" } : { error: undefined, status: "ready" },
        );
      }),
    );
  }

  async function handleDirectMediaSubmit(event: FormEvent<HTMLFormElement>) {
    if (typeof action !== "string" || mediaItemsPendingUpload.length === 0) {
      return;
    }

    event.preventDefault();

    if (mediaUploadLockRef.current) {
      return;
    }

    mediaUploadLockRef.current = true;
    setUploadError(null);

    try {
      if (uploadQueue.some((item) => item.status === "validating")) {
        setUploadError(
          isSq
            ? "Prit derisa validimi i medias të përfundojë."
            : "Wait until media validation finishes.",
        );
        return;
      }

      const invalidItems = uploadQueue.filter((item) => item.status === "error");
      if (invalidItems.length > 0) {
        setUploadError(
          isSq
            ? "Hiq ose rregullo skedarët me gabim para se të ruash pronën."
            : "Remove or fix files with errors before saving the property.",
        );
        return;
      }

      const totalAfterUpload = existingMediaCount + mediaItemsPendingUpload.length;
      if (totalAfterUpload > propertyMediaMaxFiles) {
        setUploadError(
          getPropertyMediaSelectionLimitMessage(locale, existingMediaCount),
        );
        return;
      }

      setIsUploadingMedia(true);
      const result = savedMediaProperty
        ? ({
            mediaCount: savedMediaProperty.startIndex,
            propertyId: savedMediaProperty.id,
            propertyTitle: savedMediaProperty.title,
            redirectPath: savedMediaProperty.redirectPath,
            success: true,
          } satisfies PropertyMutationResponse)
        : await savePropertyForMediaUpload(event.currentTarget);

      if (!result.propertyId || !result.propertyTitle) {
        setUploadError(getMediaMutationErrorMessage(locale, result));
        return;
      }

      setSavedMediaProperty({
        id: result.propertyId,
        redirectPath: result.redirectPath,
        startIndex: result.mediaCount || 0,
        title: result.propertyTitle,
      });

      const summary = await uploadPropertyMediaDirect({
        items: mediaItemsPendingUpload,
        locale,
        propertyId: result.propertyId,
        propertyTitle: result.propertyTitle,
        startIndex: result.mediaCount || 0,
        updateQueueItem,
      });

      const summaryMessage = getUploadSummaryMessage(
        locale,
        summary.failed.length,
        summary.succeeded.length,
      );

      if (summaryMessage) {
        setUploadError(summaryMessage);
        return;
      }

      setUploadQueue([]);
      setSavedMediaProperty(null);
      window.location.assign(result.redirectPath || (rentalWorkflow ? "/rentals" : "/sales"));
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : isSq
            ? "Prona nuk u ruajt. Kontrollo fushat dhe provo perseri."
            : "The property could not be saved. Check the fields and try again.",
      );
    } finally {
      mediaUploadLockRef.current = false;
      setIsUploadingMedia(false);
    }
  }

  async function savePropertyForMediaUpload(form: HTMLFormElement) {
    const payload = new FormData(form);
    payload.delete("media");

    const response = await fetch(action as string, {
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
      throw new Error(getMediaMutationErrorMessage(locale, result));
    }

    return result;
  }

  function removeQueueItem(itemId: string) {
    if (isUploadingMedia) {
      return;
    }

    setUploadQueue((current) => current.filter((item) => item.id !== itemId));
    setUploadError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function retryFailedUploads() {
    if (!savedMediaProperty || mediaUploadLockRef.current) {
      return;
    }

    const retryItems = uploadQueue.filter((item) => item.status === "error");
    if (retryItems.length === 0) {
      return;
    }

    setUploadError(null);
    setIsUploadingMedia(true);
    mediaUploadLockRef.current = true;

    try {
      const summary = await uploadPropertyMediaDirect({
        items: retryItems,
        locale,
        propertyId: savedMediaProperty.id,
        propertyTitle: savedMediaProperty.title,
        startIndex: savedMediaProperty.startIndex,
        updateQueueItem,
      });
      const summaryMessage = getUploadSummaryMessage(
        locale,
        summary.failed.length,
        summary.succeeded.length,
      );

      if (summaryMessage) {
        setUploadError(summaryMessage);
        return;
      }

      setUploadQueue([]);
      setSavedMediaProperty(null);
      window.location.assign(
        savedMediaProperty.redirectPath || (rentalWorkflow ? "/rentals" : "/sales"),
      );
    } finally {
      mediaUploadLockRef.current = false;
      setIsUploadingMedia(false);
    }
  }

  return (
    <form
      action={action}
      className="grid gap-5"
      encType={typeof action === "string" ? "multipart/form-data" : undefined}
      onSubmit={(event) => {
        if (typeof action === "string" && mediaItemsPendingUpload.length > 0) {
          void handleDirectMediaSubmit(event);
        }
      }}
      method={typeof action === "string" ? "post" : undefined}
    >
      <input name="transaction_type" type="hidden" value={activeTransactionType} />
      {!developmentExchangeWorkflow ? (
        <input
          name="visibility"
          type="hidden"
          value={property?.visibility || "internal_only"}
        />
      ) : null}

      <Section
        description={
          developmentExchangeWorkflow
            ? locale === "sq"
              ? "Toka për zhvillim ndiqet si mundësi me përqindje midis pronarit të tokës dhe zhvilluesit. Nuk përdoret çmim fiks."
              : "Development Land is tracked as a percentage-based landowner-to-developer opportunity. No fixed asking price is used."
            : rentalWorkflow
              ? locale === "sq"
                ? "Krijo një listim qiraje me qira, periudhë, disponueshmëri, media dhe status qiraje."
                : "Create a rental listing with rent, period, availability, media, and rental status."
              : locale === "sq"
                ? "Krijo një listim standard shitjeje me çmim, sipërfaqe, dhoma, media dhe status publikimi."
                : "Create a standard sales listing with price, size, rooms, media, and publishing status."
        }
        title={
          developmentExchangeWorkflow
            ? locale === "sq"
              ? "Detajet bazë të tokës"
              : "Basic Land Details"
            : rentalWorkflow
              ? locale === "sq"
                ? "Detajet e pronës me qira"
                : "Rental property details"
              : locale === "sq"
                ? "Detajet e pronës"
                : "Property details"
        }
      >
        <Field
          className="md:col-span-2"
          label={locale === "sq" ? "Titulli i pronës" : "Property title"}
        >
          <Input
            className={inputClass}
            defaultValue={property?.title}
            name="title"
            placeholder={
              developmentExchangeWorkflow
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
          <Select
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
          </Select>
        </Field>

        <Field label={locale === "sq" ? "Statusi" : "Status"}>
          <Select
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
          </Select>
        </Field>

        <Field label={locale === "sq" ? "Qyteti" : "City"}>
          <Input
            className={inputClass}
            defaultValue={property?.city}
            name="city"
            onChange={(event) => setCityValue(event.target.value)}
            placeholder="Tirana"
            required
          />
        </Field>

        <Field
          label={
            developmentExchangeWorkflow
              ? locale === "sq"
                ? "Zona / lagjja"
                : "Zone / neighborhood"
              : locale === "sq"
                ? "Lagjja"
                : "Neighborhood"
          }
        >
          <Input
            className={inputClass}
            defaultValue={property?.neighborhood || ""}
            name="neighborhood"
            onChange={(event) => setNeighborhoodValue(event.target.value)}
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
          <Input
            className={inputClass}
            defaultValue={property?.address || ""}
            name="address"
            onChange={(event) => setAddressValue(event.target.value)}
            placeholder={
              isSq
                ? "Rruga, kufijtë ose detajet e aksesit në parcelë"
                : "Street, boundary, or site access details"
            }
          />
        </Field>
      </Section>

      {developmentExchangeWorkflow ? (
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
              <Input
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
              <Input
                className={inputClass}
                defaultValue={property?.cadastral_zone || ""}
                name="cadastral_zone"
                placeholder="Kodra Priftit"
              />
            </Field>

            <Field label={isSq ? "Numri i parcelës" : "Parcel number"}>
              <Input
                className={inputClass}
                defaultValue={property?.parcel_number || ""}
                name="parcel_number"
                placeholder={isSq ? "Parcela / ID reference" : "Parcel / reference ID"}
              />
            </Field>

            <Field label={isSq ? "Numri i certifikatës së pronësisë" : "Land certificate number"}>
              <Input
                className={inputClass}
                defaultValue={property?.land_certificate_number || ""}
                name="land_certificate_number"
                placeholder={isSq ? "Numri i certifikatës" : "Certificate number"}
              />
            </Field>

            <Field label={isSq ? "Statusi i pronësisë" : "Ownership status"}>
              <Input
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
              <Input
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
              <Input
                className={inputClass}
                defaultValue={property?.current_land_use || ""}
                name="current_land_use"
                placeholder={isSq ? "Rezidenciale, e përzier, bujqësore" : "Residential, mixed, agricultural"}
              />
            </Field>

            <Field label={isSq ? "Zona e zhvillimit" : "Development zone"}>
              <Input
                className={inputClass}
                defaultValue={property?.development_zone || ""}
                name="development_zone"
                placeholder={isSq ? "Zonë urbane / destinacion planifikimi" : "Urban zone / planning designation"}
              />
            </Field>

            <Field label={isSq ? "Koeficienti i ndërtimit" : "Building coefficient"}>
              <Input
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
              <Input
                className={inputClass}
                defaultValue={numberValue(property?.max_floors)}
                min="0"
                name="max_floors"
                placeholder="8"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Sipërfaqja bruto e ndërtueshme m2" : "Estimated gross buildable area m2"}>
              <Input
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
              <Input
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
              <Input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_apartments)}
                min="0"
                name="estimated_apartments"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Garazhe të vlerësuara" : "Estimated garages"}>
              <Input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_garages)}
                min="0"
                name="estimated_garages"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Vende parkimi" : "Parking spaces"}>
              <Input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_parking_spaces)}
                min="0"
                name="estimated_parking_spaces"
                type="number"
              />
            </Field>

            <Field label={isSq ? "Njësi komerciale" : "Commercial units"}>
              <Input
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
              <Input
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
              <Input
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
              <Select
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
              </Select>
            </Field>

            <Field label={isSq ? "Shpërndarja e preferuar e kateve" : "Preferred floor allocation"}>
              <Input
                className={inputClass}
                defaultValue={property?.preferred_floor_allocation || ""}
                name="preferred_floor_allocation"
                placeholder={isSq ? "Kate të mesme, kati i fundit, të përziera" : "Middle floors, top floor, mixed"}
              />
            </Field>

            <Field label={isSq ? "Orientimi i preferuar" : "Preferred orientation"}>
              <Input
                className={inputClass}
                defaultValue={property?.preferred_unit_orientation || ""}
                name="preferred_unit_orientation"
                placeholder={isSq ? "Nga jugu, pamje deti, nga rruga" : "South-facing, sea view, street side"}
              />
            </Field>

            <Field label={isSq ? "Statusi i negociimit" : "Negotiation status"}>
              <Input
                className={inputClass}
                defaultValue={property?.negotiation_status || ""}
                name="negotiation_status"
                placeholder={isSq ? "Hapur, në shqyrtim, dakordësuar, refuzuar" : "Open, under review, agreed, rejected"}
              />
            </Field>

            <Field className="md:col-span-2" label={isSq ? "Shënime marrëveshjeje" : "Agreement notes"}>
              <Textarea
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
              <Input
                className={inputClass}
                defaultValue={property?.developer_name || ""}
                name="developer_name"
                placeholder={isSq ? "Kompania zhvilluese ose kontakti" : "Developer company or contact"}
              />
            </Field>

            <Field label={isSq ? "Kontakti i zhvilluesit" : "Developer contact"}>
              <Input
                className={inputClass}
                defaultValue={property?.developer_contact || ""}
                name="developer_contact"
                placeholder={isSq ? "Telefon, email ose shënime" : "Phone, email, or notes"}
              />
            </Field>

            <Field label={isSq ? "Përqindja e ofruar nga zhvilluesi" : "Developer offered percentage"}>
              <Input
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
              <Input
                className={inputClass}
                defaultValue={property?.developer_offer_status || ""}
                name="developer_offer_status"
                placeholder={isSq ? "Marrë, prezantuar, pranuar, refuzuar" : "Received, presented, accepted, rejected"}
              />
            </Field>

            <Field label={isSq ? "Madhësia e propozuar e projektit" : "Proposed project size"}>
              <Input
                className={inputClass}
                defaultValue={property?.developer_proposed_project_size || ""}
                name="developer_proposed_project_size"
                placeholder={isSq ? "Afërsisht 2,000 m2 / 24 njësi" : "Approx. 2,000 m2 / 24 units"}
              />
            </Field>

            <Field label={isSq ? "Afati i dorëzimit" : "Delivery timeline"}>
              <Input
                className={inputClass}
                defaultValue={property?.developer_proposed_delivery_timeline || ""}
                name="developer_proposed_delivery_timeline"
                placeholder={isSq ? "24 muaj pas lejes" : "24 months after permit"}
              />
            </Field>

            <Field className="md:col-span-2" label={isSq ? "Shpërndarja e propozuar e njësive" : "Proposed unit allocation"}>
              <Input
                className={inputClass}
                defaultValue={property?.developer_proposed_unit_allocation || ""}
                name="developer_proposed_unit_allocation"
                placeholder={isSq ? "6 apartamente, 2 garazhe, 1 njësi komerciale" : "6 apartments, 2 garages, 1 commercial unit"}
              />
            </Field>

            <Field className="md:col-span-2" label={isSq ? "Kushtet e zhvilluesit" : "Developer conditions"}>
              <Textarea
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
              <Input
                className={inputClass}
                defaultValue={property?.road_access || ""}
                name="road_access"
                placeholder={isSq ? "Rrugë publike, akses privat, në pritje" : "Public road, private access, pending"}
              />
            </Field>

            <Field label={isSq ? "Aksesi në utilitete" : "Utilities access"}>
              <Input
                className={inputClass}
                defaultValue={property?.utilities_access || ""}
                name="utilities_access"
                placeholder={isSq ? "Ujë, energji elektrike, kanalizime, në pritje" : "Water, electricity, sewage, pending"}
              />
            </Field>

            <Field label={isSq ? "Statusi i lejes së planifikimit" : "Planning permission status"}>
              <Input
                className={inputClass}
                defaultValue={property?.planning_permission_status || ""}
                name="planning_permission_status"
                placeholder={isSq ? "I panjohur, në pritje, miratuar" : "Unknown, pending, approved"}
              />
            </Field>

            <Field label={isSq ? "Statusi i lejes së ndërtimit" : "Construction permit status"}>
              <Input
                className={inputClass}
                defaultValue={property?.construction_permit_status || ""}
                name="construction_permit_status"
                placeholder={isSq ? "E pafilluar, në pritje, miratuar" : "Not started, pending, approved"}
              />
            </Field>

            <Field label={isSq ? "Statusi i studimit urbanistik" : "Urban study status"}>
              <Input
                className={inputClass}
                defaultValue={property?.urban_study_status || ""}
                name="urban_study_status"
                placeholder={isSq ? "Kërkohet, në shqyrtim, miratuar" : "Required, in review, approved"}
              />
            </Field>

            <Field label={isSq ? "Dukshmëria" : "Visibility"}>
              <Select
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
              </Select>
            </Field>
          </Section>
        </>
      ) : (
        <Section
          title={
            rentalWorkflow
              ? locale === "sq"
                ? "Informacioni i listimit me qira"
                : "Rental Listing Information"
              : locale === "sq"
                ? "Informacioni i listimit për shitje"
                : "Sales Listing Information"
          }
        >
          <Field
            label={
              rentalWorkflow
                ? locale === "sq"
                  ? "Qiraja"
                  : "Rent"
                : locale === "sq"
                  ? "Çmimi i shitjes"
                  : "Sale price"
            }
          >
            <Input
              className={inputClass}
              defaultValue={numberValue(property?.price_eur)}
              min="0"
              name="price_eur"
              placeholder={rentalWorkflow ? "850" : "245000"}
              required={!priceOnRequest}
              step="100"
              type="number"
            />
          </Field>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
            <input
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={priceOnRequest}
              name="price_on_request"
              onChange={(event) => setPriceOnRequest(event.target.checked)}
              type="checkbox"
            />
            {rentalWorkflow
              ? locale === "sq"
                ? "Qiraja sipas kërkesës"
                : "Rent on request"
              : locale === "sq"
                ? "Çmimi sipas kërkesës"
                : "Price on request"}
          </label>

          <Field label={locale === "sq" ? "Sipërfaqe m2" : "Area m2"}>
            <Input
              className={inputClass}
              defaultValue={numberValue(property?.area_m2)}
              min="0"
              name="area_m2"
              onChange={(event) => setAreaSize(event.target.value)}
              placeholder="118"
              step="1"
              type="number"
            />
          </Field>

          {rentalWorkflow ? (
            <>
              <Field label={locale === "sq" ? "Periudha e qirasë" : "Rent period"}>
                <Select
                  className={inputClass}
                  defaultValue={property?.rent_period || "monthly"}
                  name="rent_period"
                  required
                >
                  {rentPeriods.map((period) => (
                    <option key={period} value={period}>
                      {formatRentPeriodLabel(period, locale)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={locale === "sq" ? "Depozita EUR" : "Deposit EUR"}>
                <Input
                  className={inputClass}
                  defaultValue={numberValue(property?.deposit_eur)}
                  min="0"
                  name="deposit_eur"
                  placeholder="850"
                  step="100"
                  type="number"
                />
              </Field>

              <Field label={locale === "sq" ? "E disponueshme nga" : "Available from"}>
                <Input
                  className={inputClass}
                  defaultValue={property?.available_from || ""}
                  name="available_from"
                  type="date"
                />
              </Field>

              <Field label={locale === "sq" ? "Mobiluar / Pamobiluar" : "Furnished state"}>
                <Select
                  className={inputClass}
                  defaultValue={property?.furnished_state || "unknown"}
                  name="furnished_state"
                >
                  <option value="unknown">{locale === "sq" ? "E pacaktuar" : "Unknown"}</option>
                  <option value="furnished">{locale === "sq" ? "Mobiluar" : "Furnished"}</option>
                  <option value="partially_furnished">
                    {locale === "sq" ? "Pjesërisht mobiluar" : "Partially furnished"}
                  </option>
                  <option value="unfurnished">{locale === "sq" ? "Pamobiluar" : "Unfurnished"}</option>
                </Select>
              </Field>

              <Field label={locale === "sq" ? "Kohëzgjatja minimale (muaj)" : "Minimum lease (months)"}>
                <Input
                  className={inputClass}
                  defaultValue={numberValue(property?.minimum_lease_months)}
                  min="0"
                  name="minimum_lease_months"
                  type="number"
                />
              </Field>

              <Field label={locale === "sq" ? "Kohëzgjatja maksimale (muaj)" : "Maximum lease (months)"}>
                <Input
                  className={inputClass}
                  defaultValue={numberValue(property?.maximum_lease_months)}
                  min="0"
                  name="maximum_lease_months"
                  type="number"
                />
              </Field>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  defaultChecked={Boolean(property?.utilities_included)}
                  name="utilities_included"
                  type="checkbox"
                />
                {locale === "sq" ? "Shpenzime të përfshira" : "Utilities included"}
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  defaultChecked={Boolean(property?.sublease_allowed)}
                  name="sublease_allowed"
                  type="checkbox"
                />
                {locale === "sq" ? "Lejohet nënqira?" : "Sublease allowed?"}
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  defaultChecked={Boolean(property?.business_use_allowed)}
                  name="business_use_allowed"
                  type="checkbox"
                />
                {locale === "sq" ? "Lejohet biznes?" : "Business use allowed?"}
              </label>
            </>
          ) : null}

          {!landProperty ? (
            <>
              <Field label={locale === "sq" ? "Dhoma gjumi" : "Bedrooms"}>
                <Input
                  className={inputClass}
                  defaultValue={numberValue(property?.bedrooms)}
                  min="0"
                  name="bedrooms"
                  type="number"
                />
              </Field>

              <Field label={locale === "sq" ? "Banjo" : "Bathrooms"}>
                <Input
                  className={inputClass}
                  defaultValue={numberValue(property?.bathrooms)}
                  min="0"
                  name="bathrooms"
                  type="number"
                />
              </Field>

              <Field label={locale === "sq" ? "Viti i ndërtimit" : "Year built"}>
                <Input
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

      {duplicateAssetMatches.length > 0 ? (
        <Section
          description={
            isSq
              ? "Zgjidh njÃ« aset ekzistues vetÃ«m nÃ«se Ã«shtÃ« e njÃ«jta pronÃ« fizike. Listimi i ri do tÃ« ruajÃ« ciklin e vet tÃ« shitjes ose qirasÃ«."
              : "Choose an existing asset only when this is the same physical property. The new listing keeps its own sale or rental lifecycle."
          }
          title={isSq ? "Aset i mundshÃ«m ekzistues" : "Possible existing asset"}
        >
          <div className="md:col-span-2 grid gap-3">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <input
                className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                defaultChecked
                name="link_asset_property_id"
                type="radio"
                value=""
              />
              <span>
                {isSq
                  ? "Krijo si aset i ri fizik"
                  : "Create as a new physical asset"}
              </span>
            </label>

            {duplicateAssetMatches.map(({ candidate, score }) => {
              const sameWorkflow = isSameTransactionWorkflow(
                activeTransactionType,
                candidate.transaction_type,
              );
              const candidateWorkflowLabel = formatStatusLabel(candidate.status, locale);

              return (
                <div
                  className={
                    sameWorkflow
                      ? "rounded-xl border border-amber-200 bg-amber-50 p-3"
                      : "rounded-xl border border-emerald-200 bg-white p-3"
                  }
                  key={candidate.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <label className="flex min-w-0 flex-1 items-start gap-3 text-sm">
                      {!sameWorkflow ? (
                        <input
                          className="mt-1 h-4 w-4 shrink-0 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          name="link_asset_property_id"
                          type="radio"
                          value={candidate.id}
                        />
                      ) : (
                        <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800">
                          {isSq ? "Duplikat i mundshëm" : "Possible duplicate"}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block break-words font-semibold text-slate-950">
                          {candidate.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {formatPropertyType(candidate.type, locale)} ·{" "}
                          {formatStatusLabel(candidate.status, locale)} ·{" "}
                          {candidate.neighborhood
                            ? `${candidate.neighborhood}, ${candidate.city}`
                            : candidate.city}
                        </span>
                        <span
                          className={
                            sameWorkflow
                              ? "mt-1 block text-xs font-semibold text-amber-800"
                              : "mt-1 block text-xs text-emerald-700"
                          }
                        >
                          {sameWorkflow
                            ? isSq
                              ? "Ky duket si listim i tÃ« njÃ«jtit proces. Hape ekzistuesin nÃ« vend qÃ« ta dublosh."
                              : "This appears to be the same workflow. Open the existing listing instead of duplicating it."
                            : isSq
                              ? "Lidhe me kÃ«tÃ« aset dhe krijo listim tÃ« ndarÃ«."
                              : "Link to this asset and create a separate listing."}
                        </span>
                      </span>
                    </label>
                    {sameWorkflow ? (
                      <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm font-semibold leading-6 text-amber-900 sm:hidden">
                        {isSq
                          ? "Hape listimin ekzistues. Krijo aset të ri vetëm nëse është pronë fizike tjetër."
                          : "Open the existing listing. Create a new asset only if this is a different physical property."}
                      </div>
                    ) : null}
                    <a
                      aria-label={
                        sameWorkflow
                          ? `${isSq ? "Hap listimin ekzistues" : "Open existing listing"} ${candidate.title} ${candidateWorkflowLabel}`
                          : `${isSq ? "Hap" : "Open"} ${candidate.title} ${candidateWorkflowLabel}`
                      }
                      className={
                        sameWorkflow
                          ? buttonVariants({
                              className:
                                "min-h-10 w-full bg-orange-600 px-3 text-xs text-white hover:bg-orange-700 sm:w-auto",
                              size: "sm",
                            })
                          : buttonVariants({
                              className: "h-9 min-h-9 w-full px-3 text-xs sm:w-auto",
                              size: "sm",
                              variant: "secondary",
                            })
                      }
                      href={`/properties/${candidate.id}/edit`}
                    >
                      {sameWorkflow
                        ? isSq
                          ? "Hap listimin ekzistues"
                          : "Open existing listing"
                        : isSq
                          ? "Hap"
                          : "Open"}
                    </a>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    {isSq ? "PÃ«rputhje" : "Match"} {score}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section
        title={
          developmentExchangeWorkflow
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
            developmentExchangeWorkflow
              ? locale === "sq"
                ? "Media dhe dokumente të tokës"
                : "Land media and documents"
              : locale === "sq"
                ? "Media e pronës"
                : "Property media"
          }
        >
          <Input
            accept={propertyMediaAccept}
            aria-describedby="property-media-help property-media-error"
            className="w-full min-w-0 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition file:mr-4 file:rounded-md file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-orange-700 hover:border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100"
            onChange={handleMediaChange}
            multiple
            name="media"
            ref={fileInputRef}
            type="file"
          />
          <span
            className="text-xs font-normal leading-5 text-slate-500"
            id="property-media-help"
          >
            {isSq
              ? `Ngarko deri në ${propertyMediaMaxFiles} skedarë njëkohësisht. Foto: JPG, PNG, WebP, AVIF, GIF. Video: MP4, WebM, MOV deri në ${propertyVideoMaxDurationSeconds} sekonda dhe ${propertyVideoMaxSizeMb} MB. Dokumente: PDF.`
              : propertyMediaHelpText}
          </span>
          {uploadError ? (
            <div
              className="grid gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800"
              id="property-media-error"
              role="alert"
            >
              <p>{uploadError}</p>
              {savedMediaProperty ? (
                <div className="flex flex-wrap gap-2">
                  {uploadQueue.some((item) => item.status === "error") ? (
                    <Button
                      className="h-9 bg-orange-600 px-3 text-xs text-white hover:bg-orange-700 disabled:opacity-60"
                      disabled={isUploadingMedia}
                      onClick={() => void retryFailedUploads()}
                      size="sm"
                      type="button"
                    >
                      {isSq ? "Provo perseri median" : "Retry media"}
                    </Button>
                  ) : null}
                  <a
                    className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-100"
                    href={`/properties/${savedMediaProperty.id}/edit`}
                  >
                    {isSq ? "Hap faqen e ndryshimit" : "Open edit page"}
                  </a>
                </div>
              ) : null}
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
                    ? "Video: maksimumi 1 minutë dhe 25 MB."
                    : "Video: maximum 1 minute and 25 MB."}
                </p>
              </div>
              <div className="grid gap-2">
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-semibold text-slate-900"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getQueueStatusLabel(item.status, locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-semibold text-slate-600">
                          {item.progress}%
                        </p>
                        {item.status !== "uploading" &&
                        item.status !== "saving" &&
                        item.status !== "done" ? (
                          <Button
                            aria-label={
                              isSq
                                ? `Hiq ${item.name} nga radha`
                                : `Remove ${item.name} from queue`
                            }
                            className="h-7 px-2 text-xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                            disabled={isUploadingMedia}
                            onClick={() => removeQueueItem(item.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {isSq ? "Hiq" : "Remove"}
                          </Button>
                        ) : null}
                      </div>
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
          <Textarea
            className={textareaClass}
            defaultValue={property?.description || ""}
            name="description"
            placeholder={
              developmentExchangeWorkflow
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

      <Button
        className="w-full bg-orange-600 text-white hover:bg-orange-700 sm:w-fit"
        disabled={isUploadingMedia || hasBlockingMediaState}
      >
        {isUploadingMedia
          ? isSq
            ? "Po ruhet dhe po ngarkohet media..."
            : "Saving and uploading media..."
          : isValidatingMedia
            ? isSq
              ? "Po validohet media..."
              : "Validating media..."
            : submitLabel}
      </Button>
    </form>
  );
}
