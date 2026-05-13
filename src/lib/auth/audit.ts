import { createHash } from "crypto";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AuthAuditEvent = {
  actorUserId?: string | null;
  email?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
  targetUserId?: string | null;
  userAgent?: string | null;
  userId?: string | null;
};

export function hashAuditEmail(email?: string | null) {
  if (!email) {
    return null;
  }

  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function createAuthAuditEvent(
  supabase: SupabaseServerClient,
  event: AuthAuditEvent,
) {
  const metadata = event.metadata || {};

  try {
    await supabase.from("auth_audit_events").insert({
      actor_user_id: event.actorUserId || null,
      email_hash: hashAuditEmail(event.email),
      event_type: event.eventType,
      metadata,
      target_user_id: event.targetUserId || null,
      user_agent: event.userAgent || null,
      user_id: event.userId || null,
    });
  } catch {
    // Auth audit logging should never block the primary auth flow.
  }
}
