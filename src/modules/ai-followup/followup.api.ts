import { NextResponse } from "next/server";

import {
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
  isOperatorProfile,
} from "@/lib/supabase/server";

export async function getFollowUpApiContext() {
  const { authError, profile, supabase, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    return {
      response: NextResponse.json(
        { error: "Session expired. Please sign in again.", success: false },
        { status: 401 },
      ),
    } as const;
  }

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required.", success: false },
        { status: 401 },
      ),
    } as const;
  }

  if (!isApprovedProfile(profile)) {
    return {
      response: NextResponse.json(
        { error: "Account is not approved.", success: false },
        { status: 403 },
      ),
    } as const;
  }

  if (!isOperatorProfile(profile)) {
    return {
      response: NextResponse.json(
        { error: "Operator access is required.", success: false },
        { status: 403 },
      ),
    } as const;
  }

  return { profile, supabase, user } as const;
}

export function followUpApiError(error: unknown, fallback = "Follow-up AI request failed.") {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
      success: false,
    },
    { status: 500 },
  );
}
