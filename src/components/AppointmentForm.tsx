import { CalendarPlus } from "lucide-react";

import {
  appointmentStatusLabels,
  appointmentStatuses,
  appointmentTypeLabels,
  appointmentTypes,
  getDefaultAppointmentStart,
} from "@/lib/appointments";
import type { AppointmentPropertySummary } from "@/lib/appointments";

export type AppointmentAgentOption = {
  id: string;
  label: string;
};

type AppointmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  agents: AppointmentAgentOption[];
  defaultPropertyId?: string;
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
  properties,
  returnTo = "/appointments",
}: AppointmentFormProps) {
  return (
    <form action={action} className="grid gap-4">
      <input name="return_to" type="hidden" value={returnTo} />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Appointment title
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="title"
            placeholder="Viewing with buyer family"
            required
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Property
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue={defaultPropertyId}
            name="property_id"
            required
          >
            <option value="" disabled>
              Choose property
            </option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {getPropertyLabel(property)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Appointment type
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue="viewing"
            name="appointment_type"
            required
          >
            {appointmentTypes.map((type) => (
              <option key={type} value={type}>
                {appointmentTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue="scheduled"
            name="status"
            required
          >
            {appointmentStatuses.map((status) => (
              <option key={status} value={status}>
                {appointmentStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Assigned agent
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="assigned_agent_id"
          >
            <option value="">Assign to me</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Client name
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="client_name"
            placeholder="Client or company"
            required
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Client phone
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="client_phone"
            placeholder="+355..."
            type="tel"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Client email
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="client_email"
            placeholder="client@example.com"
            type="email"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Start date and time
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue={getDefaultAppointmentStart()}
            name="starts_at"
            required
            type="datetime-local"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Duration
          <select
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            defaultValue="60"
            name="duration_minutes"
          >
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1 hour 30 minutes</option>
            <option value="120">2 hours</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Location
          <input
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="location"
            placeholder="Use property address, office, phone, or video call link"
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Notes
          <textarea
            className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="notes"
            placeholder="Buyer preferences, access notes, follow-up context."
            rows={4}
          />
        </label>
      </div>

      <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-fit">
        <CalendarPlus className="h-4 w-4" />
        Create appointment
      </button>
    </form>
  );
}
