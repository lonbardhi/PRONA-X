"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Apple,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
  WalletCards,
} from "lucide-react";

type AuthEntryProps = {
  message?: string;
  requestPasswordResetAction: (formData: FormData) => void | Promise<void>;
  signInAction: (formData: FormData) => void | Promise<void>;
  signInWithAppleAction: (formData: FormData) => void | Promise<void>;
  signInWithGoogleAction: (formData: FormData) => void | Promise<void>;
  signUpAction: (formData: FormData) => void | Promise<void>;
};

type AuthMode = "login" | "signup" | "recovery";

const heroSlides = [
  {
    image: "/brand/albania-beach-properties-for-sale-2-1920x1920.jpg",
    alt: "Albanian coastal villa on a cliff above the sea",
    quote:
      "A premium operating layer for Albania's most desirable coastal property inventory.",
    title: "Coastal Portfolio",
    subtitle: "Luxury villas, beachfront homes, and land",
    note: "Built for high-trust property sales teams",
  },
  {
    image: "/brand/albania-beachfront-properties-for-sale-1920x1920.jpg",
    alt: "Beachfront modern property overlooking the Albanian coastline",
    quote:
      "Create, manage, and share polished property pages with the confidence of a branded workspace.",
    title: "PRONA X Cloud",
    subtitle: "Property operations platform",
    note: "Inventory, media, roles, and public sharing",
  },
  {
    image: "/brand/albania-beach-properties-for-sale-2-1920x1920.jpg",
    alt: "Mediterranean villa with sea views and cliffside landscaping",
    quote:
      "Turn every listing into a controlled, shareable buyer experience without exposing admin tools.",
    title: "Buyer-Ready Listings",
    subtitle: "WhatsApp-ready property links",
    note: "Public pages stay view-only by design",
  },
];

