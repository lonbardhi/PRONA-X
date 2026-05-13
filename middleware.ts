import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authLoginPath, getSafeInternalRedirect } from "@/lib/auth/security";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/env";

const protectedPrefixes = [
  "/admin",
  "/appointments",
  "/calendar",
  "/dashboard",
  "/kalendari",
  "/messages",
  "/mesazhe",
  "/paneli",
  "/profile",
  "/properties",
  "/rentals",
  "/sales",
  "/seller-leads",
  "/settings",
  "/support",
  "/users",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  redirectUrl.pathname = authLoginPath;
  redirectUrl.search = "";
  redirectUrl.searchParams.set("next", getSafeInternalRedirect(returnTo));

  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv() || !isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const { anonKey, url } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirectToLogin(request);
  }

  response.headers.set("Cache-Control", "no-store, private");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
