type RateLimitPurpose =
  | "login"
  | "oauth"
  | "password-reset"
  | "password-update"
  | "signup";

type RateLimitEntry = {
  blockedUntil: number;
  count: number;
  firstAttemptAt: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS: Record<RateLimitPurpose, number> = {
  login: 8,
  oauth: 12,
  "password-reset": 5,
  "password-update": 6,
  signup: 5,
};

const attempts = new Map<string, RateLimitEntry>();

function getRateLimitKey(purpose: RateLimitPurpose, identifier: string) {
  return `${purpose}:${identifier}`;
}

export function checkAuthRateLimit(
  purpose: RateLimitPurpose,
  identifier: string,
) {
  const now = Date.now();
  const key = getRateLimitKey(purpose, identifier);
  const current = attempts.get(key);

  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, {
      blockedUntil: 0,
      count: 1,
      firstAttemptAt: now,
    });
    return { allowed: true };
  }

  if (current.blockedUntil > now) {
    return { allowed: false };
  }

  current.count += 1;
  if (current.count > MAX_ATTEMPTS[purpose]) {
    current.blockedUntil = now + BLOCK_MS;
    attempts.set(key, current);
    return { allowed: false };
  }

  attempts.set(key, current);
  return { allowed: true };
}

export function clearAuthRateLimit(purpose: RateLimitPurpose, identifier: string) {
  attempts.delete(getRateLimitKey(purpose, identifier));
}
