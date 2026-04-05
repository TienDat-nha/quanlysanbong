# Delivery Standards For Bugfix Prompts

Use these rules when the user wants a prompt that feels like it came from a pragmatic software team instead of a generic AI request.

## Core Standards

- Fix the root cause, not just the symptom.
- Apply the smallest safe patch that solves the issue end to end.
- Keep cleanup limited to code directly adjacent to the fix.
- Preserve the current architecture unless the bug is caused by the architecture itself.
- Prefer concrete file paths, routes, user roles, and state transitions over generic wording.
- Require validation that another engineer can repeat quickly.

## Required Prompt Behaviors

- Tell Codex to reconstruct the failing path before editing code.
- Tell Codex to identify the exact root cause in the final summary.
- Tell Codex to modify the correct layer:
  - `views` and `components` for rendering defects
  - `controllers` and hooks for orchestration or state defects
  - `models` and service files for data shape, normalization, helper, or API defects
- Tell Codex to avoid unrelated formatting churn, wide renames, and broad rewrites.
- Tell Codex to respect a dirty worktree and never revert unrelated local edits.

## Clean Code Scope

When the user asks for clean code, keep it narrow:

- Remove dead branches that directly obscure the bug.
- Collapse duplicated conditions or status mappings that caused the bug.
- Rename only misleading local variables or functions near the fix.
- Extract a tiny helper only when it removes duplication directly tied to the bug.

Do not ask for:

- architecture rewrites
- folder reshuffles
- style-only cleanup unrelated to the bug
- speculative refactors with no acceptance criteria

## Validation Standard

Every prompt should require:

- `npm run build`
- targeted tests when the touched code already has tests or the fix is easy to cover
- a short manual verification checklist with route, role, action, and visible result
- a concise close-out summary: root cause, files changed, validation run, remaining risk

## Domain Notes

### Auth And Routing

- Check `src/controllers/AppController.jsx`, `src/controllers/useAppController.js`, `src/models/authModel.js`, and `src/models/routeModel.js` together.
- Mention redirect state, role gating, and protected route flow when relevant.

### Booking

- Inspect date normalization, slot parsing, merge logic, cache fallback, and status text together.
- Reference `src/controllers/pages/useBookingController.js` and `src/models/booking*.js` early.

### Payment

- Inspect API mapping, status normalization, hook transitions, modal lifecycle, and label rendering together.
- Reference `src/services/paymentService.js`, `src/hooks/usePaymentFlow.js`, `src/models/paymentModel.js`, and payment components early.

### Admin And Owner Portals

- Stay aligned with current portal routing and role checks.
- Keep page controller, page hook, view, and related model responsibilities separate.
