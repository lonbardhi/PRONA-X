import { NextResponse, type NextRequest } from "next/server";

import { getSafeInternalRedirect } from "@/lib/auth/security";

function isSupabaseAuthCookie(name: string) {
  return (
    name.startsWith("sb-") ||
    name.includes("supabase-auth-token") ||
    name.includes("supabase.auth.token")
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const next = getSafeInternalRedirect(requestUrl.searchParams.get("next"), "/login");
  const message = requestUrl.searchParams.get("message");
  const redirectUrl = new URL(next, requestUrl.origin);

  if (message) {
    redirectUrl.searchParams.set("message", message);
  }

  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) {
      continue;
    }

    response.cookies.set(cookie.name, "", {
      expires: new Date(0),
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}
