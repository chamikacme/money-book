# Finance Tracker — Desktop-First Product Redesign

Act as a **senior product designer, UI/UX architect, and frontend engineer** specializing in polished financial SaaS products. Redesign the existing Finance Tracker as a coherent, production-quality application—not a generic admin template.

Modernize the interface and experience while preserving the application's existing functionality, business logic, APIs, data structures, and authentication. Treat this as a frontend redesign, not a backend rewrite.

## Design system (required)

- **Platform:** Web, desktop-first; optimize for 1440px and 1920px. Keep layouts responsive, but do not mimic a mobile app on desktop.
- **Style:** Modern minimalist fintech with restrained bento-grid composition; precise hierarchy, comfortable information density, and purposeful whitespace.
- **Mood:** Trustworthy, calm, sophisticated, clear, and productive. Take broad inspiration from Linear's precision, Stripe's data presentation, Apple's restraint, and Revolut's financial clarity; do not copy their interfaces.
- **Light theme:** Cool off-white background `#F7F8FA`; white surfaces `#FFFFFF`; subtle borders `#E6E8EC`; deep navy primary `#243B6B`; primary text `#171A21`; secondary text `#687182`.
- **Financial semantics:** Restrained emerald `#16845B` for income/positive values and muted red `#C3424A` for expenses/negative values. Never use color as the only indicator; pair it with labels, signs, or icons.
- **Dark theme:** Provide a complete dark theme through semantic tokens, with accessible contrast. Do not merely invert the light palette.
- **Typography:** Use the existing project font when suitable; otherwise prefer Inter or Geist. Establish a clear type scale for page titles, section headings, values, labels, and table data.
- **Components:** Lucide-style icons; 12–16px card radii; subtle borders and restrained shadows; consistent 4px/8px spacing rhythm. Define reusable semantic tokens for colors, type, spacing, radius, borders, shadows, and interactive states.
- **Avoid:** Loud rainbow dashboards, excessive gradients, heavy glassmorphism, gratuitous animation, cramped tables, and template-like layouts.

## Information architecture and page requirements

Use a persistent, collapsible left sidebar for the existing primary destinations. Keep a clean page header with title, relevant date range, contextual actions, and user menu. Use available horizontal space efficiently and keep navigation and page patterns consistent.

### Dashboard

Create a scannable financial overview with a hierarchy based on importance:

1. **Summary:** Total account balance, monthly income, monthly expenses, and net savings/cash flow. Show period-over-period changes only when the underlying data supports accurate calculation.
2. **Analytics:** Income versus expenses, spending by category, cash-flow trend, and budget utilization. Choose legible chart forms, clear labels, useful legends, and consistent currency formatting.
3. **Activity:** Recent transactions, budget progress, supported upcoming recurring expenses, and concise insights derived only from available data.

Use varied but aligned bento-card sizes. Do not fabricate totals, trends, insights, or recurring items to fill space.

### Transactions

Provide a desktop-friendly, full-width table with readable columns, search, date/account/category/type filters, sorting, and pagination where supported. Make income and expense distinctions clear without relying on color alone. Include efficient add/edit affordances and well-designed dialogs or drawers, but only enable mutations the current backend supports.

### Existing destinations

Apply the same system to existing Accounts, Budgets, Categories, Reports/Analytics, and Settings pages. Audit the actual app first: preserve its routes, terminology, features, and workflows. Do not create a page or remove a capability simply because it is not listed here.

## Interaction, accessibility, and states

- Design polished hover, focus-visible, active, disabled, loading, success, and error states.
- Provide helpful empty states and skeletons that match the final layout.
- Ensure keyboard navigation, semantic controls, accessible contrast, and meaningful labels.
- Keep transitions subtle (typically 150–250ms) and honor `prefers-reduced-motion`.
- Use consistent date, number, and currency formatting. Preserve correct LKR formatting and support other currencies if already implemented.

## Technical and data constraints

1. First inspect the repository: framework, dependencies, routing, component patterns, styles, existing pages, API routes/services, and data-fetching behavior. Prefer the existing stack and conventions. Do not add dependencies without a clear, justified benefit.
2. Reuse working API integrations and preserve their request/response contracts. Never replace real data with mock data for convenience.
3. **Do not implement or modify backend endpoints, database schemas, authentication, or backend business logic in this phase.** Do not make unrelated refactors.
4. For each unsupported feature, verify that no existing endpoint can support it before proposing a new contract. Do not silently invent routes or assume endpoints exist.
5. Keep data access separate from presentation. Where useful, prepare typed frontend interfaces and replaceable service adapters for missing capabilities, with clear TODOs.
6. Use isolated, clearly labeled mock data only when needed to preview an unsupported UI. Never present it as real financial information. Do not persist simulated transactions or claim unsupported mutations succeeded; disable those production actions until backed by a real endpoint.
7. Record each unique missing endpoint in `docs/BACKEND_REQUIREMENTS.md`, grouped by feature. Include endpoint name, purpose, suggested method and route, authentication, request parameters, example response, frontend usage, priority, implementation status, dependencies, and validation/calculation/pagination notes. Avoid duplicate requirements.

## Execution plan and approval gate

### Phase 1 — Audit and proposal

Inspect the existing codebase and summarize its pages, architecture, APIs, supported capabilities, and key UX issues. Then propose a concise redesign plan and identify any relevant tradeoffs or missing backend capabilities.

**Stop after presenting the plan. Do not edit code until the user has reviewed and explicitly approved it.**

### After approval

1. Define and implement the reusable design system and application shell.
2. Redesign the dashboard first, using real data wherever supported.
3. Apply the approved design consistently to the remaining existing pages.
4. Document missing API requirements in `docs/BACKEND_REQUIREMENTS.md`; do not implement those backend endpoints.
5. Validate existing workflows, API integration, accessibility, responsive behavior, visual consistency, and build/test results. Clearly distinguish working features from frontend-only features.

When the frontend work is complete, summarize delivered changes, validation performed, mocked or disabled features, and outstanding backend requirements. Recommend an implementation order for missing endpoints, but **wait for explicit approval before any backend development**.

## Definition of done

- The redesigned frontend uses reusable components and a consistent light/dark semantic design system.
- Existing supported features and API integrations continue to work; no existing features are removed.
- Unsupported capabilities are clearly identified, safely disabled or previewed with labeled mock data, and documented in `docs/BACKEND_REQUIREMENTS.md`.
- No financial values or successful operations are fabricated.
- The final summary clearly reports completed work, validation, and remaining dependencies.
