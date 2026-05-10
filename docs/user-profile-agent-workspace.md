# PRONA X User Profile / Agent Workspace

## Overview

The profile area is an agent command center opened from the CRM avatar button. It helps users see their day, update availability, review notifications, open common CRM workflows, and manage preferences/security details.

## UX Behavior

- Desktop: clicking the avatar opens a right-side workspace panel.
- Mobile: the same interaction opens a full-screen sheet with touch-friendly controls.
- Escape closes the panel, and clicking outside closes it on desktop.
- The panel shows identity, role, agency, availability, today agenda, notifications, productivity metrics, workspace links, recent activity, and logout.
- `/profile` is the full profile page for personal details, preferences, status, activity, performance, and security.

## Database Tables

Run `supabase/migrations/0009_agent_workspace.sql` after the earlier migrations.

The migration extends `profiles` with:

- `avatar_url`
- `agency_name`

It creates:

- `user_status`
- `user_preferences`
- `notifications`
- `activity_logs`
- `agent_metrics`

## RLS Summary

- Users can read/update their own status and preferences.
- Users can read and mark their own notifications.
- Users can read their own activity logs and metrics.
- Admins/managers can read team status, notifications, activity logs, and metrics where future team views need them.
- Inserts are constrained to the authenticated user unless the current role is admin/manager.

## Components

- `ProfileWorkspacePanel`
- `ProfileAvatarButton`
- `AvailabilityStatusSelector`
- `TodayAgendaPreview`
- `UserNotificationsPreview`
- `QuickActionsGrid`
- `PreferencesForm`
- `ActivityFeed`

## Server Actions

- `updateAvailabilityStatusAction`
- `updateUserPreferencesAction`
- `updateProfileDetailsAction`
- `markNotificationReadAction`
- `markAllNotificationsReadAction`

## Manual QA

1. Sign in as an approved agent/admin.
2. Click the avatar in the top navigation.
3. Confirm the profile workspace opens and closes with Escape/outside click.
4. Change availability status and confirm it persists after refresh.
5. Open `/profile` and update name, phone, agency, and preferences.
6. Confirm today appointments appear in the profile panel.
7. Confirm unread notifications render when records exist in `notifications`.
8. Confirm logout signs the user out.
9. Test the profile panel on mobile viewport.

## Troubleshooting

If `/profile` shows a message like `Could not find the table 'public.user_status' in the schema cache`, the code has deployed before the profile workspace migration was applied. Run:

```text
supabase/migrations/0009_agent_workspace.sql
```

Then refresh the app after Supabase finishes updating the schema cache.

## Future Improvements

- AI daily assistant
- Smart lead routing based on availability
- WhatsApp reminders
- Commission dashboard
- Gamified agent performance
- Manager team overview
- Calendar sync
- Mobile push notifications
