# PRONA X Auth QA Checklist

This checklist is the sign-off path for PRONA X signup, sign-in, password recovery, approval, roles, session handling, and localization.

## Status Legend

| Status | Meaning |
| --- | --- |
| `PASS` | Verified successfully in the stated environment. |
| `FAIL` | Verified and broken. Add notes before release. |
| `BLOCKED` | Cannot be verified until setup, data, provider config, or access is available. |
| `NOT RUN` | Valid scenario, not tested yet. |
| `MANUAL` | Requires a controlled user, email inbox, admin action, OAuth consent, or role change. |

## Latest Production Smoke

Date: 2026-05-12  
Environment: `https://prona-x.vercel.app`  
Test focus: auth entry page, provider cleanup, language toggle, basic unauthenticated routing.

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-SMOKE-001 | Open `/login` in production | Page loads successfully | `PASS` | HTTP `200`. |
| AUTH-SMOKE-002 | Open `/sales` without confirmed auth | User is redirected/guarded | `PASS` | HTTP `307`. |
| AUTH-SMOKE-003 | Albanian signup screen loads | Albanian labels and copy are visible | `PASS` | `Krijo llogarine PRONA X`, `Hyr`, `Regjistrohu`. |
| AUTH-SMOKE-004 | Google provider appears | Google button is visible | `PASS` | `Vazhdo me Google`. |
| AUTH-SMOKE-005 | Apple provider appears | Apple button is visible | `PASS` | `Vazhdo me Apple`. |
| AUTH-SMOKE-006 | Binance provider is removed | No Binance option is visible | `PASS` | Removed from UI and translation keys. |
| AUTH-SMOKE-007 | Wallet provider is removed | No Wallet option is visible | `PASS` | Removed from UI and translation keys. |
| AUTH-SMOKE-008 | Switch to English | Auth copy switches to English | `PASS` | `Create your PRONA X account`, `Continue with Google`, `Continue with Apple`. |
| AUTH-SMOKE-009 | Login mode opens | Login heading, email, password, and reset link are visible | `PASS` | Verified in production UI. |
| AUTH-SMOKE-010 | Password recovery mode opens | Recovery heading and reset action are visible | `PASS` | Verified in production UI. |

## Test Accounts Needed

Create these accounts only in a planned QA window so we can test email delivery, approvals, and role gating without disturbing real agents.

| Account | Purpose | Required State |
| --- | --- | --- |
| `qa.pending@...` | Pending approval flow | Email confirmed, role `pending`. |
| `qa.viewer@...` | External/investor read-only role | Role `viewer`. |
| `qa.agent@...` | Normal CRM agent role | Role `agent`. |
| `qa.manager@...` | Manager approval/team workflow | Role `manager`. |
| `qa.support@...` | Support module access | Role `support`. |
| `qa.admin@...` | Admin users and role changes | Role `admin`. |

## Signup Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-SIGNUP-001 | New user signs up with email and password | Account is created and user is told to confirm email | `MANUAL` | Requires inbox access. |
| AUTH-SIGNUP-002 | New user signs up with Google | OAuth completes and user lands in approval flow | `MANUAL` | Requires controlled Google test account. |
| AUTH-SIGNUP-003 | New user signs up with Apple | OAuth completes and user lands in approval flow | `MANUAL` | Requires controlled Apple test account/provider setup. |
| AUTH-SIGNUP-004 | User signs up with an existing email | App shows a safe, understandable message | `NOT RUN` | Do not expose whether account exists more than necessary. |
| AUTH-SIGNUP-005 | User submits invalid email format | Browser/app prevents submission | `NOT RUN` | Email field should validate before request. |
| AUTH-SIGNUP-006 | User leaves full name empty | Form prevents submission | `NOT RUN` | Required field. |
| AUTH-SIGNUP-007 | User leaves password empty | Form prevents submission | `NOT RUN` | Required field. |
| AUTH-SIGNUP-008 | User uses a weak password | Supabase/app rejects with useful message | `NOT RUN` | Depends on Supabase password policy. |
| AUTH-SIGNUP-009 | User double-clicks create account | No duplicate account or duplicate email storm | `NOT RUN` | Button should avoid double submission if possible. |
| AUTH-SIGNUP-010 | User refreshes during signup | No broken session state | `NOT RUN` | Should return to auth or pending state cleanly. |
| AUTH-SIGNUP-011 | User clicks valid confirmation link | Email is confirmed and user can continue | `MANUAL` | Requires fresh email link. |
| AUTH-SIGNUP-012 | User clicks expired confirmation link | App shows localized expired/invalid link message | `MANUAL` | Requires expired link. |
| AUTH-SIGNUP-013 | User clicks already-used confirmation link | App handles safely and explains next step | `MANUAL` | Requires reused link. |
| AUTH-SIGNUP-014 | User confirms email on mobile browser | Confirmation succeeds or gives a clear recovery path | `MANUAL` | Important for field agents. |
| AUTH-SIGNUP-015 | User confirms email on a different device | Confirmation succeeds without PKCE errors | `MANUAL` | Depends on email template using token hash confirm route. |
| AUTH-SIGNUP-016 | User signs up in Albanian | All success/error notices stay Albanian | `MANUAL` | Verify `SQ` cookie is respected. |
| AUTH-SIGNUP-017 | User signs up in English | All success/error notices stay English | `MANUAL` | Verify `EN` cookie is respected. |
| AUTH-SIGNUP-018 | Network fails during signup | User sees a friendly retry message | `NOT RUN` | Simulate offline/throttled network. |
| AUTH-SIGNUP-019 | Supabase auth provider fails | User sees a friendly retry message | `NOT RUN` | Requires controlled failure or mocked environment. |
| AUTH-SIGNUP-020 | User opts into product updates | Preference is stored or ignored safely if unsupported | `NOT RUN` | Confirm intended storage behavior. |

