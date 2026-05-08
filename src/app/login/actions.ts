"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type OAuthProvider = "google" | "apple";

function getSignInMessage(message: string) {
  if (message === "Invalid login credentials") {
    return "Supabase rejected those credentials. Create an account first, confirm the email Supabase sends, then sign in with the same email and password.";
  }

  return message;
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
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/?message=${encodeURIComponent(getSignInMessage(error.message))}`);
  }

  redirect("/properties");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "");
  const origin = await getOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/properties`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      `/?message=${encodeURIComponent(
        "Account created. Confirm the email Supabase sends you, then sign in.",
      )}`,
    );
  }

  redirect("/properties");
}

export async function signInWithOAuthAction(provider: OAuthProvider) {
  const origin = await getOrigin();
  const providerEnabled = await isOAuthProviderEnabled(provider);

  if (!providerEnabled) {
    redirect(
      `/?message=${encodeURIComponent(
        `${provider} sign-in is wired in PRONA X, but the provider is not enabled in Supabase Auth yet. Enable it in Authentication > Providers, then try again.`,
      )}`,
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/properties`,
    },
  });

  if (error) {
    redirect(
      `/?message=${encodeURIComponent(
        `${provider} sign-in could not start: ${error.message}`,
      )}`,
    );
  }

  if (!data.url) {
    redirect(
      `/?message=${encodeURIComponent(
        `${provider} sign-in is not available. Confirm the provider is enabled in Supabase Auth.`,
      )}`,
    );
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const origin = await getOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/?message=${encodeURIComponent(
      "Password reset email sent. Open the link from your inbox to choose a new password.",
    )}`,
  );
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?message=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/?message=${encodeURIComponent(
      "Password updated. Sign in with your new password.",
    )}`,
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
