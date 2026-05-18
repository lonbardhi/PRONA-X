"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  canRequestMatchProperty,
  canRequestCreateListing,
  crmRequestMatchStatuses,
  crmRequestStatuses,
  formDataToCrmRequestInput,
  getRequestMatchScopeMessage,
  normalizeRequestPhone,
  type CrmRequestMatchRecord,
  type CrmRequestMatchStatus,
  type CrmRequestRecord,
  type CrmRequestStatus,
} from "@/lib/crm-requests";
import type { PropertyTransactionType } from "@/lib/properties";
import { createSlug, isRentalTransaction } from "@/lib/properties";
import { requireOperatorUser } from "@/lib/supabase/server";

function getRequestsPath(message?: string, anchor?: string) {
  const params = new URLSearchParams();

  if (message) {
    params.set("message", message);
  }

  return `/requests${params.size ? `?${params.toString()}` : ""}${anchor || ""}`;
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Kontrollo fushat e kërkesës.";
  }

  return error instanceof Error ? error.message : "Veprimi nuk u krye. Provo përsëri.";
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

async function loadCrmRequest(id: string) {
  const { profile, supabase, user } = await requireOperatorUser();
  const { data: request, error } = await supabase
    .from("crm_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !request) {
    redirect(getRequestsPath("Kërkesa nuk u gjet ose nuk ke akses."));
  }

  return {
    profile,
    request: request as CrmRequestRecord,
    supabase,
    user,
  };
}

async function loadMatchableProperty(
  supabase: Awaited<ReturnType<typeof requireOperatorUser>>["supabase"],
  propertyId: string,
) {
  const { data: property, error } = await supabase
    .from("properties")
    .select("id,title,transaction_type,status")
    .eq("id", propertyId)
    .single();

  if (error || !property) {
    redirect(getRequestsPath("Listimi nuk u gjet ose nuk ke akses."));
  }

  return property as {
    id: string;
    status: string;
    title: string;
    transaction_type: PropertyTransactionType;
  };
}

function getDraftListingTitle(request: CrmRequestRecord, transactionType: PropertyTransactionType) {
  const suffix = isRentalTransaction(transactionType) ? "Qira" : "Shitje";
  return `Kerkese pronari - ${request.customer_name} - ${suffix}`;
}

function getDraftListingDescription(request: CrmRequestRecord) {
  return [
    `Krijuar nga kerkesa e pronarit: ${request.customer_name}`,
    request.phone ? `Telefon: ${request.phone}` : "",
    request.email ? `Email: ${request.email}` : "",
    request.notes ? `Shenime: ${request.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createCrmRequestAction(formData: FormData) {
  const { profile, supabase, user } = await requireOperatorUser();

  let input;
  try {
    input = formDataToCrmRequestInput(formData);
  } catch (error) {
    redirect(getRequestsPath(getActionErrorMessage(error), "#add-request"));
  }

  const phoneNormalized = normalizeRequestPhone(input.phone);
  const { data: duplicate } = await supabase
    .from("crm_requests")
    .select("id,customer_name,status,request_type")
    .eq("phone_normalized", phoneNormalized)
    .eq("request_type", input.request_type)
    .not("status", "in", "(lost,archived)")
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    redirect(
      getRequestsPath(
        `Ky klient ka tashmë një kërkesë aktive: "${duplicate.customer_name}".`,
        `#request-${duplicate.id}`,
      ),
    );
  }

  const assignedAgentId = input.assigned_agent_id || user.id;
  const assignedAgentName = await getAgentName(
    supabase,
    assignedAgentId,
    profile.full_name || user.email || null,
  );

  const { error } = await supabase.from("crm_requests").insert({
    area: cleanNullableText(input.area),
    area_min_m2: input.area_min_m2 ?? null,
    assigned_agent_id: assignedAgentId,
    assigned_agent_name: assignedAgentName,
    bedrooms_min: input.bedrooms_min ?? null,
    city: cleanNullableText(input.city),
    created_by: user.id,
    customer_name: input.customer_name,
    email: cleanNullableText(input.email),
    max_budget_eur: input.max_budget_eur ?? null,
    min_budget_eur: input.min_budget_eur ?? null,
    next_follow_up_at: toTimestamp(input.next_follow_up_at),
    notes: cleanNullableText(input.notes),
    phone: input.phone.trim(),
    phone_normalized: phoneNormalized,
    preferred_contact_method: input.preferred_contact_method,
    property_type: input.property_type || null,
    rent_period: input.request_type === "tenant" ? input.rent_period || "monthly" : null,
    request_type: input.request_type,
    source: input.source,
    source_details: cleanNullableText(input.source_details),
    status: input.status,
    updated_by: user.id,
    urgency: input.urgency,
  });

  if (error) {
    redirect(getRequestsPath(error.message, "#add-request"));
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect(getRequestsPath("Kërkesa u krijua me sukses."));
}

