"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  calculateSellerLeadScore,
  canConvertSellerLead,
  formDataToSellerLeadInput,
  getSellerLeadTemperature,
  normalizePhone,
  sellerLeadStatuses,
  sellerLeadToPropertyPayload,
  type SellerLeadRecord,
  type SellerLeadStatus,
} from "@/lib/seller-leads";
import { requireOperatorUser } from "@/lib/supabase/server";

function getSellerLeadsPath(message?: string, anchor?: string) {
  const params = new URLSearchParams();

  if (message) {
    params.set("message", message);
  }

  return `/seller-leads${params.size ? `?${params.toString()}` : ""}${
    anchor || ""
  }`;
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Kontrollo fushat e lead-it.";
  }

  return error instanceof Error
    ? error.message
    : "Veprimi nuk u krye. Provo përsëri.";
}

function cleanNullableText(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function toTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getAgentName(
  supabase: Awaited<ReturnType<typeof requireOperatorUser>>["supabase"],
  agentId: string | null,
  fallback: string | null,
) {
  if (!agentId) return fallback;

  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", agentId)
    .maybeSingle();

  return data?.full_name || fallback;
}

export async function createSellerLeadAction(formData: FormData) {
  const { profile, supabase, user } = await requireOperatorUser();

  let input;
  try {
    input = formDataToSellerLeadInput(formData);
  } catch (error) {
    redirect(getSellerLeadsPath(getActionErrorMessage(error), "#add-lead"));
  }

  const phoneNormalized = normalizePhone(input.phone);
  const { data: duplicate } = await supabase
    .from("seller_leads")
    .select("id,seller_name,status,last_contacted_at,assigned_agent_name")
    .eq("phone_normalized", phoneNormalized)
    .neq("status", "lost")
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    redirect(
      getSellerLeadsPath(
        `Ky numër telefoni ekziston te lead-i "${duplicate.seller_name}". Kontrollo lead-in ekzistues para se të krijosh dublikatë.`,
        `#lead-${duplicate.id}`,
      ),
    );
  }

  const assignedAgentId = input.assigned_agent_id || user.id;
  const assignedAgentName = await getAgentName(
    supabase,
    assignedAgentId,
    profile.full_name || user.email || null,
  );
  const qualityScore = calculateSellerLeadScore(input);
  const temperature = getSellerLeadTemperature(qualityScore);
  const { error } = await supabase.from("seller_leads").insert({
    address: cleanNullableText(input.address),
    area: cleanNullableText(input.area),
    assigned_agent_id: assignedAgentId,
    assigned_agent_name: assignedAgentName,
    asking_reason: cleanNullableText(input.asking_reason),
    city: cleanNullableText(input.city),
    created_by: user.id,
    documents_collected: Boolean(input.documents_collected),
    expected_price: input.expected_price ?? null,
    external_listing_url: cleanNullableText(input.external_listing_url),
    next_follow_up_at: toTimestamp(input.next_follow_up_at),
    ownership_confirmed: Boolean(input.ownership_confirmed),
    phone: input.phone.trim(),
    phone_normalized: phoneNormalized,
    photos_collected: Boolean(input.photos_collected),
    preferred_contact_method: input.preferred_contact_method,
    property_type: input.property_type || null,
    quality_score: qualityScore,
    seller_email: cleanNullableText(input.seller_email),
    seller_name: input.seller_name,
    seller_notes: cleanNullableText(input.seller_notes),
    source: input.source,
    source_details: cleanNullableText(input.source_details),
    status: input.status,
    temperature,
    timeline: input.timeline || null,
    updated_by: user.id,
    valuation_requested: Boolean(input.valuation_requested),
  });

  if (error) {
    redirect(getSellerLeadsPath(error.message, "#add-lead"));
  }

  revalidatePath("/seller-leads");
  redirect(getSellerLeadsPath("Lead-i i shitësit u krijua me sukses."));
}

async function loadSellerLead(id: string) {
  const { profile, supabase, user } = await requireOperatorUser();
  const { data: lead, error } = await supabase
    .from("seller_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    redirect(getSellerLeadsPath("Lead-i nuk u gjet ose nuk ke akses."));
  }

  return {
    lead: lead as SellerLeadRecord,
    profile,
    supabase,
    user,
  };
}

export async function updateSellerLeadStatusAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "");
  const status = String(formData.get("status") || "") as SellerLeadStatus;

  if (!leadId || !sellerLeadStatuses.includes(status)) {
    redirect(getSellerLeadsPath("Zgjidh një status të vlefshëm."));
  }

  const { lead, supabase, user } = await loadSellerLead(leadId);
  const patch: Record<string, unknown> = {
    status,
    updated_by: user.id,
  };

  if (status === "contacted" && !lead.last_contacted_at) {
    patch.last_contacted_at = new Date().toISOString();
  }

  if (status === "lost") {
    patch.lost_reason =
      String(formData.get("lost_reason") || "").trim() ||
      "U shënua si lead i humbur.";
  }

  if (status === "nurture") {
    patch.nurture_reason =
      String(formData.get("nurture_reason") || "").trim() ||
      "Për ndjekje afatgjatë.";
  }

  const score = calculateSellerLeadScore({
    ...lead,
    last_contacted_at:
      typeof patch.last_contacted_at === "string"
        ? patch.last_contacted_at
        : lead.last_contacted_at,
  });
  patch.quality_score = score;
  patch.temperature = getSellerLeadTemperature(score);

  const { error } = await supabase
    .from("seller_leads")
    .update(patch)
    .eq("id", leadId);

  if (error) {
    redirect(getSellerLeadsPath(error.message, `#lead-${leadId}`));
  }

  revalidatePath("/seller-leads");
  redirect(getSellerLeadsPath("Statusi i lead-it u përditësua.", `#lead-${leadId}`));
}

export async function markSellerLeadContactedAction(formData: FormData) {
  formData.set("status", "contacted");
  await updateSellerLeadStatusAction(formData);
}

export async function convertSellerLeadToPropertyAction(formData: FormData) {
  const leadId = String(formData.get("lead_id") || "");

  if (!leadId) {
    redirect(getSellerLeadsPath("Zgjidh lead-in që do të konvertosh."));
  }

  const { lead, profile, supabase, user } = await loadSellerLead(leadId);

  if (!canConvertSellerLead(lead, profile.role)) {
    redirect(
      getSellerLeadsPath(
        "Ky lead duhet të kualifikohet ose të kalojë në përgatitje para konvertimit.",
        `#lead-${leadId}`,
      ),
    );
  }

  let propertyPayload;
  try {
    propertyPayload = sellerLeadToPropertyPayload(lead, user.id);
  } catch (error) {
    redirect(getSellerLeadsPath(getActionErrorMessage(error), `#lead-${leadId}`));
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert(propertyPayload)
    .select("id")
    .single();

  if (propertyError || !property) {
    redirect(
      getSellerLeadsPath(
        propertyError?.message || "Prona draft nuk u krijua.",
        `#lead-${leadId}`,
      ),
    );
  }

  const { error: leadError } = await supabase
    .from("seller_leads")
    .update({
      converted_property_id: property.id,
      status: "converted",
      updated_by: user.id,
    })
    .eq("id", leadId);

  if (leadError) {
    redirect(getSellerLeadsPath(leadError.message, `#lead-${leadId}`));
  }

  revalidatePath("/seller-leads");
  revalidatePath("/sales");
  redirect(
    `/properties/${property.id}/edit?message=${encodeURIComponent(
      "Lead-i u konvertua në pronë draft. Plotëso detajet para publikimit.",
    )}`,
  );
}

