"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAuthAuditEvent } from "@/lib/auth/audit";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
} from "@/lib/auth/rate-limit";
import {
  authMessages,
  getSafeInternalRedirect,
  getZodErrorMessage,
  localizedAuthMessage,
  loginSchema,
  normalizeEmail,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signUpSchema,
} from "@/lib/auth/security";
import { getSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient, isApprovedProfile } from "@/lib/supabase/server";

type OAuthProvider = "google" | "apple";
type AuthActionLocale = "sq" | "en";

async function getActionLocale(): Promise<AuthActionLocale> {
  return await getCurrentLocale();
}

function isSq(locale: AuthActionLocale) {
  return locale === "sq";
}

function getSignInMessage(locale: AuthActionLocale) {
  return isSq(locale) ? authMessages.genericLoginSq : authMessages.genericLoginEn;
}

function getAccountCreatedMessage(locale: AuthActionLocale) {
  return isSq(locale)
    ? authMessages.accountCreatedSq
    : authMessages.accountCreatedEn;
}

function getProviderNotEnabledMessage(
  provider: OAuthProvider,
  locale: AuthActionLocale,
) {
  return isSq(locale)
    ? `Hyrja me ${provider} është lidhur në PRONA X, por provideri nuk është aktivizuar ende në Supabase Auth. Aktivizoje te Authentication > Providers dhe provo përsëri.`
    : `${provider} sign-in is wired in PRONA X, but the provider is not enabled in Supabase Auth yet. Enable it in Authentication > Providers, then try again.`;
}

function getProviderStartErrorMessage(
  provider: OAuthProvider,
  locale: AuthActionLocale,
) {
  return isSq(locale)
    ? `Hyrja me ${provider} nuk mundi të nisej. Provo përsëri.`
    : `${provider} sign-in could not start. Try again.`;
}

function getProviderUnavailableMessage(
  provider: OAuthProvider,
  locale: AuthActionLocale,
) {
  return isSq(locale)
    ? `Hyrja me ${provider} nuk është e disponueshme. Konfirmo që provideri është aktiv në Supabase Auth.`
    : `${provider} sign-in is not available. Confirm the provider is enabled in Supabase Auth.`;
}

function getPasswordResetSentMessage(locale: AuthActionLocale) {
  return isSq(locale) ? authMessages.resetSentSq : authMessages.resetSentEn;
}

function getPasswordUpdatedMessage(locale: AuthActionLocale) {
  return isSq(locale)
    ? authMessages.passwordUpdatedSq
    : authMessages.passwordUpdatedEn;
}

async function getOrigin() {
  const headersList = await headers();

  return (
    headersList.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}

async function getRequestMeta() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

  return {
    identifierIp: ip,
    userAgent: headersList.get("user-agent"),
  };
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

async function isOAuthProviderEnabled(provider: OAuthProvider) {
  const { url, anonKey } = getSupabaseEnv();

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return true;
    }

    const settings = (await response.json()) as {
      external?: Partial<Record<OAuthProvider, boolean>>;
    };

    return settings.external?.[provider] !== false;
  } catch {
    return true;
  }
}

export async function signInAction(formData: FormData) {
  const locale = await getActionLocale();
  const supabase = await createClient();
  const { identifierIp, userAgent } = await getRequestMeta();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithMessage("/login", getZodErrorMessage(parsed.error));
  }
  const input = parsed.data;

  const rateKey = `${input.email}:${identifierIp}`;
  if (!checkAuthRateLimit("login", rateKey).allowed) {
    redirectWithMessage(
      "/login",
      localizedAuthMessage(locale, authMessages.rateLimitSq, authMessages.rateLimitEn),
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    await createAuthAuditEvent(supabase, {
      email: input.email,
      eventType: "login_failure",
      metadata: { reason: "auth_rejected" },
      userAgent,
    });
    redirectWithMessage("/login", getSignInMessage(locale));
  }

  clearAuthRateLimit("login", rateKey);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  await createAuthAuditEvent(supabase, {
    email: input.email,
    eventType: "login_success",
    userAgent,
    userId: data.user.id,
  });

  if (!data.user.email_confirmed_at) {
    redirectWithMessage(
      "/login",
      localizedAuthMessage(
        locale,
        "Konfirmo emailin para se të hysh në CRM.",
        "Confirm your email before accessing the CRM.",
      ),
    );
  }

  if (!isApprovedProfile(profile)) {
    redirect("/pending-approval");
  }

  redirect(getSafeInternalRedirect(input.next));
}

