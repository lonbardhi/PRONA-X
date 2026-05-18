import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentStatuses,
  appointmentTypes,
  getDefaultAppointmentStart,
  getAppointmentStatusLabels,
  getAppointmentTypeLabels,
  getAppointmentWorkflowBadge,
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
  defaultDate?: string;
  defaultPropertyId?: string;
  locale?: Locale;
  properties: AppointmentPropertySummary[];
  returnTo?: string;
};

function getPropertyLabel(property: AppointmentPropertySummary, locale: Locale) {
  const location = [property.neighborhood, property.city].filter(Boolean).join(", ");
  const workflow = getAppointmentWorkflowBadge(property, locale);
  const title = `${workflow} / ${property.title}`;

  return location ? `${title} - ${location}` : title;
}

const fieldLabelClassName = "grid min-w-0 gap-2 text-sm font-medium text-foreground";

export function AppointmentForm({
  action,
  agents,
  defaultDate,
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
        <Label className={`${fieldLabelClassName} lg:col-span-2`}>
          {labels.title}
          <Input
            className="h-11"
            name="title"
            placeholder={labels.titlePlaceholder}
            required
          />
        </Label>

        <Label className={`${fieldLabelClassName} lg:col-span-2`}>
          {labels.property}
          <Select
            className="h-11"
            defaultValue={defaultPropertyId}
            name="property_id"
            required
          >
            <option value="" disabled>
              {labels.propertyPlaceholder}
            </option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {getPropertyLabel(property, locale)}
              </option>
            ))}
          </Select>
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.type}
          <Select
            className="h-11"
            defaultValue="viewing"
            name="appointment_type"
            required
          >
            {appointmentTypes.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </Select>
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.status}
          <Select
            className="h-11"
            defaultValue="scheduled"
            name="status"
            required
          >
            {appointmentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </Select>
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.agent}
          <Select
            className="h-11"
            name="assigned_agent_id"
          >
            <option value="">{labels.assignToMe}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
          </Select>
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.clientName}
          <Input
            className="h-11"
            name="client_name"
            placeholder={labels.clientNamePlaceholder}
            required
          />
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.clientPhone}
          <Input
            className="h-11"
            name="client_phone"
            placeholder="+355..."
            type="tel"
          />
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.clientEmail}
          <Input
            className="h-11"
            name="client_email"
            placeholder="client@example.com"
            type="email"
          />
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.start}
          <Input
            className="h-11"
            defaultValue={getDefaultAppointmentStart(defaultDate)}
            name="starts_at"
            required
            type="datetime-local"
          />
        </Label>

        <Label className={fieldLabelClassName}>
          {labels.duration}
          <Select
            className="h-11"
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
          </Select>
        </Label>

        <Label className={`${fieldLabelClassName} lg:col-span-2`}>
          {labels.location}
          <Input
            className="h-11"
            name="location"
            placeholder={labels.locationPlaceholder}
          />
        </Label>

        <Label className={`${fieldLabelClassName} lg:col-span-2`}>
          {labels.notes}
          <Textarea
            className="min-h-28"
            name="notes"
            placeholder={labels.notesPlaceholder}
            rows={4}
          />
        </Label>
      </div>

      <Button className="h-11 w-full px-5 sm:w-fit" type="submit" variant="success">
        <CalendarPlus className="h-4 w-4" />
        {labels.submit}
      </Button>
    </form>
  );
}