## Sign-In Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-SIGNIN-001 | Approved user signs in with email/password | User enters CRM | `MANUAL` | Use approved QA user. |
| AUTH-SIGNIN-002 | Approved user signs in with Google | User enters CRM | `MANUAL` | Use approved Google QA user. |
| AUTH-SIGNIN-003 | Approved user signs in with Apple | User enters CRM | `MANUAL` | Use approved Apple QA user. |
| AUTH-SIGNIN-004 | User enters wrong password | App shows safe invalid credentials message | `NOT RUN` | Message should be localized. |
| AUTH-SIGNIN-005 | User enters unknown email | App shows safe invalid credentials message | `NOT RUN` | Avoid account enumeration. |
| AUTH-SIGNIN-006 | User submits empty login form | Browser/app prevents submission | `NOT RUN` | Required email/password. |
| AUTH-SIGNIN-007 | Account exists but email is unconfirmed | App explains confirmation is required | `MANUAL` | Requires unconfirmed test account. |
| AUTH-SIGNIN-008 | Account is confirmed but role is pending | User lands on pending approval page | `MANUAL` | Use `qa.pending`. |
| AUTH-SIGNIN-009 | User is already authenticated and opens `/login` | User is redirected or offered correct path | `NOT RUN` | Expected behavior should be product-decided. |
| AUTH-SIGNIN-010 | User signs out | Session ends and protected routes are blocked | `MANUAL` | Use approved QA user. |
| AUTH-SIGNIN-011 | User opens protected route without session | User is redirected/guarded | `PASS` | `/sales` returned HTTP `307`. |
| AUTH-SIGNIN-012 | User signs in on mobile | Layout remains usable and redirect works | `MANUAL` | Test Safari/Chrome mobile. |
| AUTH-SIGNIN-013 | Stale auth cookies exist | App clears or recovers session safely | `NOT RUN` | Regression area from previous stale-token issue. |

## Password Recovery Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-RECOVERY-001 | User opens recovery mode | Reset form is visible | `PASS` | Verified in production UI. |
| AUTH-RECOVERY-002 | User requests password reset | Reset email is sent | `MANUAL` | Requires inbox access. |
| AUTH-RECOVERY-003 | User opens valid reset link | Reset password page opens | `MANUAL` | Requires fresh reset link. |
| AUTH-RECOVERY-004 | User opens expired reset link | Localized error and recovery path are shown | `MANUAL` | Requires expired link. |
| AUTH-RECOVERY-005 | User updates password successfully | User can sign in with new password | `MANUAL` | Use QA account. |
| AUTH-RECOVERY-006 | Password reset link opened on mobile | Flow completes without PKCE storage error | `MANUAL` | Critical mobile scenario. |

