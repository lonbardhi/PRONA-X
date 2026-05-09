import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseEnv } from "@/lib/env";

export type AppRole = "admin" | "manager" | "agent" | "viewer";

export type AuthProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  created_at?: string;
};

export const approvedAppRoles: AppRole[] = ["admin", "manager", "agent"];

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

export async function getCurrentUserWithProfile() {
  const { authError, supabase, user } = await getCurrentUser();

  if (!user) {
    return { authError, profile: null, profileError: null, supabase, user };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,phone,role,created_at")
    .eq("id", user.id)
    .single();

  return {
    authError,
    profile: (profile as AuthProfile | null) || null,
    profileError,
    supabase,
    user,
  };
}

export function isApprovedProfile(profile: AuthProfile | null) {
  return Boolean(profile && approvedAppRoles.includes(profile.role));
}

export async function requireApprovedUser() {
  const { authError, profile, supabase, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        "Your session expired. Sign in again to continue.",
      ),
    );
  }

  if (!user) {
    redirect("/login");
  }

  if (!isApprovedProfile(profile)) {
    redirect("/pending-approval");
  }

  return { profile: profile as AuthProfile, supabase, user };
}

export async function requireAdminUser() {
  const context = await requireApprovedUser();

  if (context.profile.role !== "admin") {
    redirect("/sales?message=Admin approval is required for that page.");
  }

  return context;
}

export function getClearSessionPath(next = "/login", message?: string) {
  const params = new URLSearchParams({ next });

  if (message) {
    params.set("message", message);
  }

  return `/auth/clear-session?${params.toString()}`;
}

