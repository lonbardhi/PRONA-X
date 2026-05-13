import { redirect } from "next/navigation";

import { updatePasswordAction } from "@/app/login/actions";
import { LogoMark } from "@/components/BrandLogo";
import { SetupNotice } from "@/components/SetupNotice";
import { authMessages } from "@/lib/auth/security";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import {
  getClearSessionPath,
  getCurrentUser,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";

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

  const locale = await getCurrentLocale();
  const { authError, user } = await getCurrentUser();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        locale === "sq" ? authMessages.sessionExpiredSq : authMessages.sessionExpiredEn,
      ),
    );
  }

  if (!user) {
    redirect(
      `/?message=${encodeURIComponent(
        locale === "sq"
          ? "Hap linkun e rivendosjes nga emaili para se të zgjedhësh fjalëkalim të ri."
          : "Open the password reset link from your email before choosing a new password.",
      )}`,
    );
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-3 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-2xl sm:p-6">
        <LogoMark
          className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          priority
        />
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          PRONA X access
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
          {locale === "sq" ? "Zgjidh fjalëkalim të ri" : "Choose a new password"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {locale === "sq" ? "Vendos fjalëkalim të ri për " : "Set a new password for "}
          <span className="break-all font-medium text-slate-700">{user.email}</span>.
          {locale === "sq"
            ? " Pas ruajtjes, hyr nga ekrani kryesor."
            : " After saving, use it from the main sign-in screen."}
        </p>

        {params.message ? (
          <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        <form action={updatePasswordAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {locale === "sq" ? "Fjalëkalimi i ri" : "New password"}
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              minLength={10}
              name="password"
              placeholder={
                locale === "sq" ? "Shkruaj fjalëkalimin e ri" : "Enter a new password"
              }
              required
              type="password"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t(locale, "auth.confirmPassword")}
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              minLength={10}
              name="confirm_password"
              placeholder={t(locale, "auth.confirmPasswordPlaceholder")}
              required
              type="password"
            />
          </label>

          <p className="text-xs font-medium leading-5 text-slate-500">
            {t(locale, "auth.passwordRequirements")}
          </p>

          <button className="h-11 rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800">
            {locale === "sq" ? "Ruaj fjalëkalimin" : "Save new password"}
          </button>
        </form>
      </section>
    </main>
  );
}
