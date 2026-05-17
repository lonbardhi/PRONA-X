import type { User } from "@supabase/supabase-js";

import {
  getDefaultAgentMetrics,
  getDefaultUserPreferences,
  getDefaultUserStatus,
  type ActivityLog,
  type AgentMetric,
  type AgentWorkspaceData,
  type TodayAgendaItem,
  type UserNotification,
  type UserPreference,
  type UserProfile,
  type UserStatus,
} from "@/lib/agent-workspace";
import type { AuthProfile } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RawAgendaItem = Omit<TodayAgendaItem, "property"> & {
  property?: TodayAgendaItem["property"] | TodayAgendaItem["property"][] | null;
};

type RawActivityLog = Omit<ActivityLog, "metadata"> & {
  metadata: unknown;
};

type RawExtendedProfile = {
  agency_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  full_name: string | null;
  id: string;
  phone: string | null;
  role: string;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

function normalizeActivityLogs(rows: unknown): ActivityLog[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return (rows as RawActivityLog[]).map((row) => ({
    ...row,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
  }));
}

function normalizeAgenda(rows: unknown): TodayAgendaItem[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return (rows as RawAgendaItem[]).map((appointment) => ({
    ...appointment,
    property: firstRelation(appointment.property),
  }));
}

async function getExtendedProfile(
  supabase: SupabaseServerClient,
  user: User,
  fallback: AuthProfile,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,phone,role,created_at,avatar_url,agency_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      agency_name: null,
      avatar_url: null,
      created_at: fallback.created_at || user.created_at || null,
      email: user.email || null,
      full_name: fallback.full_name,
      id: fallback.id,
      phone: fallback.phone,
      role: fallback.role,
    };
  }

  const profile = data as RawExtendedProfile;

  return {
    agency_name: profile.agency_name || null,
    avatar_url: profile.avatar_url || null,
    created_at: profile.created_at || user.created_at || null,
    email: user.email || null,
    full_name: profile.full_name,
    id: profile.id,
    phone: profile.phone,
    role: profile.role,
  };
}

async function getUserStatus(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<UserStatus> {
  const { data, error } = await supabase
    .from("user_status")
    .select("id,user_id,status,status_message,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return getDefaultUserStatus(userId);
  }

  return data as UserStatus;
}

async function getUserPreferences(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<UserPreference> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select(
      "id,user_id,reminder_minutes_before_meeting,email_notifications,push_notifications,in_app_notifications,whatsapp_notifications,preferred_calendar_view,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return getDefaultUserPreferences(userId);
  }

  return data as UserPreference;
}

async function getNotifications(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<UserNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,user_id,title,message,type,related_entity_type,related_entity_id,conversation_id,message_id,read_at,created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data) {
    return [];
  }

  return data as UserNotification[];
}

async function getActivityLogs(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id,user_id,action,entity_type,entity_id,metadata,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error || !data) {
    return [];
  }

  return normalizeActivityLogs(data);
}

async function getAgentMetrics(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<AgentMetric> {
  const { data, error } = await supabase
    .from("agent_metrics")
    .select(
      "id,user_id,meetings_completed,leads_active,followups_overdue,properties_active,deals_closed,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return getDefaultAgentMetrics(userId);
  }

  return data as AgentMetric;
}

async function getTodayAgenda(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<TodayAgendaItem[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id,title,status,client_name,client_phone,client_email,starts_at,ends_at,location,property:properties(id,title,city,neighborhood,address,transaction_type)",
    )
    .gte("starts_at", startOfToday().toISOString())
    .lt("starts_at", startOfTomorrow().toISOString())
    .or(`assigned_agent_id.eq.${userId},created_by.eq.${userId}`)
    .order("starts_at", { ascending: true })
    .limit(8);

  if (error || !data) {
    return [];
  }

  return normalizeAgenda(data);
}

async function getCompletedMeetingsThisWeek(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("starts_at", startOfWeek().toISOString())
    .or(`assigned_agent_id.eq.${userId},created_by.eq.${userId}`);

  if (error) {
    return 0;
  }

  return count || 0;
}

async function getOverdueFollowups(supabase: SupabaseServerClient, userId: string) {
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("appointment_type", "follow_up")
    .eq("status", "scheduled")
    .lt("starts_at", new Date().toISOString())
    .or(`assigned_agent_id.eq.${userId},created_by.eq.${userId}`);

  if (error) {
    return 0;
  }

  return count || 0;
}

async function getActiveListings(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id,status")
    .or(`assigned_agent_id.eq.${userId},created_by.eq.${userId}`)
    .limit(1000);

  if (error || !data) {
    return 0;
  }

  const inactive = new Set(["archived", "sold", "rented", "withdrawn", "completed"]);

  return (data as Array<{ status: string }>).filter((property) => !inactive.has(property.status))
    .length;
}

export async function getAgentWorkspaceData(
  supabase: SupabaseServerClient,
  user: User,
  authProfile: AuthProfile,
): Promise<AgentWorkspaceData> {
  const [
    profile,
    status,
    preferences,
    notifications,
    activityLogs,
    baseMetrics,
    todayAgenda,
    completedThisWeek,
    overdueFollowups,
    activeListings,
  ] = await Promise.all([
    getExtendedProfile(supabase, user, authProfile),
    getUserStatus(supabase, user.id),
    getUserPreferences(supabase, user.id),
    getNotifications(supabase, user.id),
    getActivityLogs(supabase, user.id),
    getAgentMetrics(supabase, user.id),
    getTodayAgenda(supabase, user.id),
    getCompletedMeetingsThisWeek(supabase, user.id),
    getOverdueFollowups(supabase, user.id),
    getActiveListings(supabase, user.id),
  ]);

  const unreadNotifications = notifications.filter((notification) => !notification.read_at)
    .length;
  const metrics = {
    ...baseMetrics,
    followups_overdue: Math.max(baseMetrics.followups_overdue, overdueFollowups),
    meetings_completed: Math.max(baseMetrics.meetings_completed, completedThisWeek),
    properties_active: Math.max(baseMetrics.properties_active, activeListings),
  };

  return {
    activityLogs,
    metrics,
    notifications,
    preferences,
    profile,
    productivity: {
      active_leads: metrics.leads_active,
      active_listings: metrics.properties_active,
      completed_meetings_this_week: completedThisWeek,
      meetings_today: todayAgenda.length,
      overdue_followups: overdueFollowups,
      unread_notifications: unreadNotifications,
    },
    status,
    todayAgenda,
  };
}
