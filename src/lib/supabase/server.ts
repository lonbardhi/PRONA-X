import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authMessages } from "@/lib/auth/security";
import { getSupabaseEnv } from "@/lib/env";

export type AppRole =
  | "admin"
  | "manager"
  | "agent"
  | "viewer"
  | "support"
  | "pending";

export type AccountStatus =
  | "active"
  | "deleted"
  | "disabled"
  | "pending_approval"
  | "rejected";

export type AuthProfile = {
  account_status?: AccountStatus | null;
  agency_name?: string | null;
  avatar_url?: string | null;
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  created_at?: string;
};

export const approvedAppRoles: AppRole[] = [
  "admin",
  "manager",
  "agent",
  "viewer",
  "support",
];

export const operatorAppRoles: AppRole[] = ["admin", "manager", "agent"];
export const supportAppRoles: AppRole[] = ["admin", "support"];
const inactiveAccountStatuses: AccountStatus[] = [
  "deleted",
  "disabled",
  "pending_approval",
  "rejected",
];

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
    .select("*")
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
  if (!profile || !approvedAppRoles.includes(profile.role)) {
    return false;
  }

  if (
    profile.account_status &&
    inactiveAccountStatuses.includes(profile.account_status)
  ) {
    return false;
  }

  return true;
}

export function isOperatorRole(role: AppRole | null | undefined) {
  return Boolean(role && operatorAppRoles.includes(role));
}

export function isOperatorProfile(profile: AuthProfile | null) {
  return Boolean(profile && isOperatorRole(profile.role));
}

export function isSupportRole(role: AppRole | null | undefined) {
  return Boolean(role && supportAppRoles.includes(role));
}

export function isSupportProfile(profile: AuthProfile | null) {
  return Boolean(profile && isSupportRole(profile.role));
}

export async function requireApprovedUser() {
  const { authError, profile, supabase, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        authMessages.sessionExpiredSq,
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

export async function requireOperatorUser() {
  const context = await requireApprovedUser();

  if (!isOperatorProfile(context.profile)) {
    redirect(
      "/sales?message=Kjo llogari ka akses vetem per lexim.",
    );
  }

  return context;
}

export async function requireAdminUser() {
  const context = await requireApprovedUser();

  if (context.profile.role !== "admin") {
    redirect("/sales?message=Kerkohet akses administratori per kete faqe.");
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