export async function signUpAction(formData: FormData) {
  const locale = await getActionLocale();
  const origin = await getOrigin();
  const supabase = await createClient();
  const { identifierIp, userAgent } = await getRequestMeta();
  const parsed = signUpSchema.safeParse({
    confirmPassword: formData.get("confirm_password"),
    email: formData.get("email"),
    fullName: formData.get("full_name"),
    next: formData.get("next") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithMessage("/login", getZodErrorMessage(parsed.error));
  }
  const input = parsed.data;

  const rateKey = `${input.email}:${identifierIp}`;
  if (!checkAuthRateLimit("signup", rateKey).allowed) {
    redirectWithMessage(
      "/login",
      localizedAuthMessage(locale, authMessages.rateLimitSq, authMessages.rateLimitEn),
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/pending-approval`,
      data: {
        full_name: input.fullName,
      },
    },
  });

  if (error) {
    await createAuthAuditEvent(supabase, {
      email: input.email,
      eventType: "signup_failed",
      metadata: { reason: "provider_rejected" },
      userAgent,
    });
    redirectWithMessage(
      "/login",
      localizedAuthMessage(
        locale,
        "Regjistrimi nuk u krye. Kontrollo të dhënat dhe provo përsëri.",
        "Signup could not be completed. Check the details and try again.",
      ),
    );
  }

  clearAuthRateLimit("signup", rateKey);
  await createAuthAuditEvent(supabase, {
    email: input.email,
    eventType: "signup_requested",
    targetUserId: data.user?.id || null,
    userAgent,
  });

  if (!data.session) {
    redirectWithMessage("/login", getAccountCreatedMessage(locale));
  }

  redirect("/pending-approval");
}

export async function signInWithOAuthAction(
  provider: OAuthProvider,
  formData?: FormData,
) {
  const locale = await getActionLocale();
  const origin = await getOrigin();
  const { identifierIp, userAgent } = await getRequestMeta();
  const next = getSafeInternalRedirect(
    typeof formData?.get("next") === "string"
      ? String(formData.get("next"))
      : undefined,
  );

  if (!checkAuthRateLimit("oauth", `${provider}:${identifierIp}`).allowed) {
    redirectWithMessage(
      "/login",
      localizedAuthMessage(locale, authMessages.rateLimitSq, authMessages.rateLimitEn),
    );
  }

  const providerEnabled = await isOAuthProviderEnabled(provider);

  if (!providerEnabled) {
    redirectWithMessage("/login", getProviderNotEnabledMessage(provider, locale));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams:
        provider === "google"
          ? {
              prompt: "select_account",
            }
          : undefined,
    },
  });

  if (error) {
    await createAuthAuditEvent(supabase, {
      eventType: "oauth_start_failed",
      metadata: { provider },
      userAgent,
    });
    redirectWithMessage("/login", getProviderStartErrorMessage(provider, locale));
  }

  if (!data.url) {
    redirectWithMessage("/login", getProviderUnavailableMessage(provider, locale));
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(formData: FormData) {
  const locale = await getActionLocale();
  const origin = await getOrigin();
  const supabase = await createClient();
  const { identifierIp, userAgent } = await getRequestMeta();
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirectWithMessage("/login", getZodErrorMessage(parsed.error));
  }
  const input = parsed.data;

  const rateKey = `${input.email}:${identifierIp}`;
  if (!checkAuthRateLimit("password-reset", rateKey).allowed) {
    redirectWithMessage(
      "/login",
      localizedAuthMessage(locale, authMessages.rateLimitSq, authMessages.rateLimitEn),
    );
  }

  await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
  });

  await createAuthAuditEvent(supabase, {
    email: input.email,
    eventType: "password_reset_requested",
    userAgent,
  });

  redirectWithMessage("/login", getPasswordResetSentMessage(locale));
}

export async function updatePasswordAction(formData: FormData) {
  const locale = await getActionLocale();
  const supabase = await createClient();
  const { identifierIp, userAgent } = await getRequestMeta();
  const parsed = passwordUpdateSchema.safeParse({
    confirmPassword: formData.get("confirm_password"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithMessage("/auth/reset-password", getZodErrorMessage(parsed.error));
  }
  const input = parsed.data;

  if (!checkAuthRateLimit("password-update", identifierIp).allowed) {
    redirectWithMessage(
      "/auth/reset-password",
      localizedAuthMessage(locale, authMessages.rateLimitSq, authMessages.rateLimitEn),
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.auth.updateUser({ password: input.password });

  if (error) {
    redirectWithMessage(
      "/auth/reset-password",
      localizedAuthMessage(locale, authMessages.invalidLinkSq, authMessages.invalidLinkEn),
    );
  }

  await createAuthAuditEvent(supabase, {
    email: normalizeEmail(userData.user?.email),
    eventType: "password_reset_completed",
    userAgent,
    userId: userData.user?.id || null,
  });

  await supabase.auth.signOut({ scope: "others" });
  redirectWithMessage("/login", getPasswordUpdatedMessage(locale));
}

export async function signOutAction() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { userAgent } = await getRequestMeta();

  await createAuthAuditEvent(supabase, {
    eventType: "logout",
    userAgent,
    userId: data.user?.id || null,
  });
  await supabase.auth.signOut();
  redirect("/login");
}
