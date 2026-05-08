import { LogoMark } from "@/components/BrandLogo";

export function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-3 py-6 sm:px-6">
      <section className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-2xl sm:p-8">
        <LogoMark
          className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          priority
        />
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          PRONA X setup
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
          Connect Supabase to start using the platform.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Copy <span className="break-all font-mono text-slate-900">.env.example</span> to{" "}
          <span className="break-all font-mono text-slate-900">.env.local</span>, add your Supabase
          project URL and anon key, then run the SQL migration in{" "}
          <span className="break-all font-mono text-slate-900">
            supabase/migrations/0001_initial_schema.sql
          </span>
          .
        </p>
      </section>
    </main>
  );
}

