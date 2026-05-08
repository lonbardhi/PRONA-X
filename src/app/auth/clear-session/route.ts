import { NextResponse, type NextRequest } from "next/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/login";
  }

  return value;
}

function isSupabaseAuthCookie(name: string) {
  return (
    name.startsWith("sb-") ||
    name.includes("supabase-auth-token") ||
    name.includes("supabase.auth.token")
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
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
