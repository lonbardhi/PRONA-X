import { NextResponse, type NextRequest } from "next/server";

import { getAuthDisplayMessage } from "@/lib/auth-messages";
import { authMessages, getSafeInternalRedirect } from "@/lib/auth/security";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

function redirectWithMessage(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/?message=${encodeURIComponent(message)}`, request.nextUrl.origin),
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const next = getSafeInternalRedirect(requestUrl.searchParams.get("next"));
  const locale = await getCurrentLocale();
  const callbackError = getAuthDisplayMessage(
    {
      error: requestUrl.searchParams.get("error"),
      error_code: requestUrl.searchParams.get("error_code"),
      error_description: requestUrl.searchParams.get("error_description"),
    },
    locale,
  );

  if (callbackError) {
    return redirectWithMessage(request, callbackError);
  }

  if (!code) {
    return redirectWithMessage(
      request,
      locale === "sq" ? authMessages.invalidLinkSq : authMessages.invalidLinkEn,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithMessage(
      request,
      getAuthDisplayMessage({ error_description: error.message }, locale) ||
        (locale === "sq" ? authMessages.invalidLinkSq : authMessages.invalidLinkEn),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
