import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthDisplayMessage } from "@/lib/auth-messages";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null, origin: string) {
  if (!value) {
    return "/sales";
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.origin === origin) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    // Ignore invalid redirect targets.
  }

  return "/sales";
}

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
  const next = getSafeNextPath(
    requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirect_to"),
    requestUrl.origin,
  );
  const locale = await getCurrentLocale();

  if (!tokenHash || !type) {
    return getFailureRedirect(
      request,
      locale === "sq"
        ? "Linku i konfirmimit mungon token-in. Kërko një email të ri konfirmimi dhe përdor linkun më të fundit."
        : "The confirmation link is missing its token. Request a new confirmation email and use the newest link.",
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
        (locale === "sq"
          ? "Konfirmimi i emailit dështoi. Kërko një link të ri dhe provo përsëri."
          : "Email confirmation failed. Request a new link and try again."),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
