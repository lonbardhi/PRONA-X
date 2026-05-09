import { CalendarPlus } from "lucide-react";

import {
  appointmentStatuses,
  appointmentTypes,
  getDefaultAppointmentStart,
  getAppointmentStatusLabels,
  getAppointmentTypeLabels,
} from "@/lib/appointments";
import type { AppointmentPropertySummary } from "@/lib/appointments";
import { defaultLocale, type Locale } from "@/lib/i18n";

export type AppointmentAgentOption = {
  id: string;
  label: string;
};

type AppointmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  agents: AppointmentAgentOption[];
  defaultPropertyId?: string;
  locale?: Locale;
  properties: AppointmentPropertySummary[];
  returnTo?: string;
};

function getPropertyLabel(property: AppointmentPropertySummary) {
  const location = [property.neighborhood, property.city].filter(Boolean).join(", ");

  return location ? `${property.title} - ${location}` : property.title;
}

export function AppointmentForm({
  action,
  agents,
  defaultPropertyId = "",
  locale = defaultLocale,
  properties,
  returnTo = "/appointments",
}: AppointmentFormProps) {
  const statusLabels = getAppointmentStatusLabels(locale);
  const typeLabels = getAppointmentTypeLabels(locale);
  const labels =
    locale === "sq"
      ? {
          agent: "Agjenti i caktuar",
          assignToMe: "Cakto tek unë",
          clientEmail: "Email i klientit",
          clientName: "Emri i klientit",
          clientNamePlaceholder: "Klient ose kompani",
          clientPhone: "Telefoni i klientit",
          duration: "Kohëzgjatja",
          location: "Vendndodhja",
          locationPlaceholder:
            "Përdor adresën e pronës, zyrën, telefonin ose linkun e videos",
          notes: "Shënime",
          notesPlaceholder:
            "Preferencat e blerësit, shënime aksesi, kontekst ndjekjeje.",
          property: "Prona",
          propertyPlaceholder: "Zgjidh pronën",
          start: "Data dhe ora e fillimit",
          status: "Statusi",
          submit: "Krijo takim",
          title: "Titulli i takimit",
          titlePlaceholder: "Vizitë me familje blerëse",
          type: "Lloji i takimit",
        }
      : {
          agent: "Assigned agent",
          assignToMe: "Assign to me",
          clientEmail: "Client email",
          clientName: "Client name",
          clientNamePlaceholder: "Client or company",
          clientPhone: "Client phone",
          duration: "Duration",
          location: "Location",
          locationPlaceholder:
            "Use property address, office, phone, or video call link",
          notes: "Notes",
          notesPlaceholder:
            "Buyer preferences, access notes, follow-up context.",
          property: "Property",
          propertyPlaceholder: "Choose property",
          start: "Start date and time",
          status: "Status",
          submit: "Create appointment",
          title: "Appointment title",
          titlePlaceholder: "Viewing with buyer family",
          type: "Appointment type",
        };

  return (
    <form action={action} className="grid gap-4">
      <input name="return_to" type="hidden" value={returnTo} />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          {labels.title}
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="title"
            placeholder={labels.titlePlaceholder}
            required
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          {labels.property}
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue={defaultPropertyId}
            name="property_id"
            required
          >
            <option value="" disabled>
              {labels.propertyPlaceholder}
            </option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {getPropertyLabel(property)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.type}
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue="viewing"
            name="appointment_type"
            required
          >
            {appointmentTypes.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.status}
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue="scheduled"
            name="status"
            required
          >
            {appointmentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.agent}
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="assigned_agent_id"
          >
            <option value="">{labels.assignToMe}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.clientName}
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="client_name"
            placeholder={labels.clientNamePlaceholder}
            required
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.clientPhone}
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="client_phone"
            placeholder="+355..."
            type="tel"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.clientEmail}
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="client_email"
            placeholder="client@example.com"
            type="email"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.start}
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue={getDefaultAppointmentStart()}
            name="starts_at"
            required
            type="datetime-local"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          {labels.duration}
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue="60"
            name="duration_minutes"
          >
            <option value="30">
              {locale === "sq" ? "30 minuta" : "30 minutes"}
            </option>
            <option value="45">
              {locale === "sq" ? "45 minuta" : "45 minutes"}
            </option>
            <option value="60">{locale === "sq" ? "1 orë" : "1 hour"}</option>
            <option value="90">
              {locale === "sq" ? "1 orë 30 minuta" : "1 hour 30 minutes"}
            </option>
            <option value="120">{locale === "sq" ? "2 orë" : "2 hours"}</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          {labels.location}
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="location"
            placeholder={labels.locationPlaceholder}
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          {labels.notes}
          <textarea
            className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="notes"
            placeholder={labels.notesPlaceholder}
            rows={4}
          />
        </label>
      </div>

      <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-fit">
        <CalendarPlus className="h-4 w-4" />
        {labels.submit}
      </button>
    </form>
  );
}
