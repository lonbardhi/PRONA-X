import { NextResponse, type NextRequest } from "next/server";

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

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/?message=${encodeURIComponent("Authentication callback was missing a code.")}`,
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/?message=${encodeURIComponent(`Authentication failed: ${error.message}`)}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
