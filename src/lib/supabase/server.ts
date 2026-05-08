import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/env";

export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Auth actions can.
        }
      },
    },
  });
}

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  const name = "name" in error && typeof error.name === "string" ? error.name : "";

  return (
    name === "AuthApiError" &&
    (message.includes("Invalid Refresh Token") ||
      message.includes("Refresh Token Not Found"))
  );
}

export async function getCurrentUser() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return { authError: error, supabase, user: null };
    }

    return { authError: null, supabase, user };
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      return { authError: error, supabase, user: null };
    }

    throw error;
  }
}

export function getClearSessionPath(next = "/login", message?: string) {
  const params = new URLSearchParams({ next });

  if (message) {
    params.set("message", message);
  }

  return `/auth/clear-session?${params.toString()}`;
}