export async function updateCrmRequestAction(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");

  if (!requestId) {
    redirect(getRequestsPath("Zgjidh një kërkesë për përditësim."));
  }

  const { profile, supabase, user } = await loadCrmRequest(requestId);

  let input;
  try {
    input = formDataToCrmRequestInput(formData);
  } catch (error) {
    redirect(getRequestsPath(getActionErrorMessage(error), `#request-${requestId}`));
  }

  const phoneNormalized = normalizeRequestPhone(input.phone);

  if (input.status !== "lost" && input.status !== "archived") {
    const { data: duplicate } = await supabase
      .from("crm_requests")
      .select("id,customer_name,status,request_type")
      .eq("phone_normalized", phoneNormalized)
      .eq("request_type", input.request_type)
      .neq("id", requestId)
      .not("status", "in", "(lost,archived)")
      .limit(1)
      .maybeSingle();

    if (duplicate) {
      redirect(
        getRequestsPath(
          `Ky klient ka tashmë një kërkesë aktive: "${duplicate.customer_name}".`,
          `#request-${duplicate.id}`,
        ),
      );
    }
  }

  const assignedAgentId = input.assigned_agent_id || user.id;
  const assignedAgentName = await getAgentName(
    supabase,
    assignedAgentId,
    profile.full_name || user.email || null,
  );
  const patch: Record<string, unknown> = {
    area: cleanNullableText(input.area),
    area_min_m2: input.area_min_m2 ?? null,
    assigned_agent_id: assignedAgentId,
    assigned_agent_name: assignedAgentName,
    bedrooms_min: input.bedrooms_min ?? null,
    city: cleanNullableText(input.city),
    customer_name: input.customer_name,
    email: cleanNullableText(input.email),
    max_budget_eur: input.max_budget_eur ?? null,
    min_budget_eur: input.min_budget_eur ?? null,
    next_follow_up_at: toTimestamp(input.next_follow_up_at),
    notes: cleanNullableText(input.notes),
    phone: input.phone.trim(),
    phone_normalized: phoneNormalized,
    preferred_contact_method: input.preferred_contact_method,
    property_type: input.property_type || null,
    rent_period: input.request_type === "tenant" ? input.rent_period || "monthly" : null,
    request_type: input.request_type,
    source: input.source,
    source_details: cleanNullableText(input.source_details),
    status: input.status,
    updated_by: user.id,
    urgency: input.urgency,
  };

  if (input.status === "contacted") {
    patch.last_contacted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("crm_requests")
    .update(patch)
    .eq("id", requestId);

  if (error) {
    redirect(getRequestsPath(error.message, `#request-${requestId}`));
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect(getRequestsPath("Kërkesa u përditësua me sukses.", `#request-${requestId}`));
}

export async function updateCrmRequestStatusAction(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  const status = String(formData.get("status") || "") as CrmRequestStatus;

  if (!requestId || !crmRequestStatuses.includes(status)) {
    redirect(getRequestsPath("Zgjidh një status të vlefshëm."));
  }

  const { request, supabase, user } = await loadCrmRequest(requestId);
  const patch: Record<string, unknown> = {
    status,
    updated_by: user.id,
  };

  if (status === "contacted" && !request.last_contacted_at) {
    patch.last_contacted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("crm_requests")
    .update(patch)
    .eq("id", requestId);

  if (error) {
    redirect(getRequestsPath(error.message, `#request-${requestId}`));
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect(getRequestsPath("Statusi i kërkesës u përditësua.", `#request-${requestId}`));
}
export async function createListingFromCrmRequestAction(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  const transactionType = String(formData.get("transaction_type") || "") as PropertyTransactionType;

  if (!requestId || (transactionType !== "sale" && transactionType !== "rent")) {
    redirect(getRequestsPath("Zgjidh kerkesen dhe llojin e listimit."));
  }

  const { request, supabase, user } = await loadCrmRequest(requestId);

  if (!canRequestCreateListing(request.request_type)) {
    redirect(
      getRequestsPath(
        "Vetem kerkesat e pronareve mund te kthehen ne listime te reja.",
        `#request-${requestId}`,
      ),
    );
  }

  if (request.converted_property_id) {
    redirect(`/properties/${request.converted_property_id}/edit`);
  }

  const title = getDraftListingTitle(request, transactionType);
  const city = cleanNullableText(request.city || undefined) || "Pa qytet";
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      address: null,
      area_m2: request.area_min_m2 ?? null,
      assigned_agent_id: request.assigned_agent_id || user.id,
      bathrooms: null,
      bedrooms: request.bedrooms_min ?? null,
      business_use_allowed: false,
      city,
      created_by: user.id,
      description: getDraftListingDescription(request),
      furnished_state: "unknown",
      neighborhood: cleanNullableText(request.area || undefined),
      price_eur: null,
      price_on_request: true,
      rent_period: transactionType === "rent" ? request.rent_period || "monthly" : "monthly",
      slug: createSlug(title),
      status: "draft",
      sublease_allowed: false,
      title,
      transaction_type: transactionType,
      type: request.property_type || "apartment",
      utilities_included: false,
      visibility: "internal_only",
    })
    .select("id")
    .single();

  if (error || !property) {
    redirect(
      getRequestsPath(
        error?.message || "Listimi nuk u krijua. Kontrollo kerkesen dhe provo perseri.",
        `#request-${requestId}`,
      ),
    );
  }

  await supabase
    .from("crm_requests")
    .update({
      converted_property_id: property.id,
      status: "converted",
      updated_by: user.id,
    })
    .eq("id", requestId);

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  revalidatePath("/rentals");
  redirect(`/properties/${property.id}/edit`);
}

export async function createCrmRequestMatchAction(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  const propertyId = String(formData.get("property_id") || "");

  if (!requestId || !propertyId) {
    redirect(getRequestsPath("Zgjidh nje kerkese dhe nje listim per perputhje."));
  }

  const { request, supabase, user } = await loadCrmRequest(requestId);
  const property = await loadMatchableProperty(supabase, propertyId);

  if (!canRequestMatchProperty(request.request_type, property.transaction_type)) {
    redirect(
      getRequestsPath(
        getRequestMatchScopeMessage(request.request_type, "sq"),
        `#request-${requestId}`,
      ),
    );
  }

  const { data: existing } = await supabase
    .from("crm_request_matches")
    .select("id")
    .eq("request_id", requestId)
    .eq("property_id", propertyId)
    .maybeSingle();

  const matchError = existing
    ? (
        await supabase
          .from("crm_request_matches")
          .update({
            match_status: "suggested",
            updated_by: user.id,
          })
          .eq("id", existing.id)
      ).error
    : (
        await supabase.from("crm_request_matches").insert({
          created_by: user.id,
          match_status: "suggested",
          property_id: propertyId,
          request_id: requestId,
          updated_by: user.id,
        })
      ).error;

  if (matchError) {
    redirect(getRequestsPath(matchError.message, `#request-${requestId}`));
  }

  const requestPatch: Record<string, unknown> = {
    matched_property_id: propertyId,
    updated_by: user.id,
  };

  if (["new", "contacted", "nurture"].includes(request.status)) {
    requestPatch.status = "matching";
  }

  await supabase.from("crm_requests").update(requestPatch).eq("id", requestId);

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect(getRequestsPath("Perputhja u ruajt.", `#request-${requestId}`));
}

export async function updateCrmRequestMatchStatusAction(formData: FormData) {
  const matchId = String(formData.get("match_id") || "");
  const status = String(formData.get("match_status") || "") as CrmRequestMatchStatus;

  if (!matchId || !crmRequestMatchStatuses.includes(status)) {
    redirect(getRequestsPath("Zgjidh nje status te vlefshem per perputhjen."));
  }

  const { supabase, user } = await requireOperatorUser();
  const { data: match, error } = await supabase
    .from("crm_request_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error || !match) {
    redirect(getRequestsPath("Perputhja nuk u gjet ose nuk ke akses."));
  }

  const typedMatch = match as CrmRequestMatchRecord;
  const patch: Record<string, unknown> = {
    match_status: status,
    updated_by: user.id,
  };

  if (status === "sent" && !typedMatch.sent_at) {
    patch.sent_at = new Date().toISOString();
  }

  if (status === "converted") {
    patch.converted_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("crm_request_matches")
    .update(patch)
    .eq("id", matchId);

  if (updateError) {
    redirect(getRequestsPath(updateError.message, `#request-${typedMatch.request_id}`));
  }

  const requestPatch: Record<string, unknown> = {
    updated_by: user.id,
  };

  if (status === "converted") {
    requestPatch.converted_property_id = typedMatch.property_id;
    requestPatch.status = "converted";
  } else if (status === "viewing" || status === "offer") {
    requestPatch.matched_property_id = typedMatch.property_id;
    requestPatch.status = status;
  } else if (status === "sent") {
    requestPatch.matched_property_id = typedMatch.property_id;
    requestPatch.status = "matching";
  }

  if (Object.keys(requestPatch).length > 1) {
    await supabase
      .from("crm_requests")
      .update(requestPatch)
      .eq("id", typedMatch.request_id);
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect(getRequestsPath("Statusi i perputhjes u perditesua.", `#request-${typedMatch.request_id}`));
}
