"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  calculateSellerLeadScore,
  getSellerLeadTemperature,
  normalizePhone,
} from "@/lib/seller-leads";
import {
  getSafeWhatsAppReturnTo,
  isInsideCustomerServiceWindow,
  sendWhatsAppMessageSchema,
  whatsappAssignSchema,
  whatsappFollowUpSchema,
  whatsappNoteSchema,
  whatsappSellerLeadSchema,
} from "@/lib/whatsapp";
import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp-config";
import {
  requireApprovedUser,
  isOperatorRole,
  isSupportRole,
} from "@/lib/supabase/server";

function redirectWithMessage(returnTo: string | undefined, message: string): never {
  const path = getSafeWhatsAppReturnTo(returnTo);
  const [base, hash = ""] = path.split("#");
  const url = new URLSearchParams();
  url.set("message", message);
  redirect(`${base}${base.includes("?") ? "&" : "?"}${url.toString()}${hash ? `#${hash}` : ""}`);
}

function getActionMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Kontrollo fushat dhe provo perseri.";
  }

  return error instanceof Error
    ? error.message
    : "Veprimi WhatsApp nuk u krye. Provo perseri.";
}

async function requireWhatsAppUser() {
  const context = await requireApprovedUser();

  if (!isOperatorRole(context.profile.role) && !isSupportRole(context.profile.role)) {
    redirect("/messages?message=Kjo llogari nuk ka akses per WhatsApp.");
  }

  return context;
}

function cleanText(value: unknown) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function templateRequiresVariables(variables: unknown) {
  if (!variables) {
    return false;
  }

  if (Array.isArray(variables)) {
    return variables.length > 0;
  }

  if (typeof variables === "object") {
    return Object.keys(variables).length > 0;
  }

  return false;
}

async function loadConversation(
  supabase: Awaited<ReturnType<typeof requireWhatsAppUser>>["supabase"],
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select(
      "id,contact_id,assigned_agent_id,status,type,priority,customer_service_window_expires_at,whatsapp_account_id,contact:whatsapp_contacts(id,phone_e164,display_name,opted_out),account:whatsapp_accounts(id,phone_number_id,status)",
    )
    .eq("id", conversationId)
    .single();

  if (error || !data) {
    throw new Error("Biseda WhatsApp nuk u gjet ose nuk ke akses.");
  }

  const conversation = data as unknown as {
    account?: { id: string; phone_number_id: string | null; status: string } | null;
    contact?: { display_name: string | null; id: string; opted_out: boolean; phone_e164: string } | null;
    contact_id: string;
    customer_service_window_expires_at: string | null;
    id: string;
    whatsapp_account_id: string | null;
  };

  return {
    ...conversation,
    account: Array.isArray(conversation.account)
      ? conversation.account[0] || null
      : conversation.account || null,
    contact: Array.isArray(conversation.contact)
      ? conversation.contact[0] || null
      : conversation.contact || null,
  };
}

