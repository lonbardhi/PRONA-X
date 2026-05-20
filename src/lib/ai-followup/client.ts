import type {
  CreateLeadActivityEventInput,
  FollowUpInsight,
  LeadActivityEvent,
} from "@/modules/ai-followup/followup.types";

type ApiEnvelope<T> =
  | { data: T; success: true }
  | { error: string; success: false };

async function readApiEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload && "error" in payload ? payload.error : "PRONA X AI request failed.",
    );
  }

  return payload.data;
}

export async function fetchFollowUpInsight(leadId: string) {
  const response = await fetch(`/api/ai/follow-up/${leadId}`, {
    headers: { Accept: "application/json" },
  });

  return readApiEnvelope<FollowUpInsight>(response);
}

export async function fetchLeadActivityEvents(leadId: string, limit = 5) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/api/lead-events/${leadId}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  return readApiEnvelope<LeadActivityEvent[]>(response);
}

export async function createLeadActivityEvent(payload: CreateLeadActivityEventInput) {
  const response = await fetch("/api/lead-events", {
    body: JSON.stringify(payload),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return readApiEnvelope<{ event: LeadActivityEvent; insight: FollowUpInsight }>(
    response,
  );
}
