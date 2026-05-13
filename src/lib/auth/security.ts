import { z } from "zod";

export const authDefaultRedirect = "/sales";
export const authLoginPath = "/login";

const weakPasswords = new Set([
  "123456",
  "12345678",
  "123456789",
  "admin",
  "password",
  "password123",
  "prona123",
  "qwerty",
  "qwerty123",
  "welcome",
  "welcome123",
]);

export function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

export function sanitizeDisplayName(value: unknown) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 120);
}

export function isSafeInternalRedirect(value?: string | null) {
  if (!value) {
    return false;
  }

  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return false;
  }

  const lower = decoded.toLowerCase();
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.startsWith("/\\") ||
    lower.startsWith("javascript:") ||
    lower.includes("\u0000")
  ) {
    return false;
  }

  try {
    const parsed = new URL(decoded, "https://prona-x.local");
    return (
      parsed.origin === "https://prona-x.local" &&
      !parsed.pathname.startsWith("/auth/callback") &&
      !parsed.pathname.startsWith("/auth/confirm") &&
      !parsed.pathname.startsWith("/auth/clear-session")
    );
  } catch {
    return false;
  }
}

export function getSafeInternalRedirect(
  value?: string | null,
  fallback = authDefaultRedirect,
) {
  return isSafeInternalRedirect(value) ? String(value) : fallback;
}

export function getPasswordPolicyIssues(
  password: string,
  context: { email?: string; fullName?: string } = {},
) {
  const issues: string[] = [];
  const normalizedPassword = password.toLowerCase();
  const emailPrefix = context.email?.split("@")[0]?.toLowerCase();
  const nameParts =
    context.fullName
      ?.toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 3) || [];

  if (password.length < 10) {
    issues.push("Fjalëkalimi duhet të ketë të paktën 10 karaktere.");
  }
  if (!/[a-z]/.test(password)) {
    issues.push("Shto të paktën një shkronjë të vogël.");
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("Shto të paktën një shkronjë të madhe.");
  }
  if (!/[0-9]/.test(password)) {
    issues.push("Shto të paktën një numër.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push("Shto të paktën një simbol.");
  }
  if (weakPasswords.has(normalizedPassword)) {
    issues.push("Zgjidh një fjalëkalim më të fortë.");
  }
  if (emailPrefix && emailPrefix.length >= 3 && normalizedPassword.includes(emailPrefix)) {
    issues.push("Fjalëkalimi nuk duhet të përmbajë pjesën kryesore të emailit.");
  }
  if (nameParts.some((part) => normalizedPassword.includes(part))) {
    issues.push("Fjalëkalimi nuk duhet të përmbajë emrin tënd.");
  }

  return issues;
}

const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.string().email("Shkruaj një email të vlefshëm."));

const requiredPasswordSchema = z
  .string()
  .min(1, "Shkruaj fjalëkalimin.");

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredPasswordSchema,
  next: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordUpdateSchema = z
  .object({
    password: requiredPasswordSchema,
    confirmPassword: requiredPasswordSchema,
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Fjalëkalimet nuk përputhen.",
        path: ["confirmPassword"],
      });
    }

    const issues = getPasswordPolicyIssues(input.password);
    if (issues.length > 0) {
      context.addIssue({
        code: "custom",
        message: issues[0],
        path: ["password"],
      });
    }
  });

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .transform(sanitizeDisplayName)
      .pipe(z.string().min(2, "Shkruaj emrin e plotë.").max(120)),
    email: emailSchema,
    password: requiredPasswordSchema,
    confirmPassword: requiredPasswordSchema,
    next: z.string().optional(),
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Fjalëkalimet nuk përputhen.",
        path: ["confirmPassword"],
      });
    }

    const issues = getPasswordPolicyIssues(input.password, {
      email: input.email,
      fullName: input.fullName,
    });

    if (issues.length > 0) {
      context.addIssue({
        code: "custom",
        message: issues[0],
        path: ["password"],
      });
    }
  });

export function getZodErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Kontrollo fushat dhe provo përsëri.";
  }

  return "Kontrollo fushat dhe provo përsëri.";
}

export const authMessages = {
  accountCreatedSq:
    "Llogaria u krijua. Konfirmo emailin që të dërgon Supabase, pastaj hyr. Pas kësaj, një admin do të miratojë aksesin në CRM.",
  accountCreatedEn:
    "Account created. Confirm the email Supabase sends you, then sign in. An admin will approve CRM access after that.",
  genericLoginSq: "Email ose fjalëkalim i pasaktë.",
  genericLoginEn: "Email or password is incorrect.",
  pendingSq: "Llogaria nuk është gati për qasje. Kontakto administratorin.",
  pendingEn: "This account is not ready for access. Contact an administrator.",
  resetSentSq:
    "Nëse ekziston një llogari me këtë email, do të dërgohet një email me udhëzime.",
  resetSentEn:
    "If an account exists for that email, a reset email will be sent with instructions.",
  passwordUpdatedSq: "Fjalëkalimi u përditësua. Hyr me fjalëkalimin e ri.",
  passwordUpdatedEn: "Password updated. Sign in with your new password.",
  rateLimitSq: "Shumë tentativa. Prit pak dhe provo përsëri.",
  rateLimitEn: "Too many attempts. Wait a moment and try again.",
  sessionExpiredSq: "Sesioni ka skaduar. Hyr përsëri për të vazhduar.",
  sessionExpiredEn: "Your session expired. Sign in again to continue.",
  invalidLinkSq: "Linku është i pavlefshëm ose ka skaduar.",
  invalidLinkEn: "The link is invalid or has expired.",
};

export function localizedAuthMessage(
  locale: "sq" | "en",
  sq: string,
  en: string,
) {
  return locale === "sq" ? sq : en;
}
