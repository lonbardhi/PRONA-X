import type { PropertyRecord } from "@/lib/properties";
import { propertyStatuses, propertyTypes } from "@/lib/properties";
import { propertyMediaAccept, propertyMediaHelpText } from "@/lib/property-media";

type PropertyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  property?: PropertyRecord;
  submitLabel: string;
};

export function PropertyForm({ action, property, submitLabel }: PropertyFormProps) {
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Property title
          <input
            name="title"
            required
            defaultValue={property?.title}
            placeholder="Modern apartment in Blloku"
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Type
          <select
            name="type"
            required
            defaultValue={property?.type || "apartment"}
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          >
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            name="status"
            required
            defaultValue={property?.status || "draft"}
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          >
            {propertyStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          City
          <input
            name="city"
            required
            defaultValue={property?.city}
            placeholder="Tirana"
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Neighborhood
          <input
            name="neighborhood"
            defaultValue={property?.neighborhood || ""}
            placeholder="Farka, Blloku, Lalzi Bay"
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Address
          <input
            name="address"
            defaultValue={property?.address || ""}
            placeholder="Street and building details"
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Price EUR
          <input
            name="price_eur"
            required
            type="number"
            min="0"
            step="100"
            defaultValue={property?.price_eur}
            placeholder="245000"
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Area m2
          <input
            name="area_m2"
            type="number"
            min="0"
            step="1"
            defaultValue={property?.area_m2 || ""}
            placeholder="118"
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Bedrooms
          <input
            name="bedrooms"
            type="number"
            min="0"
            defaultValue={property?.bedrooms || ""}
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Bathrooms
          <input
            name="bathrooms"
            type="number"
            min="0"
            defaultValue={property?.bathrooms || ""}
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Year built
          <input
            name="year_built"
            type="number"
            min="1800"
            max="2100"
            defaultValue={property?.year_built || ""}
            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Property media
          <input
            name="media"
            type="file"
            accept={propertyMediaAccept}
            multiple
            className="w-full min-w-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-orange-700"
          />
          <span className="text-xs font-normal leading-5 text-slate-500">
            {propertyMediaHelpText}
          </span>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            name="description"
            rows={4}
            defaultValue={property?.description || ""}
            placeholder="Key selling points, finishes, view, parking, and legal status."
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>
      </div>

      <button className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600">
        {submitLabel}
      </button>
    </form>
  );
}
