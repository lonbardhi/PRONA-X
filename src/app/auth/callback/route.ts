import { NextResponse, type NextRequest } from "next/server";

import { getAuthDisplayMessage } from "@/lib/auth-messages";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/sales";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const locale = await getCurrentLocale();
  const callbackError = getAuthDisplayMessage({
    error: requestUrl.searchParams.get("error"),
    error_code: requestUrl.searchParams.get("error_code"),
    error_description: requestUrl.searchParams.get("error_description"),
  }, locale);

  if (callbackError) {
    return NextResponse.redirect(
      new URL(`/?message=${encodeURIComponent(callbackError)}`, requestUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/?message=${encodeURIComponent(
          locale === "sq"
            ? "Linkut të autentikimit i mungon kodi. Fillo hyrjen ose regjistrimin përsëri nga PRONA X."
            : "Authentication callback was missing a code. Start sign-in or signup again from PRONA X.",
        )}`,
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const message = getAuthDisplayMessage({ error_description: error.message }, locale);

    return NextResponse.redirect(
      new URL(
        `/?message=${encodeURIComponent(
          message ||
            (locale === "sq"
              ? `Autentikimi dështoi: ${error.message}`
              : `Authentication failed: ${error.message}`),
        )}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
