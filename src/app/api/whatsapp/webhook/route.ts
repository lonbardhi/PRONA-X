import crypto from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getWhatsAppConfig } from "@/lib/whatsapp-config";
import { normalizePhoneToE164 } from "@/lib/whatsapp";

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          id?: string;
          image?: { mime_type?: string; id?: string };
          text?: { body?: string };
          timestamp?: string;
          type?: string;
          video?: { mime_type?: string; id?: string };
        }>;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        statuses?: Array<{
          id?: string;
          recipient_id?: string;
          status?: string;
          timestamp?: string;
        }>;
      };
    }>;
  }>;
  object?: string;
};

type WhatsAppWebhookMessage = {
  from?: string;
  id?: string;
  image?: { mime_type?: string; id?: string };
  text?: { body?: string };
  timestamp?: string;
  type?: string;
  video?: { mime_type?: string; id?: string };
};

function textResponse(body: string, status = 200) {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain" },
    status,
  });
}

function safeTimestamp(seconds: string | undefined) {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : new Date().toISOString();
}

function eventHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function verifySignature(rawBody: string, signature: string | null, appSecret: string | null) {
  if (!appSecret) {
    return true;
  }

  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function GET(request: NextRequest) {
  const config = getWhatsAppConfig();
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === config.verifyToken) {
    return textResponse(challenge);
  }

  return textResponse("Webhook verification failed.", 403);
}

async function upsertAccount({
  displayPhoneNumber,
  phoneNumberId,
}: {
  displayPhoneNumber?: string;
  phoneNumberId?: string;
}) {
  const supabase = createServiceRoleClient();

  if (!supabase) {
    return null;
  }

  if (phoneNumberId) {
    const { data } = await supabase
      .from("whatsapp_accounts")
      .upsert(
        {
          display_name: "WhatsApp Business",
          phone_number: displayPhoneNumber || null,
          phone_number_id: phoneNumberId,
          status: "connected",
        },
        { onConflict: "phone_number_id" },
      )
      .select("id")
      .single();

    return data?.id || null;
  }

  const { data } = await supabase
    .from("whatsapp_accounts")
    .select("id")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  return data?.id || null;
}

