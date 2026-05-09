import { z } from "zod";

import { getIntlLocale, type Locale } from "@/lib/i18n";

export const supportTicketCategories = [
  "technical_issue",
  "property_listing_issue",
  "image_media_upload_issue",
  "calendar_appointment_issue",
  "sales_workflow_issue",
  "rental_workflow_issue",
  "seller_lead_issue",
  "user_account_issue",
  "permission_access_issue",
  "feature_request",
  "data_correction_request",
  "other",
] as const;

export const supportTicketPriorities = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const supportTicketStatuses = [
  "open",
  "in_review",
  "waiting_for_user",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
] as const;

export const supportModules = [
  "Dashboard",
  "Sales",
  "Rentals",
  "Development Land",
  "Calendar",
  "Seller Leads",
  "Media Uploads",
  "User Access",
  "Sharing",
  "Other",
] as const;

export type SupportTicketCategory = (typeof supportTicketCategories)[number];
export type SupportTicketPriority = (typeof supportTicketPriorities)[number];
export type SupportTicketStatus = (typeof supportTicketStatuses)[number];

export const supportCategoryLabels: Record<SupportTicketCategory, string> = {
  technical_issue: "Technical issue",
  property_listing_issue: "Property listing issue",
  image_media_upload_issue: "Image/media upload issue",
  calendar_appointment_issue: "Calendar or appointment issue",
  sales_workflow_issue: "Sales workflow issue",
  rental_workflow_issue: "Rental workflow issue",
  seller_lead_issue: "Seller lead issue",
  user_account_issue: "User/account issue",
  permission_access_issue: "Permission/access issue",
  feature_request: "Feature request",
  data_correction_request: "Data correction request",
  other: "Other",
};

const supportCategoryLabelsSq: Record<SupportTicketCategory, string> = {
  technical_issue: "Problem teknik",
  property_listing_issue: "Problem me listimin e pronës",
  image_media_upload_issue: "Problem me ngarkimin e imazheve/medias",
  calendar_appointment_issue: "Problem me kalendarin ose takimet",
  sales_workflow_issue: "Problem me procesin e shitjes",
  rental_workflow_issue: "Problem me procesin e qirasë",
  seller_lead_issue: "Problem me lead të shitësit",
  user_account_issue: "Problem me përdoruesin/llogarinë",
  permission_access_issue: "Problem me lejet/aksesin",
  feature_request: "Kërkesë për veçori",
  data_correction_request: "Kërkesë për korrigjim të dhënash",
  other: "Tjetër",
};

export const supportPriorityLabels: Record<SupportTicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const supportPriorityLabelsSq: Record<SupportTicketPriority, string> = {
  low: "I ulët",
  medium: "Mesatar",
  high: "I lartë",
  critical: "Kritik",
};

export const supportStatusLabels: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_review: "In Review",
  waiting_for_user: "Waiting for User",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

const supportStatusLabelsSq: Record<SupportTicketStatus, string> = {
  open: "Hapur",
  in_review: "Në shqyrtim",
  waiting_for_user: "Në pritje të përdoruesit",
  in_progress: "Në proces",
  resolved: "Zgjidhur",
  closed: "Mbyllur",
  rejected: "Refuzuar",
};

export const supportActivityLabels: Record<string, string> = {
  ticket_created: "Ticket created",
  status_changed: "Status changed",
  priority_changed: "Priority changed",
  assigned_user_changed: "Assigned user changed",
  reply_added: "Reply added",
  internal_note_added: "Internal note added",
  ticket_resolved: "Ticket resolved",
  ticket_reopened: "Ticket reopened",
};

const supportActivityLabelsSq: Record<string, string> = {
  ticket_created: "Bileta u krijua",
  status_changed: "Statusi ndryshoi",
  priority_changed: "Prioriteti ndryshoi",
  assigned_user_changed: "Përdoruesi i caktuar ndryshoi",
  reply_added: "U shtua përgjigje",
  internal_note_added: "U shtua shënim i brendshëm",
  ticket_resolved: "Bileta u zgjidh",
  ticket_reopened: "Bileta u rihap",
};