export function AuthEntry({
  message,
  requestPasswordResetAction,
  signInAction,
  signInWithAppleAction,
  signInWithGoogleAction,
  signUpAction,
}: AuthEntryProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const action =
    mode === "login"
      ? signInAction
      : mode === "recovery"
        ? requestPasswordResetAction
        : signUpAction;
  const slide = heroSlides[slideIndex];

  function showPreviousSlide() {
    setSlideIndex((index) => (index === 0 ? heroSlides.length - 1 : index - 1));
  }

  function showNextSlide() {
    setSlideIndex((index) => (index + 1) % heroSlides.length);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] bg-[size:40px_40px] px-4 py-4 text-slate-950 sm:px-6 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <div className="relative min-h-[540px] overflow-hidden bg-slate-950 lg:min-h-full">
          <Image
            alt={slide.alt}
            className="absolute inset-0 h-full w-full object-cover"
            fill
            loading="eager"
            sizes="(min-width: 1024px) 680px, 100vw"
            src={slide.image}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.1)_38%,rgba(2,6,23,0.78)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-2/3 bg-[linear-gradient(90deg,rgba(2,6,23,0.46)_0%,rgba(2,6,23,0.12)_58%,transparent_100%)]" />

          <div className="absolute left-6 top-6 rounded-3xl border border-white/25 bg-white/92 px-5 py-4 shadow-xl backdrop-blur-md sm:left-8 sm:top-8 sm:px-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/20">
                <Building2 className="h-7 w-7" />
              </span>
              <div>
                <p className="text-3xl font-black uppercase leading-none tracking-[0.08em] text-slate-950">
                  PRONA X
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Albania property operations
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-white">
                Sell
              </span>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                Manage
              </span>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-700">
                Share
              </span>
            </div>
          </div>

          <div className="absolute left-6 right-6 top-40 max-w-xl text-white sm:left-8 sm:right-auto sm:top-48">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-200">
              PRONA X Platform
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-normal sm:text-5xl">
              Coastal property work, branded end to end.
            </h2>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/85">
              A sharp workspace for Albanian property teams that need listings,
              media, sharing, and access control in one place.
            </p>
          </div>

          <div className="absolute bottom-36 right-6 hidden rounded-2xl border border-white/25 bg-white/18 px-4 py-3 text-white shadow-xl backdrop-blur-md xl:block">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">
              Market focus
            </p>
            <p className="mt-1 text-lg font-semibold">Albanian Riviera</p>
            <p className="text-sm text-white/75">Premium listings, buyer-ready</p>
          </div>

          <div className="absolute bottom-6 left-6 flex gap-2 sm:left-8">
            {heroSlides.map((item, index) => (
              <button
                key={item.title}
                aria-label={`Show ${item.title}`}
                className={`h-2.5 rounded-full transition ${
                  index === slideIndex ? "w-9 bg-white" : "w-2.5 bg-white/45"
                }`}
                onClick={() => setSlideIndex(index)}
                type="button"
              />
            ))}
          </div>

          <div className="absolute bottom-6 right-6 flex gap-2 sm:right-8">
            <button
              aria-label="Previous feature"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 text-white ring-1 ring-white/25 transition hover:bg-white/28"
              onClick={showPreviousSlide}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next feature"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 text-white ring-1 ring-white/25 transition hover:bg-white/28"
              onClick={showNextSlide}
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute inset-x-5 bottom-16 rounded-3xl border border-white/25 bg-slate-950/38 p-5 text-white shadow-2xl backdrop-blur-md sm:inset-x-8 sm:bottom-20 sm:p-6">
            <p className="max-w-xl text-xl font-semibold leading-8">
              &quot;{slide.quote}&quot;
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-2xl font-bold">{slide.title}</p>
                <p className="mt-1 text-sm font-medium text-white/82">
                  {slide.subtitle}
                </p>
                <p className="text-sm text-white/68">{slide.note}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/12 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                  Brand signal
                </p>
                <p className="mt-1 text-lg font-semibold">PRONA X</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mx-auto flex w-fit rounded-lg bg-slate-100 p-1">
              <button
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
                onClick={() => setMode("login")}
                type="button"
              >
                <LogIn className="h-4 w-4" />
                Login
              </button>
              <button
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
                onClick={() => setMode("signup")}
                type="button"
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </button>
            </div>

            <div className="mt-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {mode === "login"
                  ? "Sign in to PRONA X"
                  : mode === "recovery"
                    ? "Reset your password"
                    : "Create your PRONA X account"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? "Sign in to manage inventory, media, roles, and public shares."
                  : mode === "recovery"
                    ? "Enter your email and we will send a secure reset link."
                    : "Start your PRONA X workspace for property operations."}
              </p>
            </div>

            {message ? (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                {message}
              </div>
            ) : null}

            {mode !== "recovery" ? (
              <div className="mt-6 grid gap-3">
                <form action={signInWithGoogleAction}>
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    type="submit"
                  >
                    <span className="text-base font-bold">G</span>
                    Continue with Google
                  </button>
                </form>

                <form action={signInWithAppleAction}>
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    type="submit"
                  >
                    <Apple className="h-4 w-4" />
                    Continue with Apple
                  </button>
                </form>

                <button
                  className="inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-400"
                  disabled
                  title="Binance OAuth is not a Supabase provider in this workspace."
                  type="button"
                >
                  <Building2 className="h-4 w-4" />
                  Continue with Binance
                </button>

                <button
                  className="inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-400"
                  disabled
                  title="Wallet sign-in needs a dedicated wallet authentication flow."
                  type="button"
                >
                  <WalletCards className="h-4 w-4" />
                  Continue with Wallet
                </button>
              </div>
            ) : null}

            <div className={`${mode === "recovery" ? "my-6" : "my-6"} flex items-center gap-3`}>
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase text-slate-400">
                {mode === "recovery" ? "email reset" : "or"}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form action={action} className="grid gap-4">
              {mode === "signup" ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Full name
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      name="full_name"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email address
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    name="email"
                    placeholder="Enter your email address"
                    required
                    type="email"
                  />
                </div>
              </label>

              {mode !== "recovery" ? (
                <div className="grid gap-2 text-sm font-medium text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="auth-password">Password</label>
                    {mode === "login" ? (
                      <button
                        className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                        onClick={() => setMode("recovery")}
                        type="button"
                      >
                        Forgot password?
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      id="auth-password"
                      minLength={6}
                      name="password"
                      placeholder="Enter your password"
                      required
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowPassword((value) => !value)}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "signup" ? (
                <label className="flex items-start gap-3 text-xs leading-5 text-slate-500">
                  <input
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    name="updates"
                    type="checkbox"
                  />
                  Keep me updated with platform news, property workflow updates,
                  and PRONA X release notes.
                </label>
              ) : null}

              <button className="mt-2 h-12 rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                {mode === "login"
                  ? "Sign in"
                  : mode === "recovery"
                    ? "Send reset link"
                    : "Create account"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              {mode === "login"
                ? "New to PRONA X?"
                : mode === "recovery"
                  ? "Remember your password?"
                  : "Already have an account?"}{" "}
              <button
                className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                type="button"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
