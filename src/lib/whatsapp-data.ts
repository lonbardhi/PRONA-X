import type { User } from "@supabase/supabase-js";

import { isWhatsAppConfigured } from "@/lib/whatsapp-config";
import {
  isMissingWhatsAppSchemaError,
  type WhatsAppAccount,
  type WhatsAppConversation,
  type WhatsAppInternalNote,
  type WhatsAppMessage,
  type WhatsAppProfileSummary,
  type WhatsAppTemplate,
} from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/server";
import type { AuthProfile } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type WhatsAppPageData = {
  activeConversation: WhatsAppConversation | null;
  activeConversationId: string | null;
  accounts: WhatsAppAccount[];
  conversations: WhatsAppConversation[];
  isConfigured: boolean;
  messages: WhatsAppMessage[];
  notes: WhatsAppInternalNote[];
  profiles: WhatsAppProfileSummary[];
  templates: WhatsAppTemplate[];
};

export async function getWhatsAppSetupWarning(supabase: SupabaseServerClient) {
  const { error } = await supabase.from("whatsapp_conversations").select("id").limit(1);

  return isMissingWhatsAppSchemaError(error)
    ? "Konfigurimi i databazes WhatsApp eshte ne pritje. Ekzekuto supabase/migrations/0016_whatsapp_inbox.sql ne Supabase SQL Editor, pastaj rifresko faqen."
    : null;
}

async function getProfiles(supabase: SupabaseServerClient) {
  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,role")
    .in("role", ["admin", "manager", "agent", "support"])
    .order("full_name", { ascending: true });

  return (data || []) as WhatsAppProfileSummary[];
}

export async function getWhatsAppPageData({
  selectedConversationId,
  supabase,
  user,
  profile,
}: {
  selectedConversationId?: string;
  supabase: SupabaseServerClient;
  user: User;
  profile: AuthProfile;
}): Promise<WhatsAppPageData> {
  const [accountResult, profileResult, templateResult] = await Promise.all([
    supabase
      .from("whatsapp_accounts")
      .select("id,phone_number,display_name,waba_id,phone_number_id,status")
      .order("created_at", { ascending: true }),
    getProfiles(supabase),
    supabase
      .from("whatsapp_templates")
      .select("id,name,category,language,status,body,variables")
      .eq("status", "approved")
      .order("name", { ascending: true }),
  ]);

  const conversationsQuery = supabase
    .from("whatsapp_conversations")
    .select(
      "id,whatsapp_account_id,contact_id,assigned_agent_id,status,type,priority,unread_count,last_message_at,last_inbound_at,last_outbound_at,customer_service_window_expires_at,sla_due_at,next_follow_up_at,follow_up_note,linked_seller_lead_id,linked_property_id,created_at,contact:whatsapp_contacts(id,phone_e164,display_name,opted_out,marketing_consent,matched_seller_lead_id,matched_property_id),assigned_agent:profiles!whatsapp_conversations_assigned_agent_id_fkey(id,full_name,email,role)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: conversationsData } = await conversationsQuery;
  const conversations = ((conversationsData || []) as unknown as WhatsAppConversation[]).map(
    (conversation) => ({
      ...conversation,
      assigned_agent: Array.isArray(conversation.assigned_agent)
        ? conversation.assigned_agent[0] || null
        : conversation.assigned_agent || null,
      contact: Array.isArray(conversation.contact)
        ? conversation.contact[0] || null
        : conversation.contact || null,
    }),
  );

  const activeConversationId =
    selectedConversationId &&
    conversations.some((conversation) => conversation.id === selectedConversationId)
      ? selectedConversationId
      : conversations.find((conversation) => {
          if (profile.role === "agent") {
            return conversation.assigned_agent_id === user.id;
          }

          return true;
        })?.id ||
        conversations[0]?.id ||
        null;

  const [messageResult, noteResult] = activeConversationId
    ? await Promise.all([
        supabase
          .from("whatsapp_messages")
          .select(
            "id,conversation_id,whatsapp_message_id,direction,sender_type,sender_user_id,body,message_type,media_url,media_mime_type,template_name,status,status_reason,created_at",
          )
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true })
          .limit(120),
        supabase
          .from("whatsapp_internal_notes")
          .select("id,conversation_id,author_id,body,created_at,author:profiles!whatsapp_internal_notes_author_id_fkey(id,full_name,email,role)")
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true })
          .limit(80),
      ])
    : [{ data: [] }, { data: [] }];

  return {
    accounts: (accountResult.data || []) as WhatsAppAccount[],
    activeConversation:
      conversations.find((conversation) => conversation.id === activeConversationId) || null,
    activeConversationId,
    conversations,
    isConfigured:
      isWhatsAppConfigured() &&
      ((accountResult.data || []) as WhatsAppAccount[]).some(
        (account) => account.status === "connected",
      ),
    messages: (messageResult.data || []) as WhatsAppMessage[],
    notes: ((noteResult.data || []) as unknown as WhatsAppInternalNote[]).map((note) => ({
      ...note,
      author: Array.isArray(note.author) ? note.author[0] || null : note.author || null,
    })),
    profiles: profileResult,
    templates: (templateResult.data || []) as WhatsAppTemplate[],
  };
}
