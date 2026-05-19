import { NextResponse } from "next/server";

import { getNotificationApiContext, notificationApiError } from "@/lib/notifications/api";
import { getUnreadNotificationCount } from "@/lib/notifications/service";

export async function GET() {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  try {
    const result = await getUnreadNotificationCount({
      supabase: context.supabase,
      userId: context.user.id,
      workspaceId: context.workspaceId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return notificationApiError(error);
  }
}
