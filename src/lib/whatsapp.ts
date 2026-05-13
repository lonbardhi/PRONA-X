import { z } from "zod";

export const whatsappConversationStatuses = ["open", "closed", "archived", "spam"] as const;
export const whatsappConversationTypes = [
  "unknown",
  "buyer",
  "renter",
  "seller",
  "owner",
  "property",
  "support",
] as const;
export const whatsappPriorities = ["normal", "urgent", "hot"] as const;
export const whatsappMessageStatuses = [
  "received",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export const whatsappMessageTypes = [
  "text",
  "image",
  "video",
  "audio",
  "document",
  "location",
  "interactive",
  "template",
  "unknown",
] as const;

export type WhatsAppConversationStatus = (typeof whatsappConversationStatuses)[number];
export type WhatsAppConversationType = (typeof whatsappConversationTypes)[number];
export type WhatsAppPriority = (typeof whatsappPriorities)[number];
export type WhatsAppMessageStatus = (typeof whatsappMessageStatuses)[number];
export type WhatsAppMessageType = (typeof whatsappMessageTypes)[number];

export type WhatsAppAccount = {
  display_name: string | null;
  id: string;
  phone_number: string | null;
  phone_number_id: string | null;
  status: "not_configured" | "connected" | "disabled" | "error";
  waba_id: string | null;
};

export type WhatsAppContact = {
  display_name: string | null;
  id: string;
  marketing_consent: boolean;
  matched_property_id: string | null;
  matched_seller_lead_id: string | null;
  opted_out: boolean;
  phone_e164: string;
};

export type WhatsAppProfileSummary = {
  email: string | null;
  full_name: string | null;
  id: string;
  role: string;
};

export type WhatsAppConversation = {
  assigned_agent?: WhatsAppProfileSummary | null;
  assigned_agent_id: string | null;
  contact?: WhatsAppContact | null;
  contact_id: string;
  created_at: string;
  customer_service_window_expires_at: string | null;
  follow_up_note: string | null;
  id: string;
  last_inbound_at: string | null;
  last_message_at: string | null;
  last_outbound_at: string | null;
  linked_property_id: string | null;
  linked_seller_lead_id: string | null;
  next_follow_up_at: string | null;
  priority: WhatsAppPriority;
  sla_due_at: string | null;
  status: WhatsAppConversationStatus;
  type: WhatsAppConversationType;
  unread_count: number;
  whatsapp_account_id: string | null;
};

export type WhatsAppMessage = {
  body: string | null;
  conversation_id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  id: string;
  media_mime_type: string | null;
  media_url: string | null;
  message_type: WhatsAppMessageType;
  sender_type: "customer" | "agent" | "system";
  sender_user_id: string | null;
  status: WhatsAppMessageStatus;
  status_reason: string | null;
  template_name: string | null;
  whatsapp_message_id: string | null;
};

export type WhatsAppInternalNote = {
  author?: WhatsAppProfileSummary | null;
  author_id: string;
  body: string;
  conversation_id: string;
  created_at: string;
  id: string;
};

export type WhatsAppTemplate = {
  body: string;
  category: string;
  id: string;
  language: string;
  name: string;
  status: "approved" | "pending" | "rejected" | "disabled";
  variables: Record<string, unknown> | null;
};

export const sendWhatsAppMessageSchema = z.object({
  body: z.string().trim().min(1, "Shkruaj mesazhin para se ta dergosh.").max(4096),
  conversationId: z.string().uuid("Biseda WhatsApp nuk u gjet."),
  returnTo: z.string().trim().optional(),
  templateId: z.string().uuid().optional().or(z.literal("")),
});

export const whatsappNoteSchema = z.object({
  body: z.string().trim().min(2, "Shenimi eshte shume i shkurter.").max(2000),
  conversationId: z.string().uuid("Biseda WhatsApp nuk u gjet."),
  returnTo: z.string().trim().optional(),
});

export const whatsappAssignSchema = z.object({
  assignedAgentId: z.string().uuid().optional().or(z.literal("")),
  conversationId: z.string().uuid("Biseda WhatsApp nuk u gjet."),
  returnTo: z.string().trim().optional(),
});

export const whatsappFollowUpSchema = z.object({
  conversationId: z.string().uuid("Biseda WhatsApp nuk u gjet."),
  followUpAt: z.string().trim().min(1, "Zgjidh daten e ndjekjes."),
  note: z.string().trim().max(500).optional(),
  returnTo: z.string().trim().optional(),
});

export const whatsappSellerLeadSchema = z.object({
  city: z.string().trim().optional(),
  conversationId: z.string().uuid("Biseda WhatsApp nuk u gjet."),
  expectedPrice: z.coerce.number().min(0).optional().or(z.literal("")),
  propertyType: z.string().trim().optional(),
  returnTo: z.string().trim().optional(),
  sellerName: z.string().trim().min(2, "Emri i pronarit eshte i detyrueshem."),
});

export function getSafeWhatsAppReturnTo(value: unknown, fallback = "/messages/whatsapp") {
  const raw = String(value || fallback);
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export function normalizePhoneToE164(phone: string, defaultCountry: "AL" = "AL") {
  const clean = phone.replace(/[^\d+]/g, "");

  if (!clean) {
    return "";
  }

  if (clean.startsWith("+")) {
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  if (clean.startsWith("00")) {
    return `+${clean.slice(2).replace(/\D/g, "")}`;
  }

  const digits = clean.replace(/\D/g, "");

  if (digits.startsWith("355")) {
    return `+${digits}`;
  }

  if (defaultCountry === "AL") {
    if (digits.startsWith("0")) {
      return `+355${digits.slice(1)}`;
    }

    if (digits.startsWith("6")) {
      return `+355${digits}`;
    }
  }

  return `+${digits}`;
}

export function comparePhoneNumbers(left: string, right: string) {
  return normalizePhoneToE164(left) === normalizePhoneToE164(right);
}

export function isInsideCustomerServiceWindow(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now());
}

export function getWhatsAppConversationTypeLabel(type: WhatsAppConversationType) {
  const labels: Record<WhatsAppConversationType, string> = {
    buyer: "Bleres",
    owner: "Pronar",
    property: "Prone",
    renter: "Qiramarres",
    seller: "Shites",
    support: "Support",
    unknown: "Kontakt i panjohur",
  };

  return labels[type];
}

export function getWhatsAppStatusLabel(status: WhatsAppConversationStatus) {
  const labels: Record<WhatsAppConversationStatus, string> = {
    archived: "Arkivuar",
    closed: "Mbyllur",
    open: "Hapur",
    spam: "Spam",
  };

  return labels[status];
}

export function getWhatsAppPriorityLabel(priority: WhatsAppPriority) {
  const labels: Record<WhatsAppPriority, string> = {
    hot: "E nxehte",
    normal: "Normale",
    urgent: "Urgjente",
  };

  return labels[priority];
}

export function getWhatsAppDisplayName(conversation: WhatsAppConversation) {
  return (
    conversation.contact?.display_name ||
    conversation.contact?.phone_e164 ||
    `WhatsApp ${conversation.id.slice(0, 8)}`
  );
}

export function isMissingWhatsAppSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  const details =
    "details" in error && typeof error.details === "string" ? error.details : "";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const text = `${message} ${details}`.toLowerCase();

  return (
    code === "PGRST204" ||
    code === "PGRST205" ||
    (text.includes("schema cache") &&
      (text.includes("whatsapp_accounts") ||
        text.includes("whatsapp_contacts") ||
        text.includes("whatsapp_conversations") ||
        text.includes("whatsapp_messages")))
  );
}

