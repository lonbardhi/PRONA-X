"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";

import { LogoMark } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getAuthHeroSlides, type Locale, t } from "@/lib/i18n";

type AuthEntryProps = {
  locale: Locale;
  message?: string;
  requestPasswordResetAction: (formData: FormData) => void | Promise<void>;
  signInAction: (formData: FormData) => void | Promise<void>;
  signInWithAppleAction: (formData: FormData) => void | Promise<void>;
  signInWithGoogleAction: (formData: FormData) => void | Promise<void>;
  signUpAction: (formData: FormData) => void | Promise<void>;
};

type AuthMode = "login" | "signup" | "recovery";

export function AuthEntry({
  locale,
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
  const heroSlides = getAuthHeroSlides(locale);
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
    <main className="min-h-screen bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] bg-[size:40px_40px] px-3 py-3 text-slate-950 sm:px-6 sm:py-4 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-7xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <div className="relative hidden min-h-[540px] overflow-hidden bg-slate-950 lg:block lg:min-h-full">
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
              <LogoMark
                className="rounded-2xl border border-white/30 bg-white p-2 shadow-lg shadow-slate-950/20"
                priority
                size={56}
              />
              <div>
                <p className="text-3xl font-black uppercase leading-none tracking-[0.08em] text-slate-950">
                  PRONA X
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {t(locale, "brand.subtitle")}
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex max-w-full items-center overflow-hidden rounded-full border border-slate-950/10 bg-slate-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm shadow-slate-950/10">
              <span>{t(locale, "nav.sales")}</span>
              <span className="mx-2 text-white/35">|</span>
              <span>{t(locale, "nav.rentals")}</span>
              <span className="mx-2 text-white/35">|</span>
              <span>{t(locale, "nav.land")}</span>
              <span className="mx-2 text-white/35">|</span>
              <span>{t(locale, "nav.share")}</span>
            </div>
          </div>

          <div className="absolute left-6 right-6 top-40 max-w-xl text-white sm:left-8 sm:right-auto sm:top-48">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-200">
              PRONA X Platform
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-normal sm:text-5xl">
              {t(locale, "brand.tagline")}
            </h2>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/85">
              {locale === "sq"
                ? "Një CRM premium për agjenci që menaxhojnë shitje, qira, tokë zhvillimi, media, dokumente, vizita, oferta dhe shpërndarje me klientë nga një hapësirë e sigurt."
                : "A premium CRM for agencies managing sales, rentals, development land, media, documents, viewings, offers, and client sharing from one secure workspace."}
            </p>
          </div>

          <div className="absolute bottom-36 right-6 hidden rounded-2xl border border-white/25 bg-white/18 px-4 py-3 text-white shadow-xl backdrop-blur-md xl:block">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">
              {locale === "sq" ? "Fokusi i tregut" : "Market focus"}
            </p>
            <p className="mt-1 text-lg font-semibold">Albanian Riviera</p>
            <p className="text-sm text-white/75">
              {locale === "sq" ? "Listime premium, gati për shitje" : "Premium listings, sales-ready"}
            </p>
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
            <p className="max-w-xl text-lg font-semibold leading-7 sm:text-xl sm:leading-8">
              &quot;{slide.quote}&quot;
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-xl font-bold sm:text-2xl">{slide.title}</p>
                <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-white/82">
                  {slide.subtitle}
                </p>
                {slide.note ? (
                  <p className="text-sm text-white/68">{slide.note}</p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/12 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                  {locale === "sq" ? "Sinjal marke" : "Brand signal"}
                </p>
                <p className="mt-1 text-lg font-semibold">PRONA X</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LogoMark
                className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                priority
                size={44}
              />
              <div className="min-w-0">
                <p className="truncate text-xl font-black uppercase tracking-[0.06em] text-slate-950">
                  PRONA X
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {t(locale, "brand.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex w-fit rounded-lg bg-slate-100 p-1">
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
                {t(locale, "auth.login")}
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
                {t(locale, "auth.signUp")}
              </button>
              </div>
              <LanguageToggle locale={locale} returnTo="/login" />
            </div>

            <div className="mt-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {mode === "login"
                  ? t(locale, "auth.loginHeading")
                  : mode === "recovery"
                    ? t(locale, "auth.recoveryHeading")
                    : t(locale, "auth.createHeading")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? t(locale, "auth.loginIntro")
                  : mode === "recovery"
                    ? t(locale, "auth.recoveryIntro")
                    : t(locale, "auth.createIntro")}
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
                    {t(locale, "auth.google")}
                  </button>
                </form>

                <form action={signInWithAppleAction}>
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    type="submit"
                  >
                    <Apple className="h-4 w-4" />
                    {t(locale, "auth.apple")}
                  </button>
                </form>

              </div>
            ) : null}

            <div className={`${mode === "recovery" ? "my-6" : "my-6"} flex items-center gap-3`}>
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase text-slate-400">
                {mode === "recovery" ? t(locale, "auth.emailReset") : t(locale, "auth.or")}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form action={action} className="grid gap-4">
              {mode === "signup" ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {t(locale, "auth.fullName")}
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      name="full_name"
                      placeholder={t(locale, "auth.fullNamePlaceholder")}
                      required
                    />
                  </div>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {t(locale, "auth.email")}
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    name="email"
                    placeholder={t(locale, "auth.emailPlaceholder")}
                    required
                    type="email"
                  />
                </div>
              </label>

              {mode !== "recovery" ? (
                <div className="grid gap-2 text-sm font-medium text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="auth-password">{t(locale, "auth.password")}</label>
                    {mode === "login" ? (
                      <button
                        className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                        onClick={() => setMode("recovery")}
                        type="button"
                      >
                        {t(locale, "auth.forgotPassword")}
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
                      placeholder={t(locale, "auth.passwordPlaceholder")}
                      required
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      aria-label={showPassword ? t(locale, "auth.hidePassword") : t(locale, "auth.showPassword")}
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
                  {t(locale, "auth.updates")}
                </label>
              ) : null}

              <button className="mt-2 h-12 rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                {mode === "login"
                  ? t(locale, "auth.signIn")
                  : mode === "recovery"
                    ? t(locale, "auth.sendReset")
                    : t(locale, "auth.createAccount")}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              {mode === "login"
                ? t(locale, "auth.newAccount")
                : mode === "recovery"
                  ? t(locale, "auth.rememberPassword")
                  : t(locale, "auth.alreadyAccount")}{" "}
              <button
                className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                type="button"
              >
                {mode === "login" ? t(locale, "auth.createAccount") : t(locale, "auth.signIn")}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
