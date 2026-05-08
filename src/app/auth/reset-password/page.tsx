import { redirect } from "next/navigation";

import { updatePasswordAction } from "@/app/login/actions";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/?message=${encodeURIComponent(
        "Open the password reset link from your email before choosing a new password.",
      )}`,
    );
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          PRONA X access
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Set a new password for {user.email}. After saving, use it from the main
          sign-in screen.
        </p>

        {params.message ? (
          <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        <form action={updatePasswordAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            New password
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              minLength={6}
              name="password"
              placeholder="Enter a new password"
              required
              type="password"
            />
          </label>

          <button className="h-11 rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800">
            Save new password
          </button>
        </form>
      </section>
    </main>
  );
}
