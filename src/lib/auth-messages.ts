export type AuthMessageParams = {
  error?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  message?: string | null;
};

type AuthMessageLocale = "sq" | "en";

function cleanAuthValue(value?: string | null) {
  return value?.replace(/\+/g, " ").trim() || "";
}

function isSq(locale: AuthMessageLocale) {
  return locale === "sq";
}

function getKnownAuthMessage(message: string, locale: AuthMessageLocale) {
  if (!message) {
    return undefined;
  }

  if (
    message.includes("PKCE code verifier not found") ||
    message.includes("pkce_code_verifier_not_found") ||
    message.includes("code verifier") ||
    message.includes("auth flow was initiated in a different browser")
  ) {
    return isSq(locale)
      ? "Linku i konfirmimit u hap në një shfletues tjetër ose sesioni i regjistrimit skadoi. Kërko një email të ri konfirmimi dhe hape linkun më të fundit në të njëjtin shfletues."
      : "The confirmation link was opened in a different browser or the signup session expired. Request a new confirmation email and open the newest link in the same browser.";
  }

  if (
    message.includes("Email link is invalid or has expired") ||
    message.includes("Token has expired or is invalid") ||
    message.includes("otp_expired") ||
    message.includes("expired or is invalid")
  ) {
    return isSq(locale)
      ? "Ky link emaili ka skaduar ose është përdorur tashmë. Kërko një link të ri dhe përdor vetëm emailin më të fundit."
      : "This email link has expired or was already used. Request a new link and use only the newest email.";
  }

  if (message.includes("Database error saving new user")) {
    return isSq(locale)
      ? "Regjistrimi nuk përfundoi sepse Supabase nuk krijoi dot profilin e punës. Ekzekuto migrimin më të fundit të riparimit të regjistrimit dhe provo përsëri."
      : "Signup could not finish because Supabase could not create the workspace profile. Run the latest Supabase signup repair migration, then try signup again.";
  }

  return undefined;
}

export function getAuthDisplayMessage(
  params: AuthMessageParams,
  locale: AuthMessageLocale = "en",
) {
  const errorDescription = cleanAuthValue(params.error_description);
  const knownErrorDescription = getKnownAuthMessage(errorDescription, locale);

  if (knownErrorDescription) {
    return knownErrorDescription;
  } else if (errorDescription) {
    return errorDescription;
  }

  const errorCode = cleanAuthValue(params.error_code);
  const knownErrorCode = getKnownAuthMessage(errorCode, locale);
  if (knownErrorCode) {
    return knownErrorCode;
  }

  const message = cleanAuthValue(params.message);
  const knownMessage = getKnownAuthMessage(message, locale);
  if (knownMessage) {
    return knownMessage;
  } else if (message) {
    return message;
  }

  const error = cleanAuthValue(params.error);
  const knownError = getKnownAuthMessage(error, locale);
  if (knownError) {
    return knownError;
  } else if (error) {
    return isSq(locale) ? `Autentikimi dështoi: ${error}` : `Authentication failed: ${error}`;
  }

  return undefined;
}
