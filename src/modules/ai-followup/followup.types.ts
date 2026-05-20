export const leadActivityEventTypes = [
  "email_opened",
  "email_clicked",
  "email_replied",
  "property_viewed",
  "property_saved",
  "whatsapp_message_sent",
  "whatsapp_reply_received",
  "phone_call_answered",
  "phone_call_missed",
  "viewing_requested",
  "appointment_booked",
  "document_sent",
  "no_response",
  "manual_note_added",
  "followup_completed",
] as const;

export const leadChannels = [
  "email",
  "whatsapp",
  "phone",
  "crm",
  "manual",
  "unknown",
] as const;

export type LeadActivityEventType = (typeof leadActivityEventTypes)[number];
export type LeadChannel = (typeof leadChannels)[number];
export type FollowUpUrgencyLevel = "Low" | "Medium" | "High";

export type LeadActivityEvent = {
  channel: LeadChannel | null;
  createdAt: string;
  eventType: LeadActivityEventType;
  id?: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  propertyId?: string | null;
  userId?: string | null;
};

export type FollowUpReasoning = {
  eventCount: number;
  lastActivityAt?: string;
  strongestSignals: string[];
  weakSignals: string[];
};

export type FollowUpInsight = {
  bestContactDay: string;
  bestContactHour: number;
  bestContactWindow: string;
  engagementScore: number;
  leadId: string;
  preferredChannel: LeadChannel;
  reasoning: FollowUpReasoning;
  recommendedAction: string;
  responseProbability: number;
  urgencyLevel: FollowUpUrgencyLevel;
};

export type CreateLeadActivityEventInput = {
  channel?: LeadChannel;
  eventType: LeadActivityEventType;
  leadId: string;
  metadata?: Record<string, unknown>;
  propertyId?: string;
};
