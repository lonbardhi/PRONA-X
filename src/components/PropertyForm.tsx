"use client";

import { useMemo, useState, type ReactNode } from "react";

import type { PropertyRecord, PropertyStatus, PropertyType } from "@/lib/properties";
import {
  calculateGrossBuildableArea,
  developmentLandStatuses,
  formatPropertyType,
  formatStatusLabel,
  isDevelopmentLand,
  propertyTypes,
  standardPropertyStatuses,
} from "@/lib/properties";
import { propertyMediaAccept, propertyMediaHelpText } from "@/lib/property-media";
import { defaultLocale, type Locale } from "@/lib/i18n";

type PropertyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
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

export function PropertyForm({
  action,
  locale = defaultLocale,
  property,
  submitLabel,
}: PropertyFormProps) {
  const initialType = property?.type || "apartment";
  const [selectedType, setSelectedType] = useState<PropertyType>(initialType);
  const developmentLand = isDevelopmentLand(selectedType);
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

  return (
    <form action={action} className="grid gap-5">
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
                ? "Development land in Kodra Priftit"
                : locale === "sq"
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
            placeholder="Street, boundary, or site access details"
          />
        </Field>
      </Section>

      {developmentLand ? (
        <>
          <Section
            description="These fields help the team evaluate feasibility before presenting the opportunity to developers."
            title="Location & Cadastral Information"
          >
            <Field label="Plot size m2">
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

            <Field label="Cadastral zone">
              <input
                className={inputClass}
                defaultValue={property?.cadastral_zone || ""}
                name="cadastral_zone"
                placeholder="Kodra Priftit"
              />
            </Field>

            <Field label="Parcel number">
              <input
                className={inputClass}
                defaultValue={property?.parcel_number || ""}
                name="parcel_number"
                placeholder="Parcel / reference ID"
              />
            </Field>

            <Field label="Land certificate number">
              <input
                className={inputClass}
                defaultValue={property?.land_certificate_number || ""}
                name="land_certificate_number"
                placeholder="Certificate number"
              />
            </Field>

            <Field label="Ownership status">
              <input
                className={inputClass}
                defaultValue={property?.ownership_status || ""}
                name="ownership_status"
                placeholder="Single owner, shared, disputed, verified"
              />
            </Field>

            <Field label="Number of landowners">
              <input
                className={inputClass}
                defaultValue={numberValue(property?.landowners_count)}
                min="0"
                name="landowners_count"
                type="number"
              />
            </Field>
          </Section>

          <Section title="Plot & Development Potential">
            <Field label="Current land use">
              <input
                className={inputClass}
                defaultValue={property?.current_land_use || ""}
                name="current_land_use"
                placeholder="Residential, mixed, agricultural"
              />
            </Field>

            <Field label="Development zone">
              <input
                className={inputClass}
                defaultValue={property?.development_zone || ""}
                name="development_zone"
                placeholder="Urban zone / planning designation"
              />
            </Field>

            <Field label="Building coefficient">
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

            <Field label="Maximum floors allowed">
              <input
                className={inputClass}
                defaultValue={numberValue(property?.max_floors)}
                min="0"
                name="max_floors"
                placeholder="8"
                type="number"
              />
            </Field>

            <Field label="Estimated gross buildable area m2">
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

            <Field label="Estimated net sellable area m2">
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

            <Field label="Estimated apartments">
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_apartments)}
                min="0"
                name="estimated_apartments"
                type="number"
              />
            </Field>

            <Field label="Estimated garages">
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_garages)}
                min="0"
                name="estimated_garages"
                type="number"
              />
            </Field>

            <Field label="Parking spaces">
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_parking_spaces)}
                min="0"
                name="estimated_parking_spaces"
                type="number"
              />
            </Field>

            <Field label="Commercial units">
              <input
                className={inputClass}
                defaultValue={numberValue(property?.estimated_commercial_units)}
                min="0"
                name="estimated_commercial_units"
                type="number"
              />
            </Field>
          </Section>

          <Section title="Landowner Agreement">
            <Field label="Landowner requested percentage">
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

            <Field label="Minimum acceptable percentage">
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

            <Field label="Preferred compensation type">
              <select
                className={inputClass}
                defaultValue={property?.preferred_compensation_type || ""}
                name="preferred_compensation_type"
              >
                <option value="">Choose compensation</option>
                <option value="apartments">Apartments</option>
                <option value="garages">Garages</option>
                <option value="commercial_units">Commercial units</option>
                <option value="mixed_units">Mixed units</option>
              </select>
            </Field>

            <Field label="Preferred floor allocation">
              <input
                className={inputClass}
                defaultValue={property?.preferred_floor_allocation || ""}
                name="preferred_floor_allocation"
                placeholder="Middle floors, top floor, mixed"
              />
            </Field>

            <Field label="Preferred orientation">
              <input
                className={inputClass}
                defaultValue={property?.preferred_unit_orientation || ""}
                name="preferred_unit_orientation"
                placeholder="South-facing, sea view, street side"
              />
            </Field>

            <Field label="Negotiation status">
              <input
                className={inputClass}
                defaultValue={property?.negotiation_status || ""}
                name="negotiation_status"
                placeholder="Open, under review, agreed, rejected"
              />
            </Field>

            <Field className="md:col-span-2" label="Agreement notes">
              <textarea
                className={textareaClass}
                defaultValue={property?.agreement_notes || ""}
                name="agreement_notes"
                placeholder="Owner expectations, risks, agreed terms, and constraints."
                rows={4}
              />
            </Field>
          </Section>

          <Section title="Developer Interest">
            <Field label="Developer name">
              <input
                className={inputClass}
                defaultValue={property?.developer_name || ""}
                name="developer_name"
                placeholder="Developer company or contact"
              />
            </Field>

            <Field label="Developer contact">
              <input
                className={inputClass}
                defaultValue={property?.developer_contact || ""}
                name="developer_contact"
                placeholder="Phone, email, or notes"
              />
            </Field>

            <Field label="Developer offered percentage">
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

            <Field label="Offer status">
              <input
                className={inputClass}
                defaultValue={property?.developer_offer_status || ""}
                name="developer_offer_status"
                placeholder="Received, presented, accepted, rejected"
              />
            </Field>

            <Field label="Proposed project size">
              <input
                className={inputClass}
                defaultValue={property?.developer_proposed_project_size || ""}
                name="developer_proposed_project_size"
                placeholder="Approx. 2,000 m2 / 24 units"
              />
            </Field>

            <Field label="Delivery timeline">
              <input
                className={inputClass}
                defaultValue={property?.developer_proposed_delivery_timeline || ""}
                name="developer_proposed_delivery_timeline"
                placeholder="24 months after permit"
              />
            </Field>

            <Field className="md:col-span-2" label="Proposed unit allocation">
              <input
                className={inputClass}
                defaultValue={property?.developer_proposed_unit_allocation || ""}
                name="developer_proposed_unit_allocation"
                placeholder="6 apartments, 2 garages, 1 commercial unit"
              />
            </Field>

            <Field className="md:col-span-2" label="Developer conditions">
              <textarea
                className={textareaClass}
                defaultValue={property?.developer_conditions || ""}
                name="developer_conditions"
                placeholder="Permit, road access, document verification, payment terms."
                rows={4}
              />
            </Field>
          </Section>

          <Section title="Planning, Access & Visibility">
            <Field label="Road access">
              <input
                className={inputClass}
                defaultValue={property?.road_access || ""}
                name="road_access"
                placeholder="Public road, private access, pending"
              />
            </Field>

            <Field label="Utilities access">
              <input
                className={inputClass}
                defaultValue={property?.utilities_access || ""}
                name="utilities_access"
                placeholder="Water, electricity, sewage, pending"
              />
            </Field>

            <Field label="Planning permission status">
              <input
                className={inputClass}
                defaultValue={property?.planning_permission_status || ""}
                name="planning_permission_status"
                placeholder="Unknown, pending, approved"
              />
            </Field>

            <Field label="Construction permit status">
              <input
                className={inputClass}
                defaultValue={property?.construction_permit_status || ""}
                name="construction_permit_status"
                placeholder="Not started, pending, approved"
              />
            </Field>

            <Field label="Urban study status">
              <input
                className={inputClass}
                defaultValue={property?.urban_study_status || ""}
                name="urban_study_status"
                placeholder="Required, in review, approved"
              />
            </Field>

            <Field label="Visibility">
              <select
                className={inputClass}
                defaultValue={property?.visibility || "internal_only"}
                name="visibility"
              >
                <option value="internal_only">Internal Only</option>
                <option value="available_to_developers">
                  Available to Developers
                </option>
                <option value="manager_approved_public">
                  Manager Approved Public
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
            multiple
            name="media"
            type="file"
          />
          <span className="text-xs font-normal leading-5 text-slate-500">
            {propertyMediaHelpText}
          </span>
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

      <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 sm:w-fit">
        {submitLabel}
      </button>
    </form>
  );
}
