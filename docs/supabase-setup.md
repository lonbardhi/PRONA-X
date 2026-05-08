# Supabase Setup Guide

## 1. Create the project

1. Go to the Supabase dashboard.
2. Create a new project.
3. Choose a project name such as `prona-x`.
4. Save the database password somewhere secure.
5. Wait for the project to finish provisioning.

## 2. Add local environment variables

Open `.env.local` and replace the placeholders:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Use the project URL from the Supabase project settings. For the key, use the
publishable key (`sb_publishable_...`) if your dashboard shows the new key
system, or the legacy `anon` key if your project only shows legacy keys.

Restart the dev server after changing `.env.local`.

## 3. Run the database migration

Open the Supabase SQL editor and run the full contents of these files in order:

```text
supabase/migrations/0001a_tables_storage.sql
supabase/migrations/0001b_policies_functions_indexes.sql
supabase/migrations/0002_property_media_file_types.sql
```

This creates:

- `profiles`
- `properties`
- `property_media`
- role and property status enums
- property media storage bucket for photos, videos, and PDFs
- Row Level Security policies
- auth trigger to create a profile for each new user

## 4. Create the first user

Open the local app:

```text
http://localhost:3000
```

Use the sign-up form to create your first user.

By default, Supabase requires email confirmation. If `Confirm email` is enabled
in Authentication > Providers > Email, open the confirmation link before trying
to sign in. For faster local testing, you can disable email confirmation in the
Supabase dashboard.

## OAuth sign-in

PRONA X supports app-side Google and Apple OAuth sign-in. To enable these
buttons end to end:

1. Open Supabase > Authentication > Providers.
2. Enable Google and/or Apple.
3. Add the provider client id and secret from Google Cloud or Apple Developer.
4. Add this callback URL in Supabase and in the provider console:

```text
http://localhost:3000/auth/callback
```

For production, also add the deployed URL:

```text
https://your-domain.com/auth/callback
```

## 5. Promote the first user

In Supabase, open Table Editor > `profiles`, find the user you just created, and
copy their `id`.

Then run this in the SQL editor, replacing the id:

```sql
update public.profiles
set role = 'admin'
where id = '00000000-0000-0000-0000-000000000000';
```

You can also use `manager` or `agent` instead of `admin`.

## 6. Test the first workflow

1. Sign out and sign back in.
2. Create a property.
3. Upload one or more photos, videos, or PDF files.
4. Edit the listing.
5. Delete the listing.

If property creation fails with a Row Level Security message, confirm that the
profile role is `admin`, `manager`, or `agent`.
