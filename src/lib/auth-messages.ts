export type AuthMessageParams = {
  error?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  message?: string | null;
};

function cleanAuthValue(value?: string | null) {
  return value?.replace(/\+/g, " ").trim() || "";
}

export function getAuthDisplayMessage(params: AuthMessageParams) {
  const errorDescription = cleanAuthValue(params.error_description);

  if (errorDescription.includes("Database error saving new user")) {
    return "Signup could not finish because Supabase could not create the workspace profile. Run the latest Supabase signup repair migration, then try Google signup again.";
  }

  if (errorDescription) {
    return errorDescription;
  }

  const message = cleanAuthValue(params.message);
  if (message) {
    return message;
  }

  const error = cleanAuthValue(params.error);
  if (error) {
    return `Authentication failed: ${error}`;
  }

  return undefined;
}
