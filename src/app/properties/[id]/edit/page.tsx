import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Gavel, Sheet } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { EntityDiscussionPanel } from "@/components/messaging/EntityDiscussionPanel";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyLinkedListingPanel } from "@/components/PropertyLinkedListingPanel";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  isRentalTransaction,
  normalizeAssignedAgent,
  type PropertyAgentOption,
  type PropertyRecord,
} from "@/lib/properties";
import { requireOperatorUser } from "@/lib/supabase/server";

const propertySelect =
  "id,title,slug,description,type,transaction_type,status,city,neighborhood,address,price_eur,price_on_request,rent_period,available_from,deposit_eur,minimum_lease_months,maximum_lease_months,furnished_state,utilities_included,sublease_allowed,business_use_allowed,asset_id,linked_sale_property_id,linked_rental_property_id,bedrooms,bathrooms,area_m2,year_built,plot_size_m2,land_certificate_number,cadastral_zone,parcel_number,ownership_status,landowners_count,current_land_use,development_zone,building_coefficient,max_floors,estimated_gross_buildable_area_m2,estimated_net_sellable_area_m2,estimated_apartments,estimated_garages,estimated_parking_spaces,estimated_commercial_units,road_access,utilities_access,planning_permission_status,construction_permit_status,urban_study_status,landowner_requested_percentage,minimum_acceptable_percentage,preferred_compensation_type,preferred_floor_allocation,preferred_unit_orientation,agreement_notes,negotiation_status,developer_name,developer_contact,developer_offered_percentage,developer_proposed_project_size,developer_proposed_delivery_timeline,developer_proposed_unit_allocation,developer_conditions,developer_offer_status,visibility,assigned_agent_id,created_at,assigned_agent:profiles!properties_assigned_agent_id_fkey(id,full_name,email,phone,role,avatar_url,agency_name),property_media(id,public_url,alt_text,sort_order)";

const linkedListingSelect = "id,title,transaction_type,status";

type EditPropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

type LinkedListingSummary = Pick<
  PropertyRecord,
  "id" | "status" | "title" | "transaction_type"
>;

function getAgentOptions(
  profiles: PropertyAgentOption[],
  currentUser: { email?: string | null; id: string },
) {
  const seen = new Set<string>();
  const options: PropertyAgentOption[] = [];

  for (const profile of profiles) {
    if (seen.has(profile.id)) {
      continue;
    }

    seen.add(profile.id);
    options.push(profile);
  }

  if (!seen.has(currentUser.id)) {
    options.unshift({
      agency_name: null,
      avatar_url: null,
      email: currentUser.email || null,
      full_name: currentUser.email || "Current user",
      id: currentUser.id,
      phone: null,
      role: "agent",
    });
  }

  return options;
}

export default async function EditPropertyPage({
  params,
  searchParams,
}: EditPropertyPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireOperatorUser();

  const [propertyResult, profileResult] = await Promise.all([
    supabase.from("properties").select(propertySelect).eq("id", id).single(),
    supabase
      .from("profiles")
      .select("id,full_name,email,phone,role,avatar_url,agency_name")
      .in("role", ["admin", "manager", "agent"])
      .order("full_name", { ascending: true }),
  ]);
  const property = propertyResult.data;

  if (!property) {
    notFound();
  }

  const typedProperty = {
    ...(property as unknown as PropertyRecord),
    assigned_agent: normalizeAssignedAgent(
      (property as unknown as PropertyRecord).assigned_agent,
    ),
  };
  const agentOptions = getAgentOptions(
    (profileResult.data || []) as PropertyAgentOption[],
    { email: user.email, id: user.id },
  );
  const query = await searchParams;
  const directLinkedId = isRentalTransaction(typedProperty.transaction_type)
    ? typedProperty.linked_sale_property_id
    : typedProperty.linked_rental_property_id;
  let linkedListing: LinkedListingSummary | null = null;

  if (directLinkedId) {
    const { data } = await supabase
      .from("properties")
      .select(linkedListingSelect)
      .eq("id", directLinkedId)
      .maybeSingle();
    linkedListing = data as LinkedListingSummary | null;
  } else if (typedProperty.asset_id) {
    let linkedQuery = supabase
      .from("properties")
      .select(linkedListingSelect)
      .eq("asset_id", typedProperty.asset_id)
      .neq("id", typedProperty.id)
      .limit(1);

    linkedQuery = isRentalTransaction(typedProperty.transaction_type)
      ? linkedQuery.eq("transaction_type", "sale")
      : linkedQuery.in("transaction_type", ["rent", "rent_to_own"]);

    const { data } = await linkedQuery.maybeSingle();
    linkedListing = data as LinkedListingSummary | null;
  }

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-5xl gap-5 px-3 py-5 sm:px-6 sm:py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            {locale === "sq" ? "Ndrysho listimin" : "Edit listing"}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
            {typedProperty.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {locale === "sq"
              ? "Përditëso detajet e pronës ose shto foto, video dhe skedarë PDF."
              : "Update property details or append more photos, videos, and PDF files."}
          </p>

          {query.message ? (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {query.message}
            </div>
          ) : null}

          <div className="mt-6">
            <PropertyForm
              action={`/properties/${id}/update`}
              agentOptions={agentOptions}
              locale={locale}
              property={typedProperty}
              submitLabel={locale === "sq" ? "Ruaj ndryshimet" : "Save changes"}
              transactionType={typedProperty.transaction_type}
            />
          </div>
        </div>

        <PropertyLinkedListingPanel
          canManage
          linkedListing={linkedListing}
          locale={locale}
          property={typedProperty}
        />

        <EntityDiscussionPanel
          conversationType="property_thread"
          entityId={typedProperty.id}
          entityTitle={typedProperty.title}
          entityType="property"
          locale={locale}
          returnTo={`/properties/${typedProperty.id}/edit`}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {locale === "sq" ? "Dokumente & Kontrata" : "Documents & Contracts"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {locale === "sq" ? "Dosja ligjore dhe komerciale" : "Legal and commercial file"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                {locale === "sq"
                  ? "Menaxho dokumentet, ofertat Excel dhe kontratat e lidhura me këtë pronë."
                  : "Manage documents, Excel offers, and contracts linked to this property."}
              </p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={`/documents?entity_type=property&entity_id=${typedProperty.id}`}
              prefetch={false}
            >
              <FileText className="h-4 w-4" />
              {locale === "sq" ? "Hap dosjen" : "Open file"}
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
              href={`/documents?tab=property-docs&entity_type=property&entity_id=${typedProperty.id}`}
              prefetch={false}
            >
              <FileText className="mb-3 h-5 w-5 text-emerald-600" />
              {locale === "sq" ? "Dokumente" : "Documents"}
            </Link>
            <Link
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
              href={`/documents?tab=offers&entity_type=property&entity_id=${typedProperty.id}`}
              prefetch={false}
            >
              <Sheet className="mb-3 h-5 w-5 text-cyan-600" />
              {locale === "sq" ? "Oferta" : "Offers"}
            </Link>
            <Link
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
              href={`/documents?tab=contracts&entity_type=property&entity_id=${typedProperty.id}`}
              prefetch={false}
            >
              <Gavel className="mb-3 h-5 w-5 text-amber-600" />
              {locale === "sq" ? "Kontrata" : "Contracts"}
            </Link>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
