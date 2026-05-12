"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

type OAuthProvider = "google" | "apple";

type AuthActionLocale = "sq" | "en";

function isSq(locale: AuthActionLocale) {
  return locale === "sq";
}

async function getActionLocale(): Promise<AuthActionLocale> {
  return await getCurrentLocale();
}

function getSignInMessage(message: string, locale: AuthActionLocale) {
  if (message === "Invalid login credentials") {
    return isSq(locale)
      ? "Supabase i refuzoi keto kredenciale. Krijo llogarine fillimisht, konfirmo emailin qe dergon Supabase, pastaj hyr me te njejtin email dhe fjalekalim."
      : "Supabase rejected those credentials. Create an account first, confirm the email Supabase sends, then sign in with the same email and password.";
  }

  return message;
}

function getAccountCreatedMessage(locale: AuthActionLocale) {
  return isSq(locale)
    ? "Llogaria u krijua. Konfirmo emailin qe te dergon Supabase, pastaj hyr. Pas kesaj, nje admin do te miratoje aksesin ne CRM."
    : "Account created. Confirm the email Supabase sends you, then sign in. An admin will approve CRM access after that.";
}

function getProviderNotEnabledMessage(
  provider: OAuthProvider,
  locale: AuthActionLocale,
) {
  return isSq(locale)
    ? `Hyrja me ${provider} eshte lidhur ne PRONA X, por provideri nuk eshte aktivizuar ende ne Supabase Auth. Aktivizoje te Authentication > Providers dhe provo perseri.`
    : `${provider} sign-in is wired in PRONA X, but the provider is not enabled in Supabase Auth yet. Enable it in Authentication > Providers, then try again.`;
}

function getProviderStartErrorMessage(
  provider: OAuthProvider,
  locale: AuthActionLocale,
  message: string,
) {
  return isSq(locale)
    ? `Hyrja me ${provider} nuk mundi te nisej: ${message}`
    : `${provider} sign-in could not start: ${message}`;
}

function getProviderUnavailableMessage(
  provider: OAuthProvider,
  locale: AuthActionLocale,
) {
  return isSq(locale)
    ? `Hyrja me ${provider} nuk eshte e disponueshme. Konfirmo qe provideri eshte aktiv ne Supabase Auth.`
    : `${provider} sign-in is not available. Confirm the provider is enabled in Supabase Auth.`;
}

function getPasswordResetSentMessage(locale: AuthActionLocale) {
  return isSq(locale)
    ? "Emaili per rivendosjen e fjalekalimit u dergua. Hape linkun nga inbox-i per te zgjedhur nje fjalekalim te ri."
    : "Password reset email sent. Open the link from your inbox to choose a new password.";
}

function getPasswordUpdatedMessage(locale: AuthActionLocale) {
  return isSq(locale)
    ? "Fjalekalimi u perditesua. Hyr me fjalekalimin e ri."
    : "Password updated. Sign in with your new password.";
}

async function getOrigin() {
  const headersList = await headers();

  return (
    headersList.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
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
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const locale = await getActionLocale();
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/?message=${encodeURIComponent(getSignInMessage(error.message, locale))}`,
    );
  }

  redirect("/sales");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "");
  const locale = await getActionLocale();
  const origin = await getOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/sales`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(`/?message=${encodeURIComponent(getAccountCreatedMessage(locale))}`);
  }

  redirect("/pending-approval");
}

export async function signInWithOAuthAction(provider: OAuthProvider) {
  const locale = await getActionLocale();
  const origin = await getOrigin();
  const providerEnabled = await isOAuthProviderEnabled(provider);

  if (!providerEnabled) {
    redirect(`/?message=${encodeURIComponent(getProviderNotEnabledMessage(provider, locale))}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/sales`,
      queryParams:
        provider === "google"
          ? {
              prompt: "select_account",
            }
          : undefined,
    },
  });

  if (error) {
    redirect(
      `/?message=${encodeURIComponent(
        getProviderStartErrorMessage(provider, locale, error.message),
      )}`,
    );
  }

  if (!data.url) {
    redirect(`/?message=${encodeURIComponent(getProviderUnavailableMessage(provider, locale))}`);
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const locale = await getActionLocale();
  const origin = await getOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}`);
  }

  redirect(`/?message=${encodeURIComponent(getPasswordResetSentMessage(locale))}`);
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const locale = await getActionLocale();
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?message=${encodeURIComponent(error.message)}`);
  }

  redirect(`/?message=${encodeURIComponent(getPasswordUpdatedMessage(locale))}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