## Approval And Role Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-ROLE-001 | New confirmed user has pending role | User cannot enter CRM workspace | `MANUAL` | Use `qa.pending`. |
| AUTH-ROLE-002 | Admin opens admin users page | Pending users are visible | `MANUAL` | Use `qa.admin`. |
| AUTH-ROLE-003 | Admin promotes user to viewer | User receives viewer-level access | `MANUAL` | External investor scenario. |
| AUTH-ROLE-004 | Admin promotes user to agent | User can access agent CRM tools | `MANUAL` | Agent onboarding scenario. |
| AUTH-ROLE-005 | Admin promotes user to manager | User can access manager workflows | `MANUAL` | Manager scenario. |
| AUTH-ROLE-006 | Admin promotes user to support | User can access support workflows | `MANUAL` | Support scenario. |
| AUTH-ROLE-007 | Admin promotes user to admin | User can access admin users page | `MANUAL` | Use carefully. |
| AUTH-ROLE-008 | Viewer tries to edit property | Action is blocked | `MANUAL` | Investor read-only scenario. |
| AUTH-ROLE-009 | Agent tries to approve users | Action is blocked | `MANUAL` | Prevent role conflict. |
| AUTH-ROLE-010 | Demoted user refreshes app | Access updates safely | `MANUAL` | Confirm session/role refresh behavior. |
| AUTH-ROLE-011 | Removed/deleted user has old session | Protected routes are blocked on next request | `MANUAL` | Requires controlled user. |

## Localization And Provider Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-LOCAL-001 | Albanian toggle active | Signup screen is Albanian | `PASS` | Verified in production UI. |
| AUTH-LOCAL-002 | English toggle active | Signup screen is English | `PASS` | Verified in production UI. |
| AUTH-LOCAL-003 | Albanian toggle active after auth error | Error/success notices are Albanian | `MANUAL` | Requires generated auth notice. |
| AUTH-LOCAL-004 | English toggle active after auth error | Error/success notices are English | `MANUAL` | Requires generated auth notice. |
| AUTH-LOCAL-005 | Unsupported provider cleanup | Binance and Wallet are absent | `PASS` | Verified in production UI. |
| AUTH-LOCAL-006 | OAuth providers available | Google and Apple are visible | `PASS` | Verified in production UI. |

## Security And Abuse Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-SEC-001 | Repeated failed logins | Rate limiting or safe error behavior applies | `NOT RUN` | Check Supabase auth limits. |
| AUTH-SEC-002 | Error messages do not reveal account existence | Generic safe messaging | `NOT RUN` | Validate email/password failure copy. |
| AUTH-SEC-003 | Service role key is not exposed client-side | No secret keys in browser bundle | `NOT RUN` | Audit build output/environment. |
| AUTH-SEC-004 | Redirect URLs are allowlisted | Auth redirects only to approved URLs | `MANUAL` | Confirm in Supabase URL Configuration. |
| AUTH-SEC-005 | CSRF/session cookies behave in OAuth flow | Callback produces a valid session | `MANUAL` | Use Google/Apple QA accounts. |
| AUTH-SEC-006 | Pending users cannot access direct URLs | Protected pages redirect/deny access | `MANUAL` | Test `/sales`, `/messages`, `/admin/users`, `/support`. |

## Mobile Scenarios

| ID | Scenario | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- |
| AUTH-MOBILE-001 | Open auth page on mobile Safari | Layout fits without horizontal overflow | `MANUAL` | Use iPhone Safari. |
| AUTH-MOBILE-002 | Open auth page on mobile Chrome | Layout fits without horizontal overflow | `MANUAL` | Use Android Chrome. |
| AUTH-MOBILE-003 | Toggle language on mobile | Toggle remains touch-friendly and copy updates | `MANUAL` | Test both directions. |
| AUTH-MOBILE-004 | Sign up with Google on mobile | User completes OAuth and returns to app | `MANUAL` | Critical for field agents. |
| AUTH-MOBILE-005 | Confirm email from mobile mail app | Confirmation lands in PRONA X correctly | `MANUAL` | Critical PKCE/token-hash scenario. |
| AUTH-MOBILE-006 | Request password reset from mobile | Reset email and route work correctly | `MANUAL` | Test on real device. |

## Release Sign-Off Rule

Auth can be signed off when:

1. All `PASS` smoke checks remain passing.
2. All `FAIL` items are fixed or explicitly accepted.
3. At least one controlled QA account has passed the email/password flow.
4. At least one controlled QA account has passed Google OAuth.
5. Pending approval, admin approval, and approved login are verified end-to-end.
6. Albanian and English notices are verified for success and error messages.
7. Mobile Safari and mobile Chrome pass the main signup and sign-in paths.
