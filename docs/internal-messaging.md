# PRONA X Internal Messaging

This module adds CRM-contextual messaging for PRONA X. It is intentionally not a public/social chat app: conversations are tied to workspace users, properties, meetings, future lead/deal/client records, notifications, and activity logs.

## What Is Included

- `/messages` workspace with direct, group, property, meeting, deal room, team, media, and archived filters.
- Direct and group conversation creation between approved internal users.
- Property discussion panel on the internal property edit page.
- Meeting discussion action from appointment cards.
- Message composer with text, attachments, and explicit `@` mention selection.
- Unread counts in the Messages nav item and conversation list.
- Message notifications and mention notifications using the existing `notifications` table.
- Soft-delete for messages. Deleted messages remain in the database with `deleted_at`.
- Supabase Realtime client subscription for active conversation message changes.

## Database Migration

Run:

```sql
supabase/migrations/0010_internal_messaging.sql
```

The migration adds:

- `conversations`
- `conversation_participants`
- `messages`
- `message_mentions`
- `message_attachments`
- notification columns: `conversation_id`, `message_id`
- private Storage bucket: `message-attachments`
- RLS helper functions for conversation/entity access
- RLS policies for conversations, messages, mentions, attachments, notifications, and private attachment reads
- indexes for conversation listing, unread calculation, message history, mentions, attachments, and full-text message search

It reuses:

- `profiles`
- `notifications`
- `activity_logs`
- `properties`
- `appointments`
- Supabase Auth user IDs through profile IDs

## RLS Summary

- Users can read conversations where they are active participants.
- Admins/managers can read and manage conversations.
- Users can read entity threads if they are allowed to access the linked property or meeting.
- Users can send only when the conversation is not archived and they are an active writable participant, or when admin/manager access applies.
- Users cannot spoof `sender_id`; message inserts require `sender_id = auth.uid()`.
- Read-only participants cannot send.
- Users can update/delete only their own messages unless admin/manager.
- Attachments are private and readable only through message/conversation access.
- Message notifications can be inserted only for participants of the relevant conversation unless the actor is admin/manager.

## Main Files

- `src/app/messages/page.tsx`
- `src/app/messages/actions.ts`
- `src/lib/messaging.ts`
- `src/lib/messaging-data.ts`
- `src/hooks/useMessaging.ts`
- `src/components/messaging/*`
- `src/components/DashboardShell.tsx`
- `src/components/AppointmentAgenda.tsx`
- `src/app/properties/[id]/edit/page.tsx`

## Manual QA

1. Apply migration `0010_internal_messaging.sql`.
2. Log in as Agent A.
3. Open `/messages` and create a direct message to Agent B.
4. Log in as Agent B in another browser and confirm the unread badge appears.
5. Open the conversation as Agent B and confirm messages load and read state clears.
6. Open a property edit page and start the internal discussion.
7. Send a property discussion message and mention Agent B using the mention picker.
8. Confirm Agent B receives a mention notification linking to `/messages`.
9. Open `/appointments`, use Discuss on a meeting, and confirm the meeting thread opens in Messages.
10. Try to access a conversation as a user who is not a participant and does not have entity/admin/manager access.
11. Archive a conversation as admin/manager and confirm the composer becomes read-only.
12. Upload an allowed attachment and confirm it renders from a signed URL.
13. Check mobile widths for list/view usability.

## Manual Supabase Notes

- If the Data API is configured with explicit grants, ensure authenticated users have access to the new tables while RLS remains enabled.
- Realtime is added to the `supabase_realtime` publication when that publication exists. If Realtime is disabled in the project dashboard, normal fetch/send still works.
- The `message-attachments` bucket is private. Do not make it public.
- Do not expose service role keys in browser code. This implementation uses the existing anon client and RLS.

## Known Limitations

- Dedicated lead, deal, client, task, contract, legal, finance, and media role tables do not exist yet, so the conversation schema is ready for them but UI integration currently focuses on properties and meetings.
- Mentions notify users selected from the picker and only when the mentioned user is already a participant.
- Message search is local in the loaded conversation list; the database index is ready for deeper server-side search later.
- Attachments can leave orphaned Storage objects if an upload succeeds and the browser/server connection fails before metadata insert; the action attempts cleanup on known failures.
- Typing indicators, presence, edit UI, task creation from message, and AI summaries are future work.

## Recommended Next Improvements

- Add lead/deal/client tables, then mount `LeadDiscussionPanel` and deal rooms on those pages.
- Add participant management UI for admins/managers.
- Add server-side full-text search route or RPC for large histories.
- Add message edit UI with previous-version audit history.
- Add task creation once the task system exists.
- Add Realtime Broadcast authorization if message volume grows beyond simple Postgres Changes.
