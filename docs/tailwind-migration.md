# Frontend Tailwind migration handoff

Status: in progress (November 16, 2026). The active frontend has **not** been fully migrated. This document records the current state and the work remaining; it is not an instruction to remove all CSS at once.

## Goal and constraints

Move active frontend presentation from custom CSS to Tailwind while preserving the existing layout, light/dark themes, responsive behavior, accessible focus states, readable dropdowns, menus above nearby actions, and native-select support for legacy pages. Keep CSS where utilities cannot safely replace theme tokens, portal-specific rules, keyframes, or required-field validation. Do not change application behavior or saved financial records as part of styling verification.

There are three imported stylesheets in `frontend/src/`: `styles.css` (~61 KB), `redesign.css` (~32 KB), and `workspace-pages.css` (~38 KB). Many selectors are compressed onto single lines and repeated across theme and breakpoint overrides. A wholesale deletion or mechanical conversion is not a verified migration.

## Current progress

- Shared `DropdownSelect` trigger, option, menu, placement-related styling, and context-specific sizes have moved to Tailwind in `frontend/src/components/ui/dropdown-select.tsx`. Settings currency width lives on `CurrencySelect` in `frontend/src/components/workspace-ui.tsx`.
- The edit sheet's shell, header, typography, form grid, field sizes/colors/focus, actions, trigger button, and open-dropdown stacking live primarily in `frontend/src/components/ui/sheet-form.tsx`. Sheet theme values remain as CSS variables in `frontend/src/styles.css` because the sheet is portaled outside `.finance-app`.
- Unreferenced old `.sheet-*` class rules were removed after a repository markup audit. The active sheet uses `data-slot` attributes and `finance-sheet-*` hooks; do **not** confuse those with the removed legacy classes.
- The 1×1px `.dropdown-select-validation` CSS rule is intentional: global unlayered `input` styles otherwise override its Tailwind size. Keep it until the global cascade is changed and native required-field validation is retested.
- Shared theme tokens, native `select` appearance/arrow styles, dropdown animation, and portal/scroll-overflow exceptions remain in CSS intentionally.

The earlier dropdown/CSS snapshot is staged, while subsequent migration edits are unstaged. Check `git status --short` before changing or staging anything. Do not reset or overwrite either set of changes, and do not modify `.env` to perform styling work.

## Verification already performed

- `npm run build`, `npm run test`, and `git diff --check` passed after the latest sheet/stacking changes (Git may print LF/CRLF warnings).
- Rendered sheet fixtures were checked at 1280px and 375px in both themes: 43px inputs/dropdowns, 1×1px required validation, correct dark menu colors, open menus above sticky save buttons, close-button hit area, and no horizontal overflow.
- An authenticated browser review of real **Accounts** and **Transactions** pages completed at desktop and mobile widths in both themes. Accounts' ledger dropdown and Transactions' category dropdown were opened; menu options remained readable. On Transactions, the category menu was confirmed to paint above the save action at an overlapping point. No records were saved. The testing browser was left signed in for subsequent review; do not assume that session or profile will still be available.

## What to do next

1. **Inventory before converting.** List selectors in each stylesheet and match them to rendered components and routes. Distinguish active workspace styling from unused/legacy rules; do not delete rules merely because a text search finds no JSX class (pseudo-elements, dynamically composed classes, and portals need separate review). Record the theme and breakpoint counterpart of each rule.
2. **Migrate by component/page ownership, not by deleting a whole file.** A useful order is the shared workspace shell/navigation (`frontend/src/components/app-shell.tsx`, `redesign.css`), shared workspace UI (`frontend/src/components/workspace-ui.tsx`, `workspace-pages.css`), Transactions filters/table (`frontend/src/pages/transactions.tsx`, `redesign.css`), then Accounts/Settings and the remaining collection/utility pages (`frontend/src/pages/collection-pages.tsx`, `frontend/src/pages/utility-pages.tsx`, `workspace-pages.css`). Move matching light, dark, hover/focus, and mobile rules together for each component.
3. **Control the CSS cascade.** These stylesheets contain unlayered rules that override ordinary Tailwind utilities. Remove the superseded selector when adding classes, or use scoped important utilities only when an existing rule genuinely must remain. Inspect computed styles rather than trusting the class string or a successful build.
4. **Verify each page before its CSS removal.** In the signed-in app, review desktop (around 1280px) and mobile (around 375px) in light and dark themes. Include closed/open dropdowns, upward placement in a scrolling sheet, menu overlap with sticky buttons, focus outline, required validation, close-button hit area, and horizontal overflow. Do not submit forms or change records during visual checks. Repeat on other routes as their styling is migrated.
5. **Run checks after each batch and at the end:** from `frontend/`, `npm run build` and `npm run test`; from the repository root, `git diff --check` and `git status --short`. Keep the previously staged snapshot untouched unless the user explicitly asks to stage or commit the migration.
6. **Only then clean up CSS.** Retain documented exceptions (theme tokens, animations, portal behavior, native-select styling, validation) and remove a rule only after its replacement is rendered and its theme/responsive variants have been checked. An all-at-once conversion still requires this verification; the previous user request did not authorize visual regressions.

## Known risks

- Tailwind v4 utilities are layered; legacy CSS is often unlayered and can win even with a more specific-looking utility. Several sheet rules already require scoped important variants for this reason.
- The default `.dark` variant and the application's `html.theme-dark`/`.finance-app.theme-dark` scopes are not interchangeable. Sheet content is rendered in a body-level portal.
- Workspace and transaction forms have different action markup (direct `.primary` buttons, typed submit buttons, and action rows). Preserve all three patterns.
- Current frontend unit tests do not cover visual styling. Browser checks are required before calling the migration complete.
