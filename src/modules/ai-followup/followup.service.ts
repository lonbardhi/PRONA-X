import type { createClient } from "@/lib/supabase/server";

import { generateFollowUpInsight } from "./followup.engine";
import type {
  CreateLeadActivityEventInput,
  FollowUpInsight,
  LeadActivityEvent,
  LeadActivityEventType,
  LeadChannel,
} from "./followup.types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type LeadActivityEventRow = {
  channel: LeadChannel | null;
  created_at: string;
  event_type: LeadActivityEventType;
  id: string;
  lead_id: string;
  metadata: Record<string, unknown> | null;
  property_id: string | null;
  user_id: string | null;
};

function toLeadActivityEvent(row: LeadActivityEventRow): LeadActivityEvent {
  return {
    channel: row.channel,
    createdAt: row.created_at,
    eventType: row.event_type,
    id: row.id,
    leadId: row.lead_id,
    metadata: row.metadata || {},
    propertyId: row.property_id,
    userId: row.user_id,
  };
}

function toScoreRow(insight: FollowUpInsight) {
  return {
    best_contact_day: insight.bestContactDay,
    best_contact_hour: insight.bestContactHour,
    best_contact_window: insight.bestContactWindow,
    engagement_score: insight.engagementScore,
    lead_id: insight.leadId,
    preferred_channel: insight.preferredChannel,
    reasoning: insight.reasoning,
    recommended_action: insight.recommendedAction,
    response_probability: insight.responseProbability,
    urgency_level: insight.urgencyLevel,
  };
}

export async function ensureLeadAccess({
  leadId,
  supabase,
}: {
  leadId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("seller_leads")
    .select("id")
    .eq("id", leadId)
    .single();

  if (error || !data) {
    throw new Error("Lead not found or access denied.");
  }

  return data.id as string;
}

export async function listLeadActivityEvents({
  leadId,
  limit = 100,
  supabase,
}: {
  leadId: string;
  limit?: number;
  supabase: SupabaseClient;
}) {
  await ensureLeadAccess({ leadId, supabase });

  const { data, error } = await supabase
    .from("lead_activity_events")
    .select("id,lead_id,property_id,user_id,event_type,channel,metadata,created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Could not load lead activity events.");
  }

  return ((data || []) as LeadActivityEventRow[]).map(toLeadActivityEvent);
}

export async function upsertFollowUpInsight({
  insight,
  supabase,
}: {
  insight: FollowUpInsight;
  supabase: SupabaseClient;
}) {
  const { error } = await supabase
    .from("lead_ai_followup_scores")
    .upsert(toScoreRow(insight), { onConflict: "lead_id" });

  if (error) {
    throw new Error(error.message || "Could not save follow-up insight.");
  }

  return insight;
}

export async function generateAndStoreFollowUpInsight({
  leadId,
  supabase,
}: {
  leadId: string;
  supabase: SupabaseClient;
}) {
  const events = await listLeadActivityEvents({ leadId, limit: 100, supabase });
  const insight = generateFollowUpInsight(leadId, events);

  return upsertFollowUpInsight({ insight, supabase });
}

export async function createLeadActivityEvent({
  input,
  supabase,
  userId,
}: {
  input: CreateLeadActivityEventInput;
  supabase: SupabaseClient;
  userId: string;
}) {
  await ensureLeadAccess({ leadId: input.leadId, supabase });

  const { data, error } = await supabase
    .from("lead_activity_events")
    .insert({
      channel: input.channel || "unknown",
      event_type: input.eventType,
      lead_id: input.leadId,
      metadata: input.metadata || {},
      property_id: input.propertyId || null,
      user_id: userId,
    })
    .select("id,lead_id,property_id,user_id,event_type,channel,metadata,created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create lead activity event.");
  }

  const event = toLeadActivityEvent(data as LeadActivityEventRow);
  const insight = await generateAndStoreFollowUpInsight({
    leadId: input.leadId,
    supabase,
  });

  return { event, insight };
}
