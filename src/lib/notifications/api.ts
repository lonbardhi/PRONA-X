import { NextResponse } from "next/server";

import {
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";
import { getNotificationWorkspaceId } from "@/lib/notifications/service";

export async function getNotificationApiContext() {
  const { authError, profile, supabase, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    return {
      response: NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 },
      ),
    } as const;
  }

  if (!user) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    } as const;
  }

  if (!isApprovedProfile(profile)) {
    return {
      response: NextResponse.json({ error: "Account is not approved." }, { status: 403 }),
    } as const;
  }

  return {
    profile,
    supabase,
    user,
    workspaceId: getNotificationWorkspaceId(profile),
  } as const;
}

export function notificationApiError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Notification request failed." },
    { status },
  );
}