async function processInboundMessage({
  accountId,
  contactName,
  displayPhoneNumber,
  message,
}: {
  accountId: string | null;
  contactName?: string;
  displayPhoneNumber?: string;
  message: WhatsAppWebhookMessage;
}) {
  const supabase = createServiceRoleClient();

  if (!supabase || !message.from || !message.id) {
    return;
  }

  const phone = normalizePhoneToE164(message.from);
  const createdAt = safeTimestamp(message.timestamp);
  const body =
    message.type === "text"
      ? message.text?.body || ""
      : `[${message.type || "unsupported"} WhatsApp message]`;
  const inboundAt = new Date(createdAt);
  const serviceWindowExpires = new Date(
    inboundAt.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const sellerLeadResult = await supabase
    .from("seller_leads")
    .select("id,assigned_agent_id")
    .eq("phone_normalized", phone.replace(/[^\d+]/g, ""))
    .limit(1)
    .maybeSingle();

  const { data: contact } = await supabase
    .from("whatsapp_contacts")
    .upsert(
      {
        display_name: contactName || displayPhoneNumber || phone,
        last_inbound_at: createdAt,
        matched_seller_lead_id: sellerLeadResult.data?.id || null,
        phone_e164: phone,
      },
      { onConflict: "phone_e164" },
    )
    .select("id")
    .single();

  if (!contact) {
    return;
  }

  const { data: existingConversation } = await supabase
    .from("whatsapp_conversations")
    .select("id,unread_count")
    .eq("contact_id", contact.id)
    .eq("whatsapp_account_id", accountId)
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();

  let conversationId = existingConversation?.id || null;

  if (!conversationId) {
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .insert({
        assigned_agent_id: sellerLeadResult.data?.assigned_agent_id || null,
        contact_id: contact.id,
        customer_service_window_expires_at: serviceWindowExpires,
        last_inbound_at: createdAt,
        last_message_at: createdAt,
        linked_seller_lead_id: sellerLeadResult.data?.id || null,
        priority: "normal",
        status: "open",
        type: sellerLeadResult.data?.id ? "seller" : "unknown",
        unread_count: 1,
        whatsapp_account_id: accountId,
      })
      .select("id")
      .single();

    conversationId = conversation?.id || null;
  } else {
    await supabase
      .from("whatsapp_conversations")
      .update({
        customer_service_window_expires_at: serviceWindowExpires,
        last_inbound_at: createdAt,
        last_message_at: createdAt,
        unread_count: (existingConversation?.unread_count || 0) + 1,
      })
      .eq("id", conversationId);
  }

  if (!conversationId) {
    return;
  }

  await supabase
    .from("whatsapp_messages")
    .upsert(
      {
        body,
        conversation_id: conversationId,
        created_at: createdAt,
        direction: "inbound",
        media_mime_type: message.image?.mime_type || message.video?.mime_type || null,
        media_url: null,
        message_type: ["text", "image", "video"].includes(message.type || "")
          ? message.type
          : "unknown",
        sender_type: "customer",
        status: "received",
        whatsapp_message_id: message.id,
      },
      { ignoreDuplicates: true, onConflict: "whatsapp_message_id" },
    );
}

async function processStatusUpdate(status: {
  id?: string;
  status?: string;
  timestamp?: string;
}) {
  const supabase = createServiceRoleClient();

  if (!supabase || !status.id || !status.status) {
    return;
  }

  const mappedStatus =
    status.status === "delivered"
      ? "delivered"
      : status.status === "read"
        ? "read"
        : status.status === "failed"
          ? "failed"
          : "sent";
  const timestamp = safeTimestamp(status.timestamp);

  await supabase
    .from("whatsapp_messages")
    .update({
      delivered_at: mappedStatus === "delivered" ? timestamp : undefined,
      failed_at: mappedStatus === "failed" ? timestamp : undefined,
      read_at: mappedStatus === "read" ? timestamp : undefined,
      sent_at: mappedStatus === "sent" ? timestamp : undefined,
      status: mappedStatus,
    })
    .eq("whatsapp_message_id", status.id);
}

export async function POST(request: NextRequest) {
  const config = getWhatsAppConfig();
  const supabase = createServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "WhatsApp webhook storage is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  if (
    !verifySignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      config.appSecret,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const hash = eventHash(rawBody);
  const entries = payload.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;

      if (!value) {
        continue;
      }

      const accountId = await upsertAccount({
        displayPhoneNumber: value.metadata?.display_phone_number,
        phoneNumberId: value.metadata?.phone_number_id,
      });
      const contacts = new Map(
        (value.contacts || []).map((contact) => [
          normalizePhoneToE164(contact.wa_id || ""),
          contact.profile?.name,
        ]),
      );

      for (const message of value.messages || []) {
        const providerEventId = message.id || `${hash}:message`;
        const { error } = await supabase.from("whatsapp_webhook_events").insert({
          event_type: "message",
          payload_hash: hash,
          provider_event_id: providerEventId,
          status: "received",
        });

        if (error) {
          continue;
        }

        try {
          await processInboundMessage({
            accountId,
            contactName: contacts.get(normalizePhoneToE164(message.from || "")),
            displayPhoneNumber: value.metadata?.display_phone_number,
            message,
          });

          await supabase
            .from("whatsapp_webhook_events")
            .update({ processed_at: new Date().toISOString(), status: "processed" })
            .eq("provider_event_id", providerEventId);
        } catch (error) {
          await supabase
            .from("whatsapp_webhook_events")
            .update({
              error_message: error instanceof Error ? error.message.slice(0, 500) : "Failed",
              status: "failed",
            })
            .eq("provider_event_id", providerEventId);
        }
      }

      for (const status of value.statuses || []) {
        const providerEventId = `${status.id || hash}:${status.status || "status"}`;
        const { error } = await supabase.from("whatsapp_webhook_events").insert({
          event_type: "status",
          payload_hash: hash,
          provider_event_id: providerEventId,
          status: "received",
        });

        if (error) {
          continue;
        }

        await processStatusUpdate(status);
        await supabase
          .from("whatsapp_webhook_events")
          .update({ processed_at: new Date().toISOString(), status: "processed" })
          .eq("provider_event_id", providerEventId);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
