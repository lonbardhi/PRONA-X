<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## PRONA X UI Standard

- Use shadcn/ui as the default interface system for new CRM UI. Prefer primitives from `src/components/ui` before creating custom buttons, cards, dialogs, sheets, tables, tabs, badges, inputs, selects, tooltips, avatars, skeletons, or alerts.
- The project is configured with shadcn CLI v4, Tailwind CSS 4, the `radix-nova` preset, neutral base color, Lucide icons, and the `@/components/ui` alias. Keep new components aligned with that setup.
- Before adding new shadcn components, run `pnpm exec shadcn add <component> --dry-run` and preserve existing customized primitives. Do not overwrite `button.tsx`, `input.tsx`, or `textarea.tsx` unless the task explicitly requires it.
- For operational CRM screens, keep layouts dense, calm, mobile-responsive, accessible, and localized through the existing Albanian/English language system.
