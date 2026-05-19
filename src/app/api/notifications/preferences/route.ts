import { NextResponse } from "next/server";

import { getDefaultUserPreferences } from "@/lib/agent-workspace";
import { getNotificationApiContext, notificationApiError } from "@/lib/notifications/api";
import { notificationPreferenceSchema } from "@/lib/notifications/validation";

const preferenceSelect =
  "id,user_id,reminder_minutes_before_meeting,email_notifications,push_notifications,in_app_notifications,whatsapp_notifications,preferred_calendar_view,created_at,updated_at";

export async function GET() {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  const { data, error } = await context.supabase
    .from("user_preferences")
    .select(preferenceSelect)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) {
    return notificationApiError(error);
  }

  return NextResponse.json(data || getDefaultUserPreferences(context.user.id));
}

export async function PATCH(request: Request) {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  const parsed = notificationPreferenceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid notification preferences." },
      { status: 400 },
    );
  }

  try {
    const { data: existing } = await context.supabase
      .from("user_preferences")
      .select("preferred_calendar_view")
      .eq("user_id", context.user.id)
      .maybeSingle();
    const { data, error } = await context.supabase
      .from("user_preferences")
      .upsert(
        {
          ...parsed.data,
          preferred_calendar_view: existing?.preferred_calendar_view || "week",
          updated_at: new Date().toISOString(),
          user_id: context.user.id,
        },
        { onConflict: "user_id" },
      )
      .select(preferenceSelect)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    return notificationApiError(error);
  }
}
