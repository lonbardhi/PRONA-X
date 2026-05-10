# Supabase Email Auth Templates

PRONA X uses server-side Supabase auth. Email confirmation and password reset
links must use `token_hash` so users can open the email from Gmail, Safari, or
another mobile browser without losing the PKCE verifier.

In Supabase Dashboard, open:

`Authentication` -> `Email Templates`

## Confirm Signup

Use this for the confirmation link:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">
  Confirm your PRONA X account
</a>
```

The app sends `{{ .RedirectTo }}` as:

```text
https://prona-x.vercel.app/auth/confirm?next=/sales
```

## Reset Password

Use this for the recovery link:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">
  Reset your PRONA X password
</a>
```

The app sends `{{ .RedirectTo }}` as:

```text
https://prona-x.vercel.app/auth/confirm?next=/auth/reset-password
```

## Required Redirect URLs

In `Authentication` -> `URL Configuration`, keep these in the redirect allow list:

```text
https://prona-x.vercel.app/auth/callback
https://prona-x.vercel.app/auth/confirm
https://prona-x.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/**
```