export async function sendWhatsAppMessageAction(formData: FormData) {
  const { supabase, user } = await requireWhatsAppUser();

  let input;
  try {
    input = sendWhatsAppMessageSchema.parse({
      body: formData.get("body"),
      conversationId: formData.get("conversation_id"),
      returnTo: formData.get("return_to"),
      templateId: formData.get("template_id") || undefined,
    });
  } catch (error) {
    redirectWithMessage(String(formData.get("return_to") || ""), getActionMessage(error));
  }

  let conversation;
  try {
    conversation = await loadConversation(supabase, input.conversationId);
  } catch (error) {
    redirectWithMessage(input.returnTo, getActionMessage(error));
  }

  if (!conversation.contact) {
    redirectWithMessage(input.returnTo, "Kontakti WhatsApp nuk u gjet.");
  }

  if (conversation.contact.opted_out) {
    redirectWithMessage(input.returnTo, "Ky kontakt ka refuzuar mesazhet WhatsApp.");
  }

  const insideWindow = isInsideCustomerServiceWindow(
    conversation.customer_service_window_expires_at,
  );

  if (!insideWindow && !input.templateId) {
    redirectWithMessage(
      input.returnTo,
      "Dritarja 24-orëshe e WhatsApp ka skaduar. Zgjidh nje template te aprovuar.",
    );
  }

  let selectedTemplate: {
    body: string | null;
    language: string | null;
    name: string;
    status: string;
    variables: unknown;
  } | null = null;

  if (input.templateId) {
    const { data: template, error: templateError } = await supabase
      .from("whatsapp_templates")
      .select("body,language,name,status,variables")
      .eq("id", input.templateId)
      .single();

    if (templateError || !template) {
      redirectWithMessage(input.returnTo, "Template-i WhatsApp nuk u gjet.");
    }

    if (template.status !== "approved") {
      redirectWithMessage(input.returnTo, "Zgjidh nje template te aprovuar.");
    }

    if (templateRequiresVariables(template.variables)) {
      redirectWithMessage(
        input.returnTo,
        "Ky template kerkon variabla. Krijo nje template pa variabla ose shto mbushjen e variablave.",
      );
    }

    selectedTemplate = template;
  }

  const configured = isWhatsAppConfigured();
  const config = getWhatsAppConfig();
  const phoneNumberId =
    conversation.account?.phone_number_id || config.phoneNumberId || null;

  if (!configured || !phoneNumberId || conversation.account?.status !== "connected") {
    redirectWithMessage(
      input.returnTo,
      "Integrimi WhatsApp nuk eshte konfiguruar ende. Mesazhi nuk u dergua.",
    );
  }

  const { data: outbound, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      body: selectedTemplate ? selectedTemplate.body || input.body : input.body,
      conversation_id: conversation.id,
      direction: "outbound",
      message_type: selectedTemplate ? "template" : "text",
      sender_type: "agent",
      sender_user_id: user.id,
      status: "queued",
      template_name: selectedTemplate?.name || null,
    })
    .select("id")
    .single();

  if (insertError || !outbound) {
    redirectWithMessage(
      input.returnTo,
      insertError?.message || "Mesazhi nuk u ruajt para dergimit.",
    );
  }

  const whatsappPayload = selectedTemplate
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        template: {
          language: { code: selectedTemplate.language || "sq" },
          name: selectedTemplate.name,
        },
        to: conversation.contact.phone_e164.replace(/^\+/, ""),
        type: "template",
      }
    : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        text: { body: input.body, preview_url: false },
        to: conversation.contact.phone_e164.replace(/^\+/, ""),
        type: "text",
      };

  let responseOk = false;
  let payload: { messages?: Array<{ id?: string }> } = {};

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}/messages`,
      {
        body: JSON.stringify(whatsappPayload),
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
    };
    responseOk = response.ok;
  } catch {
    await supabase
      .from("whatsapp_messages")
      .update({
        failed_at: new Date().toISOString(),
        status: "failed",
        status_reason: "WhatsApp send failed.",
      })
      .eq("id", outbound.id);

    redirectWithMessage(input.returnTo, "Mesazhi WhatsApp nuk u dergua. Provo perseri.");
  }

  if (!responseOk) {
    await supabase
      .from("whatsapp_messages")
      .update({
        failed_at: new Date().toISOString(),
        status: "failed",
        status_reason: "WhatsApp API rejected the message.",
      })
      .eq("id", outbound.id);

    redirectWithMessage(
      input.returnTo,
      "WhatsApp refuzoi mesazhin. Kontrollo konfigurimin ose template-in.",
    );
  }

  await supabase
    .from("whatsapp_messages")
    .update({
      sent_at: new Date().toISOString(),
      status: "sent",
      whatsapp_message_id: payload.messages?.[0]?.id || null,
    })
    .eq("id", outbound.id);

  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_outbound_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  revalidatePath("/messages/whatsapp");
  redirectWithMessage(input.returnTo, "Mesazhi WhatsApp u dergua.");
}

export async function addWhatsAppInternalNoteAction(formData: FormData) {
  const { supabase, user } = await requireWhatsAppUser();

  let input;
  try {
    input = whatsappNoteSchema.parse({
      body: formData.get("body"),
      conversationId: formData.get("conversation_id"),
      returnTo: formData.get("return_to"),
    });
  } catch (error) {
    redirectWithMessage(String(formData.get("return_to") || ""), getActionMessage(error));
  }

  const { error } = await supabase.from("whatsapp_internal_notes").insert({
    author_id: user.id,
    body: input.body,
    conversation_id: input.conversationId,
  });

  if (error) {
    redirectWithMessage(input.returnTo, error.message);
  }

  revalidatePath("/messages/whatsapp");
  redirectWithMessage(input.returnTo, "Shenimi i brendshem u shtua.");
}

export async function assignWhatsAppConversationAction(formData: FormData) {
  const { profile, supabase } = await requireWhatsAppUser();

  let input;
  try {
    input = whatsappAssignSchema.parse({
      assignedAgentId: formData.get("assigned_agent_id") || undefined,
      conversationId: formData.get("conversation_id"),
      returnTo: formData.get("return_to"),
    });
  } catch (error) {
    redirectWithMessage(String(formData.get("return_to") || ""), getActionMessage(error));
  }

  if (!["admin", "manager", "support"].includes(profile.role)) {
    redirectWithMessage(input.returnTo, "Vetem menaxheret, adminet ose support mund te caktojne biseda.");
  }

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ assigned_agent_id: input.assignedAgentId || null })
    .eq("id", input.conversationId);

  if (error) {
    redirectWithMessage(input.returnTo, error.message);
  }

  revalidatePath("/messages/whatsapp");
  redirectWithMessage(input.returnTo, "Biseda u caktua.");
}

export async function createWhatsAppFollowUpAction(formData: FormData) {
  const { supabase } = await requireWhatsAppUser();

  let input;
  try {
    input = whatsappFollowUpSchema.parse({
      conversationId: formData.get("conversation_id"),
      followUpAt: formData.get("follow_up_at"),
      note: formData.get("note") || undefined,
      returnTo: formData.get("return_to"),
    });
  } catch (error) {
    redirectWithMessage(String(formData.get("return_to") || ""), getActionMessage(error));
  }

  const date = new Date(input.followUpAt);

  if (Number.isNaN(date.getTime())) {
    redirectWithMessage(input.returnTo, "Data e ndjekjes nuk eshte e vlefshme.");
  }

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({
      follow_up_note: cleanText(input.note),
      next_follow_up_at: date.toISOString(),
      sla_due_at: date.toISOString(),
    })
    .eq("id", input.conversationId);

  if (error) {
    redirectWithMessage(input.returnTo, error.message);
  }

  revalidatePath("/messages/whatsapp");
  redirectWithMessage(input.returnTo, "Ndjekja u planifikua.");
}

export async function createSellerLeadFromWhatsAppAction(formData: FormData) {
  const { profile, supabase, user } = await requireWhatsAppUser();

  if (!isOperatorRole(profile.role)) {
    redirectWithMessage(
      String(formData.get("return_to") || ""),
      "Vetem operatorët mund te krijojne lead shitësi.",
    );
  }

  let input;
  try {
    input = whatsappSellerLeadSchema.parse({
      city: formData.get("city") || undefined,
      conversationId: formData.get("conversation_id"),
      expectedPrice: formData.get("expected_price") || undefined,
      propertyType: formData.get("property_type") || undefined,
      returnTo: formData.get("return_to"),
      sellerName: formData.get("seller_name"),
    });
  } catch (error) {
    redirectWithMessage(String(formData.get("return_to") || ""), getActionMessage(error));
  }

  let conversation;
  try {
    conversation = await loadConversation(supabase, input.conversationId);
  } catch (error) {
    redirectWithMessage(input.returnTo, getActionMessage(error));
  }

  if (!conversation.contact?.phone_e164) {
    redirectWithMessage(input.returnTo, "Numri i kontaktit WhatsApp mungon.");
  }

  const phoneNormalized = normalizePhone(conversation.contact.phone_e164);
  const { data: duplicate } = await supabase
    .from("seller_leads")
    .select("id,seller_name,status")
    .eq("phone_normalized", phoneNormalized)
    .neq("status", "lost")
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    redirectWithMessage(
      input.returnTo,
      `Ky numer ekziston te lead-i "${duplicate.seller_name}". Lidhe biseden me lead-in ekzistues.`,
    );
  }

  const qualityScore = calculateSellerLeadScore({
    city: cleanText(input.city),
    expected_price:
      input.expectedPrice === "" || input.expectedPrice == null
        ? undefined
        : Number(input.expectedPrice),
    phone: conversation.contact.phone_e164,
    preferred_contact_method: "whatsapp",
    property_type: cleanText(input.propertyType) as never,
    seller_name: input.sellerName,
    source: "whatsapp",
  });

  const { data: lead, error } = await supabase
    .from("seller_leads")
    .insert({
      assigned_agent_id: user.id,
      assigned_agent_name: profile.full_name || user.email,
      city: cleanText(input.city),
      created_by: user.id,
      expected_price:
        input.expectedPrice === "" || input.expectedPrice == null
          ? null
          : Number(input.expectedPrice),
      phone: conversation.contact.phone_e164,
      phone_normalized: phoneNormalized,
      preferred_contact_method: "whatsapp",
      property_type: cleanText(input.propertyType),
      quality_score: qualityScore,
      seller_name: input.sellerName,
      seller_notes: "Krijuar nga biseda WhatsApp.",
      source: "whatsapp",
      status: "new",
      temperature: getSellerLeadTemperature(qualityScore),
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !lead) {
    redirectWithMessage(input.returnTo, error?.message || "Lead-i nuk u krijua.");
  }

  await supabase
    .from("whatsapp_conversations")
    .update({
      linked_seller_lead_id: lead.id,
      type: "seller",
    })
    .eq("id", conversation.id);

  await supabase.from("whatsapp_conversation_links").insert({
    conversation_id: conversation.id,
    created_by: user.id,
    entity_id: lead.id,
    entity_type: "seller_lead",
  });

  revalidatePath("/messages/whatsapp");
  revalidatePath("/seller-leads");
  redirectWithMessage(input.returnTo, "Lead-i i shitësit u krijua nga WhatsApp.");
}
