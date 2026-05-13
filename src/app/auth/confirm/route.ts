import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthDisplayMessage } from "@/lib/auth-messages";
import { authMessages, getSafeInternalRedirect } from "@/lib/auth/security";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

function getFailureRedirect(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/?message=${encodeURIComponent(message)}`, request.nextUrl.origin),
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const tokenHash =
    requestUrl.searchParams.get("token_hash") || requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeInternalRedirect(
    requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect_to"),
  );
  const locale = await getCurrentLocale();

  if (!tokenHash || !type) {
    return getFailureRedirect(
      request,
      locale === "sq" ? authMessages.invalidLinkSq : authMessages.invalidLinkEn,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return getFailureRedirect(
      request,
      getAuthDisplayMessage({ error_description: error.message }, locale) ||
        (locale === "sq" ? authMessages.invalidLinkSq : authMessages.invalidLinkEn),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