const supportModuleLabelsSq: Record<string, string> = {
  Calendar: "Kalendari",
  Dashboard: "Paneli",
  "Development Land": "Tokë Zhvillimi",
  "Media Uploads": "Ngarkime Media",
  Other: "Tjetër",
  Rentals: "Qira",
  Sales: "Shitje",
  "Seller Leads": "Leads Shitësish",
  Sharing: "Shpërndarje",
  "User Access": "Akses Përdoruesish",
};

export function getSupportCategoryLabels(locale: Locale) {
  return locale === "sq" ? supportCategoryLabelsSq : supportCategoryLabels;
}

export function getSupportPriorityLabels(locale: Locale) {
  return locale === "sq" ? supportPriorityLabelsSq : supportPriorityLabels;
}

export function getSupportStatusLabels(locale: Locale) {
  return locale === "sq" ? supportStatusLabelsSq : supportStatusLabels;
}

export function getSupportActivityLabels(locale: Locale) {
  return locale === "sq" ? supportActivityLabelsSq : supportActivityLabels;
}

export function getSupportModuleLabel(locale: Locale, module: string) {
  return locale === "sq" ? supportModuleLabelsSq[module] || module : module;
}

export const supportAttachmentMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "video/mp4",
] as const;

export const supportAttachmentMaxBytes = 25 * 1024 * 1024;
export const supportAttachmentBucket = "support-attachments";

export const supportTicketSchema = z.object({
  title: z.string().trim().min(4, "Title is required"),
  category: z.enum(supportTicketCategories),
  priority: z.enum(supportTicketPriorities),
  related_module: z.string().trim().optional(),
  related_property_id: z.string().uuid().optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters"),
  steps_to_reproduce: z.string().trim().optional(),
  page_url: z.string().trim().optional(),
  browser: z.string().trim().optional(),
  device: z.string().trim().optional(),
  os: z.string().trim().optional(),
  screen_size: z.string().trim().optional(),
});

export const supportReplySchema = z.object({
  body: z.string().trim().min(2, "Reply is required"),
  is_internal: z.boolean().default(false),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

export type SupportProfileSummary = {
  id: string;
  full_name: string | null;
  role: string;
};

export type SupportPropertyOption = {
  id: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
};

export type SupportTicketRecord = {
  id: string;
  ticket_number: string;
  title: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  related_module: string | null;
  related_property_id: string | null;
  description: string;
  steps_to_reproduce: string | null;
  page_url: string | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  screen_size: string | null;
  created_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: SupportProfileSummary | null;
  assignee?: SupportProfileSummary | null;
  property?: SupportPropertyOption | null;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author?: SupportProfileSummary | null;
};

export type SupportTicketAttachment = {
  id: string;
  ticket_id: string;
  message_id: string | null;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  is_internal: boolean;
  created_by: string;
  created_at: string;
  signed_url?: string | null;
};

export type SupportTicketActivity = {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  activity_type: string;
  from_value: string | null;
  to_value: string | null;
  body: string | null;
  created_at: string;
  actor?: SupportProfileSummary | null;
};

export function sanitizeSupportText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

export function formDataToSupportTicketInput(formData: FormData) {
  return supportTicketSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    related_module: formData.get("related_module") || undefined,
    related_property_id: formData.get("related_property_id") || "",
    description: formData.get("description"),
    steps_to_reproduce: formData.get("steps_to_reproduce") || undefined,
    page_url: formData.get("page_url") || undefined,
    browser: formData.get("browser") || undefined,
    device: formData.get("device") || undefined,
    os: formData.get("os") || undefined,
    screen_size: formData.get("screen_size") || undefined,
  });
}

export function formatSupportDate(value: string, locale: Locale = "en") {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatSupportFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getSupportStatusTone(status: SupportTicketStatus) {
  if (status === "resolved" || status === "closed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "in_progress" || status === "in_review") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "waiting_for_user") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function getSupportPriorityTone(priority: SupportTicketPriority) {
  if (priority === "critical") {
    return "bg-rose-50 text-rose-700";
  }

  if (priority === "high") {
    return "bg-orange-50 text-orange-700";
  }

  if (priority === "medium") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}
