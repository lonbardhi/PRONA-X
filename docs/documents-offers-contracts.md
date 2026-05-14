# Documente, Oferta & Kontrata

## Overview

The `Dokumente & Kontrata` module adds a first-class CRM workspace for:

- private document storage and versioning,
- property/owner/deal/offer/contract document links,
- Excel-based land owner offers,
- contract records, parties, approval stages, signed PDF uploads, and lifecycle status,
- approval queues and operational counters,
- audit tables for important document, offer, and contract actions.

Documents, offers, and contracts are intentionally separate business objects:

- `Document` is the uploaded or generated file record.
- `Offer` is the commercial proposal/calculation record and can reference Excel/PDF documents.
- `Contract` is the legal/business agreement record and can reference draft/generated/signed documents.

## Supabase Setup

Run this migration in Supabase SQL Editor:

```sql
supabase/migrations/0017_documents_offers_contracts.sql
```

The migration adds:

- private storage bucket: `crm-documents`,
- app roles: `legal`, `finance`,
- document tables: `documents`, `document_versions`, `document_links`, `document_activity`,
- checklist tables: `document_checklist_templates`, `document_checklist_items`,
- offer tables: `offers`, `offer_parties`, `offer_versions`, `offer_activity`,
- contract tables: `contracts`, `contract_parties`, `contract_versions`, `contract_approvals`, `contract_payments`, `contract_activity`,
- RLS policies and grants for authenticated CRM users,
- checklist seeds for land, rent, buying, reservation, and mandate workflows.

Files are not public. The app creates short-lived signed URLs after checking the user session and relying on RLS.

## UI Behavior

Navigation adds `Dokumente & Kontrata`.

The module includes these tabs:

- `Të gjitha dokumentet`
- `Dokumente prone`
- `Dokumente pronari`
- `Oferta për pronarë`
- `Kontrata`
- `Në pritje për aprovim`
- `Në pritje për nënshkrim`
- `Arkiva`

Agents can upload documents, create offers, create contracts, upload versions, submit records for review, and upload signed PDFs. Managers/admins can approve/reject document and offer reviews, approve contracts, complete signed contracts, and archive/restore records.

Legal users can participate in contract review. Finance users can access financial/contract records and payment-related tables through the database policy model.

## Property Integration

The property edit page now includes a contextual `Dokumente & Kontrata` card with direct links to:

- documents linked to the property,
- offers linked to the property,
- contracts linked to the property.

## MVP Limitations

- External e-signature is not implemented. The MVP supports manual signed PDF upload and manual signature tracking.
- Full DOCX-to-PDF generation is not implemented yet. Offer/contract PDFs can be uploaded and linked; generation can be added behind the current contract/document version model.
- Owner/deal detail pages are only linked when those modules exist. Property detail integration is implemented now.
- The repo does not currently include a test runner, so validation is covered by TypeScript, lint, build, Zod schemas, server-side authorization, and database constraints/RLS.

## Future Improvements

- External signature provider integration.
- Admin-managed contract templates and generated PDFs.
- Dedicated owner/deal detail screens with embedded tabs.
- Expiring document/contract scheduled notifications.
- Advanced checklist automation when linked document statuses change.
- Fine-grained workspace/agency scoping once multi-tenant workspace IDs are fully enforced across all CRM tables.
