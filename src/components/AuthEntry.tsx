"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AlertCircle,
  Apple,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { LogoMark } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthHeroSlides, type Locale, t } from "@/lib/i18n";

type AuthEntryProps = {
  locale: Locale;
  message?: string;
  nextPath?: string;
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
  nextPath = "/sales",
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
  const activeTab = mode === "signup" ? "signup" : "login";

  function showPreviousSlide() {
    setSlideIndex((index) => (index === 0 ? heroSlides.length - 1 : index - 1));
  }

  function showNextSlide() {
    setSlideIndex((index) => (index + 1) % heroSlides.length);
  }

  function setAuthMode(nextMode: AuthMode) {
    setShowPassword(false);
    setMode(nextMode);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-3 text-slate-950 sm:px-6 sm:py-4 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-7xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="relative hidden min-h-[540px] overflow-hidden bg-slate-950 lg:block lg:min-h-full">
          <Image
            alt={slide.alt}
            className="absolute inset-0 h-full w-full object-cover"
            fill
            loading="eager"
            sizes="(min-width: 1024px) 680px, 100vw"
            src={slide.image}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12)_0%,rgba(2,6,23,0.18)_42%,rgba(2,6,23,0.82)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-2/3 bg-[linear-gradient(90deg,rgba(2,6,23,0.48)_0%,rgba(2,6,23,0.14)_58%,transparent_100%)]" />

          <div className="absolute left-8 top-8 flex items-center gap-4 rounded-md border border-white/20 bg-white/95 px-5 py-4 shadow-lg backdrop-blur-md">
            <LogoMark
              className="rounded-md border border-slate-200 bg-white p-2 shadow-sm"
              priority
              size={54}
            />
            <div>
              <p className="text-2xl font-black uppercase leading-none tracking-[0.08em] text-slate-950">
                PRONA X
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {t(locale, "brand.subtitle")}
              </p>
            </div>
          </div>

          <div className="absolute left-8 right-8 top-48 max-w-xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200">
              PRONA X Platform
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-normal sm:text-5xl">
              {t(locale, "brand.tagline")}
            </h2>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/85">
              {locale === "sq"
                ? "Një hapësirë e sigurt për shitje, qira, tokë zhvillimi, media, dokumente, vizita dhe ofertim."
                : "A secure workspace for sales, rentals, development land, media, documents, viewings, and offers."}
            </p>
          </div>

          <div className="absolute bottom-6 left-8 flex gap-2">
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

          <div className="absolute bottom-6 right-8 flex gap-2">
            <Button
              aria-label="Previous feature"
              className="h-11 w-11 rounded-md border-white/25 bg-white/15 p-0 text-white hover:bg-white/25"
              onClick={showPreviousSlide}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              aria-label="Next feature"
              className="h-11 w-11 rounded-md border-white/25 bg-white/15 p-0 text-white hover:bg-white/25"
              onClick={showNextSlide}
              type="button"
              variant="outline"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="absolute inset-x-8 bottom-20 rounded-lg border border-white/20 bg-slate-950/46 p-5 text-white shadow-xl backdrop-blur-md">
            <p className="max-w-xl text-lg font-semibold leading-7">
              &quot;{slide.quote}&quot;
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-2xl font-bold">{slide.title}</p>
                <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-white/82">
                  {slide.subtitle}
                </p>
                {slide.note ? (
                  <p className="text-sm text-white/68">{slide.note}</p>
                ) : null}
              </div>
              <div className="rounded-md border border-white/15 bg-white/12 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                  {locale === "sq" ? "Sinjal marke" : "Brand signal"}
                </p>
                <p className="mt-1 text-lg font-semibold">PRONA X</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
          <div className="w-full max-w-[460px]">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LogoMark
                className="rounded-md border border-slate-200 bg-white p-1 shadow-sm"
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

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="gap-5 p-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Tabs
                    className="w-full sm:w-auto"
                    onValueChange={(value) => setAuthMode(value as "login" | "signup")}
                    value={activeTab}
                  >
                    <TabsList className="grid h-10 w-full grid-cols-2 sm:w-[220px]">
                      <TabsTrigger className="h-8 gap-2" value="login">
                        <LogIn className="h-4 w-4" />
                        {t(locale, "auth.login")}
                      </TabsTrigger>
                      <TabsTrigger className="h-8 gap-2" value="signup">
                        <UserPlus className="h-4 w-4" />
                        {t(locale, "auth.signUp")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <LanguageToggle locale={locale} returnTo="/login" />
                </div>

                <div>
                  <CardTitle className="text-2xl leading-8 sm:text-3xl">
                    {mode === "login"
                      ? t(locale, "auth.loginHeading")
                      : mode === "recovery"
                        ? t(locale, "auth.recoveryHeading")
                        : t(locale, "auth.createHeading")}
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    {mode === "login"
                      ? t(locale, "auth.loginIntro")
                      : mode === "recovery"
                        ? t(locale, "auth.recoveryIntro")
                        : t(locale, "auth.createIntro")}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="grid gap-5 p-5 pt-0 sm:p-6 sm:pt-0">
                {message ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-amber-900">
                      {message}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {mode === "signup" ? (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertDescription className="text-emerald-900">
                      {locale === "sq"
                        ? "Pas konfirmimit të emailit, një administrator miraton qasjen në CRM."
                        : "After email confirmation, an administrator approves CRM access."}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {mode !== "recovery" ? (
                  <div className="grid gap-3">
                    <form action={signInWithGoogleAction}>
                      <input name="next" type="hidden" value={nextPath} />
                      <Button className="h-11 w-full gap-3" type="submit" variant="outline">
                        <span className="text-base font-bold">G</span>
                        {t(locale, "auth.google")}
                      </Button>
                    </form>

                    <form action={signInWithAppleAction}>
                      <input name="next" type="hidden" value={nextPath} />
                      <Button className="h-11 w-full gap-3" type="submit" variant="outline">
                        <Apple className="h-4 w-4" />
                        {t(locale, "auth.apple")}
                      </Button>
                    </form>
                  </div>
                ) : null}

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <Separator />
                  <span className="text-xs font-medium uppercase text-slate-400">
                    {mode === "recovery" ? t(locale, "auth.emailReset") : t(locale, "auth.or")}
                  </span>
                  <Separator />
                </div>

                <form action={action} className="grid gap-4">
                  <input name="next" type="hidden" value={nextPath} />
                  {mode === "signup" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="auth-full-name">{t(locale, "auth.fullName")}</Label>
                      <div className="relative">
                        <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="h-11 rounded-md bg-white pl-10 pr-3"
                          id="auth-full-name"
                          name="full_name"
                          placeholder={t(locale, "auth.fullNamePlaceholder")}
                          required
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor="auth-email">{t(locale, "auth.email")}</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="h-11 rounded-md bg-white pl-10 pr-3"
                        id="auth-email"
                        name="email"
                        placeholder={t(locale, "auth.emailPlaceholder")}
                        required
                        type="email"
                      />
                    </div>
                  </div>

                  {mode !== "recovery" ? (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="auth-password">{t(locale, "auth.password")}</Label>
                        {mode === "login" ? (
                          <button
                            className="text-xs font-semibold text-slate-600 transition hover:text-slate-950"
                            onClick={() => setAuthMode("recovery")}
                            type="button"
                          >
                            {t(locale, "auth.forgotPassword")}
                          </button>
                        ) : null}
                      </div>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="h-11 rounded-md bg-white pl-10 pr-12"
                          id="auth-password"
                          minLength={mode === "signup" ? 10 : 1}
                          name="password"
                          placeholder={t(locale, "auth.passwordPlaceholder")}
                          required
                          type={showPassword ? "text" : "password"}
                        />
                        <Button
                          aria-label={
                            showPassword
                              ? t(locale, "auth.hidePassword")
                              : t(locale, "auth.showPassword")
                          }
                          className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-slate-500 hover:text-slate-950"
                          onClick={() => setShowPassword((value) => !value)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {mode === "signup" ? (
                        <p className="text-xs font-medium leading-5 text-slate-500">
                          {t(locale, "auth.passwordRequirements")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {mode === "signup" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="auth-confirm-password">
                        {t(locale, "auth.confirmPassword")}
                      </Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="h-11 rounded-md bg-white pl-10 pr-3"
                          id="auth-confirm-password"
                          minLength={10}
                          name="confirm_password"
                          placeholder={t(locale, "auth.confirmPasswordPlaceholder")}
                          required
                          type="password"
                        />
                      </div>
                    </div>
                  ) : null}

                  {mode === "signup" ? (
                    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <Checkbox
                        className="mt-0.5 data-checked:border-slate-950 data-checked:bg-slate-950"
                        id="auth-updates"
                        name="updates"
                        value="on"
                      />
                      <Label
                        className="cursor-pointer text-xs font-medium leading-5 text-slate-600"
                        htmlFor="auth-updates"
                      >
                        {t(locale, "auth.updates")}
                      </Label>
                    </div>
                  ) : null}

                  <Button className="mt-1 h-11 w-full" type="submit">
                    {mode === "login"
                      ? t(locale, "auth.signIn")
                      : mode === "recovery"
                        ? t(locale, "auth.sendReset")
                        : t(locale, "auth.createAccount")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="border-t border-slate-100 p-5 sm:p-6">
                <p className="w-full text-center text-sm text-slate-500">
                  {mode === "login"
                    ? t(locale, "auth.newAccount")
                    : mode === "recovery"
                      ? t(locale, "auth.rememberPassword")
                      : t(locale, "auth.alreadyAccount")}{" "}
                  <button
                    className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                    onClick={() => setAuthMode(mode === "login" ? "signup" : "login")}
                    type="button"
                  >
                    {mode === "login"
                      ? t(locale, "auth.createAccount")
                      : t(locale, "auth.signIn")}
                  </button>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
