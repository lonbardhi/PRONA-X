# PRONA X Platform

![PRONA X logo](public/brand/prona-x-logo.png)

PRONA X is a cloud CRM for modern real estate teams operating in Albania and the
Albanian Riviera market. It is built to help agencies manage listings, clients,
meetings, media, support requests, internal coordination, and role-aware team
workflows from one secure workspace.

Live production app:

[https://prona-x.vercel.app](https://prona-x.vercel.app)

## Product Vision

Real estate teams often run daily operations across WhatsApp, phone calls,
spreadsheets, shared folders, email threads, and scattered notes. PRONA X brings
that work into a single CRM designed around the actual business context of a
property agency:

- properties for sale, rent, and development land
- buyer and seller interest
- viewings, calls, follow-ups, and appointments
- media uploads, floorplans, documents, and listing assets
- internal team messages tied to CRM records
- admin approval, user roles, and secure access controls
- agent productivity, notifications, support, and daily workspace tools

The product is not a generic marketplace and not a generic chat app. It is an
operating system for a real estate agency.

## Product Owner Showcase

PRONA X demonstrates a complete product direction for a premium real estate CRM:

- **Market focus**: Albanian property sales, rentals, and development land.
- **Business workflow focus**: listings, appointments, owner/client handling,
  internal coordination, and media operations.
- **Secure team model**: users are approved before workspace access and actions
  are controlled by role.
- **Mobile-first field usage**: agents can use the platform while visiting
  properties, meeting clients, or coordinating quickly from a phone.
- **Multilingual foundation**: Albanian and English UI support.
- **Future-ready CRM data**: messages, activities, notifications, media, and
  entity relationships are structured for reporting and future AI summaries.

As a product owner, this platform shows the ability to move from a real business
problem to an implemented, deployable CRM product with security, database design,
and day-to-day usability considered from the start.

## Core Modules

### Authentication and User Approval

PRONA X uses Supabase Auth with server-side session handling in Next.js.

Implemented capabilities:

- email/password authentication
- OAuth entry points for supported providers
- sign-in, sign-up, sign-out, password reset, and auth callback flows
- session expiry handling
- pending approval screen
- admin user management
- role-based navigation and permissions

New users start with restricted access and must be approved into a role before
using the internal CRM workspace.

### Roles and Permissions

The platform supports these roles:

- `admin`
- `manager`
- `agent`
- `support`
- `viewer`
- `pending`

Role behavior is enforced in both the application and Supabase Row Level
Security policies. The frontend is not the security boundary.

### Property CRM

The property module is the core operating surface for listings.

Implemented capabilities:

- create and edit properties
- sales, rentals, and development land workflows
- role-aware property visibility
- assigned agent and creator ownership
- property filters and listing grids
- property detail pages
- property media previews and media viewer
- WhatsApp-ready public sharing patterns
- development land visibility support
- document and media status fields

### Property Media and Storage

Property assets are linked to real property records through Supabase Storage.

Implemented capabilities:

- image and file upload support
- property media records in Postgres
- media preview components
- private storage security policies
- property media viewer for richer inspection

### Appointments and Calendar

Appointments help teams manage real client activity.

Implemented capabilities:

- appointment creation
- appointment list and agenda views
- appointment status updates
- appointment type labels
- property-linked meetings
- assigned agent handling
- daily agenda preview in the profile workspace
- meeting discussion entry points through internal messaging

### Internal Messaging and Collaboration

PRONA X includes a lightweight contextual messaging system built on Supabase.
It is designed for real estate CRM collaboration rather than social chat.

Implemented conversation types include:

- direct conversations
- group conversations
- property discussion threads
- meeting discussion threads
- deal room structure
- team channel structure
- media request structure

Implemented messaging capabilities:

- `/messages` communication center
- conversation list with filters
- unread counts
- message composer
- message history
- message read state
- mentions
- message notifications
- soft-delete behavior
- attachments through Supabase Storage
- realtime refresh for active conversations
- property discussion panel
- meeting "Discuss" action
- role-aware RLS policies

Example use cases:

- an agent asks a manager about negotiation room on a villa
- a manager mentions an agent to follow up with a buyer
- media staff receive a property photo or floorplan request
- a meeting thread stores arrival notes, parking details, or client feedback
- deal-related internal discussion remains tied to the business record

### Agent Workspace

The profile workspace gives agents and managers a compact personal dashboard.

Implemented capabilities:

- profile drawer
- availability status
- short status message
- today's agenda
- quick actions
- productivity snapshot
- recent notifications
- workspace links
- recent activity

### Notifications

Notifications are used across CRM workflows.

Implemented capabilities:

- unread notification counts
- notification preview in profile workspace
- message and mention notifications
- meeting reminder notification types
- property update notification types
- links back to related CRM contexts

### Support Module

PRONA X includes internal support ticket handling for operational issues.

Implemented capabilities:

- support ticket list
- support ticket detail page
- support messages
- internal support workflow tables
- support role permissions
- support report modal

### Internationalization

The UI supports Albanian and English.

Implemented capabilities:

- locale cookie
- language toggle
- Albanian and English navigation labels
- localized role labels
- localized auth copy
- localized appointment labels
- localized support and messaging labels

## Internal Messaging Use Cases

The messaging feature is one of the most important CRM-specific differentiators.

### Property Operations

- discuss price changes
- document missing owner approvals
- request new media
- track viewing feedback
- keep negotiation history attached to a listing

### Lead and Buyer Collaboration

- document buyer budget and location preferences
- coordinate follow-up ownership
- mention agents or managers for action
- keep buyer intent visible to the team

### Meeting Logistics

- discuss arrival delays
- note parking, keys, documents, or owner availability
- capture post-viewing feedback
- coordinate agent handoff

### Manager Oversight

- managers can monitor context-rich property or meeting threads
- instructions stay linked to CRM records
- decisions are easier to audit than WhatsApp messages

### Media Requests

- request updated photos
- request drone video
- request floorplans
- mark missing listing assets
- coordinate publishing readiness

### Deal Rooms

- prepare private deal discussions
- include manager, admin, legal, or finance roles
- keep sensitive negotiations separate from normal listing chatter

## Technical Architecture

PRONA X is built with:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Realtime
- Supabase Storage
- Vercel deployment

Important implementation choices:

- server-side Supabase session handling with `@supabase/ssr`
- no service role key in frontend code
- RLS-backed authorization
- route-level auth guards
- role-aware navigation
- database migrations stored in `supabase/migrations`
- internal messaging implemented directly on Supabase, not a heavy chat provider

## Main App Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing and auth entry surface |
| `/login` | Sign-in and sign-up |
| `/dashboard` | CRM dashboard |
| `/sales` | Sales listings and property intake |
| `/rentals` | Rental listings |
| `/properties` | Property records |
| `/properties/[id]` | Public or shared property view |
| `/properties/[id]/edit` | Internal property editing |
| `/appointments` | Calendar and meeting workflow |
| `/messages` | Internal messaging center |
| `/seller-leads` | Seller lead surface |
| `/support` | Support ticket list |
| `/support/[ticketId]` | Support ticket detail |
| `/profile` | Profile, preferences, activity, and notifications |
| `/admin/users` | Admin user approval and role management |

## Database and Security

The Supabase schema includes foundations for:

- profiles and roles
- properties
- property media
- appointments
- support tickets
- user status and preferences
- notifications
- activity logs
- conversations
- conversation participants
- messages
- message mentions
- message attachments

Security practices:

- Row Level Security enabled on exposed CRM tables
- role-aware policies for property access
- role-aware policies for appointments and support
- conversation participant policies for messaging
- private storage buckets where appropriate
- sender identity derived from authenticated user
- message access restricted by participation, role, or related entity access
- soft-delete for messages instead of hard delete by default

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Run the SQL migrations in `supabase/migrations/` in order.

Current migration sequence:

```text
0001_initial_schema.sql
0001a_tables_storage.sql
0001b_policies_functions_indexes.sql
0002_property_media_file_types.sql
0003_appointments.sql
0004_development_land.sql
0005_profile_approval.sql
0006a_add_pending_role.sql
0006b_pending_role_access.sql
0007_repair_auth_signup_profiles.sql
0008a_add_support_role.sql
0008b_support_module.sql
0009_agent_workspace.sql
0010_internal_messaging.sql
0011_fix_conversation_select_policy.sql
```

5. Reload the PostgREST schema cache after migrations:

```sql
notify pgrst, 'reload schema';
```

6. Create the first account in the app.
7. Promote the first operator manually in `public.profiles` to `admin`.
8. Use the Admin Users screen to approve future users.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

[http://localhost:3000](http://localhost:3000)

Useful commands:

```bash
npm run lint
npm run build
```

## Production Deployment

The app is deployed on Vercel:

[https://prona-x.vercel.app](https://prona-x.vercel.app)

Production checklist:

1. Apply Supabase migrations to the production Supabase project.
2. Reload PostgREST schema cache.
3. Configure Vercel environment variables.
4. Push to `main`.
5. Confirm the Vercel deployment is `READY`.
6. Login as an approved admin or agent.
7. Test property access, appointments, messaging, support, and admin users.

Required Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Manual QA Checklist

### Authentication

- sign up with a new account
- verify new users are restricted until approved
- approve user as admin, manager, agent, support, or viewer
- sign out and sign back in

### Properties

- create a property
- upload media
- edit listing details
- view the public property page
- confirm role-aware access

### Appointments

- create a meeting
- update meeting status
- confirm today's agenda appears in the profile workspace
- use the meeting discussion action

### Messaging

- open `/messages`
- create a direct conversation
- send a message
- mention another user
- confirm unread counts
- open a property discussion
- open a meeting discussion
- test soft-delete behavior

### Support

- create a support ticket
- open ticket details
- add ticket messages
- confirm support role access

### Mobile

- open the app on a narrow viewport
- verify nav scrolls correctly
- open the profile workspace drawer
- test quick actions
- test messaging and appointment screens

## Product Roadmap

Short-term priorities:

- create task from message
- richer participant management for conversations
- default team channels such as Sales, Rentals, Media, and Management
- lead/client database model
- deal room UI
- document checklist per property or deal
- stronger attachment moderation and file previews
- message search improvements
- production monitoring and error tracking

Medium-term priorities:

- WhatsApp bridge or outbound share tracking
- AI summaries for property and deal conversations
- lead intent scoring
- owner portal or private owner links
- finance and commission tracking
- legal contract workflow
- advanced reporting for managers

Long-term vision:

- PRONA X becomes the central operating layer for agencies handling property
  inventory, buyer demand, media production, viewings, negotiations, documents,
  team coordination, and client communication in one place.

## Repository Notes

This repository intentionally avoids unnecessary infrastructure for the current
product stage:

- no Redis
- no BullMQ
- no external chat provider
- no exposed service role key
- no broad frontend-only permission model

The product favors a pragmatic stack: Next.js, Supabase, and Vercel, with strong
Postgres/RLS foundations that can scale into deeper CRM workflows over time.
