# PRONA X Platform

Cloud MVP foundation for PRONA X, built with Next.js, TypeScript, Tailwind CSS,
and Supabase. The first implemented slice covers:

- Supabase database schema for users, roles, properties, and property media
- Supabase Auth sign-in/sign-up/sign-out
- Row Level Security policies for role-aware property access
- Property create/read/update/delete screens
- Supabase Storage media uploads linked to property records

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Run the SQL files in `supabase/migrations/` in the Supabase SQL editor, or
   apply them through the Supabase CLI.
5. Create an account in the app. New users start as `viewer`; update the first
   operator manually in `public.profiles` to `admin`, `manager`, or `agent` so
   property writes pass RLS.

## Getting Started

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

Deploy the app to Vercel and add the same Supabase environment variables in the
Vercel project settings.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
