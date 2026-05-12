# Seller Leads Module

## Overview

`/seller-leads` is the Seller Acquisition workspace for PRONA X. It is intentionally separate from `Shto Prone` because seller leads are potential owner opportunities that still need qualification before they become active property inventory.

Use this page for:

- owners who may sell but are not ready yet
- valuation requests
- off-market opportunities
- external or expired listings
- properties missing documents, photos, pricing, or manager review

The main action is `Shto Lead`, not `Shto Prone`.

## Workflow

Recommended flow:

1. Lead-i i pronarit u regjistrua
2. Pronari u kontaktua dhe u kualifikua
3. Detajet, cmimi dhe dokumentet u mblodhen
4. Menaxheri e rishikoi mundesine
5. Lead-i u konvertua ne listim aktiv

Lead statuses:

- `new`
- `contacted`
- `qualified`
- `listing_preparation`
- `manager_review`
- `converted`
- `nurture`
- `lost`

## Data Model

The Supabase migration is:

`supabase/migrations/0014_seller_leads.sql`

It creates `public.seller_leads` with:

- seller identity and contact fields
- property summary fields
- source and timeline tracking
- assignment fields
- follow-up dates
- quality score and temperature
- conversion link to `public.properties`

Run the migration in Supabase SQL Editor before using this module in production.

## Lead Scoring

Scoring is implemented in `src/lib/seller-leads.ts`.

The score rewards usable owner and property information:

- phone, email, property type, location, price
- short selling timeline
- ownership confirmation
- collected documents and photos

Temperature:

- Hot: `>= 80`
- Warm: `>= 50`
- Cold: `< 50`

## Conversion

`Krijo Prone nga Lead` is available only when the lead is ready enough:

- status is `qualified`, `listing_preparation`, or `manager_review`
- seller has a name and phone
- property type and city are set
- normal sale properties have an expected price
- development land does not require a fixed price

Conversion creates a draft property and links it back to the seller lead. It does not publish automatically.

## RLS Summary

The migration enables RLS.

Access model:

- admins and managers can view and manage seller leads
- agents can create leads
- creators and assigned agents can update their own leads
- authenticated access is granted with RLS policies applied

## Manual QA

1. Open `/seller-leads` as an authenticated CRM user.
2. Confirm the empty state says `Shto Lead`, not `Shto Prone`.
3. Create a lead with seller name, phone, source, city, and property type.
4. Confirm metrics update.
5. Try creating a second lead with the same phone and confirm duplicate warning.
6. Mark a lead as contacted and qualified.
7. Add a follow-up date and confirm it appears.
8. Confirm WhatsApp and phone actions are available.
9. Convert a qualified lead to a draft property.
10. Confirm the draft property is linked and is not published automatically.
11. Check the page on mobile width.

## Future Improvements

- merge duplicate leads
- seller lead import from public valuation forms
- manager review approvals
- automatic calendar reminders
- lead source analytics
- buyer/renter lead modules as separate routes
