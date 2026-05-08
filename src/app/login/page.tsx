import { redirect } from "next/navigation";

import {
  requestPasswordResetAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/login/actions";
import { AuthEntry } from "@/components/AuthEntry";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/properties");
  }

  const params = await searchParams;

  return (
    <AuthEntry
      message={params.message}
      requestPasswordResetAction={requestPasswordResetAction}
      signInAction={signInAction}
      signInWithAppleAction={signInWithOAuthAction.bind(null, "apple")}
      signInWithGoogleAction={signInWithOAuthAction.bind(null, "google")}
      signUpAction={signUpAction}
    />
  );
}
