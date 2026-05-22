import { NextResponse } from "next/server";

import {
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
  isOperatorProfile,
} from "@/lib/supabase/server";

export async function getSmartListingKitApiContext() {
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

export function smartListingKitApiError(
  error: unknown,
  fallback = "Smart Listing Kit request failed.",
) {
  const message = error instanceof Error ? error.message : fallback;
  const isSafeConfigurationError = message.includes("SUPABASE_SERVICE_ROLE_KEY");
  const status =
    message.includes("not found") || message.includes("access denied") ? 404 : 500;

  return NextResponse.json(
    {
      error: status === 500 && !isSafeConfigurationError ? fallback : message,
      success: false,
    },
    { status },
  );
}
