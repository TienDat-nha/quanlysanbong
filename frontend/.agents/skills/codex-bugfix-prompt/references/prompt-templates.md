# Prompt Templates

## 1. Root-Cause Bug Fix

Use when the bug scope is mostly known and the goal is a minimal, safe fix.

```md
Objective
- Fix [bug summary] on [route/page] for [role] with a root-cause patch that stays consistent with the current controller/model/view split.

Observed behavior
- [What is happening now]
- [Any error message, broken state, or wrong UI result]

Expected behavior
- [What should happen instead]

Relevant repo context
- Runtime routing flows through `src/App.js` -> `src/controllers/AppController.jsx`.
- Business logic belongs in `src/models/**`, orchestration in `src/controllers/**`, and rendering in `src/views/**` or `src/components/**`.
- [Any repo-specific domain context that applies]

Files to inspect first
- `[path-1]`
- `[path-2]`
- `[path-3]`

Constraints
- Do not rewrite unrelated architecture.
- Do not revert unrelated local changes.
- Keep cleanup limited to code directly coupled to the fix.
- Preserve existing Vietnamese copy unless the bug is content or encoding related.

Required actions
- Trace the failure path and identify the actual root cause.
- Implement the smallest safe fix in the correct layer.
- Clean up only duplicated or misleading logic directly adjacent to the fix.
- Add or update targeted tests if feasible.

Acceptance criteria
- [Concrete pass condition 1]
- [Concrete pass condition 2]
- [Concrete pass condition 3]

Validation
- Run `npm run build`.
- Run `CI=true npm test -- --watch=false` if tests are touched or the bug has test coverage potential.
- Summarize what changed, how it was verified, and any remaining risk.
```

## 2. Bug Fix Plus Clean Code

Use when the user explicitly asks for both a fix and cleaner code, but still wants a narrow scope.

```md
Objective
- Fix [bug summary] and clean the directly related code without expanding into a broad refactor.

Observed behavior
- [Current broken behavior]

Expected behavior
- [Expected behavior]

Relevant repo context
- This repo separates orchestration in `controllers`, business logic in `models`, and rendering in `views` or `components`.
- [Mention booking, payment, auth, admin, or field domain if relevant]

Files to inspect first
- `[path-1]`
- `[path-2]`

Constraints
- No broad rewrite, no architecture reshuffle, no formatting-only churn.
- If the worktree is dirty, do not revert unrelated edits.
- Any cleanup must stay adjacent to the bug fix and reduce future regressions.

Required actions
- Find the root cause.
- Apply the smallest safe fix.
- Remove dead branches, duplicated conditions, or confusing naming only where they directly contribute to the bug.
- Keep the final structure aligned with existing repo patterns.

Acceptance criteria
- The bug is fixed.
- The touched code is simpler to read than before.
- Behavior outside the impacted flow remains unchanged.

Validation
- Run `npm run build`.
- Add or update focused tests if practical.
- Provide a short manual verification checklist for the affected flow.
```

## 3. Payment or Booking Regression

Use for bugs that cross state, API, and UI boundaries in the reservation or payment flow.

```md
Objective
- Fix [payment or booking bug] end-to-end without introducing regressions in related state transitions.

Observed behavior
- [Broken payment or booking behavior]
- [API mismatch, stale UI state, wrong status label, modal issue, or route issue]

Expected behavior
- [Expected end-to-end result]

Relevant repo context
- Booking logic lives mainly in `src/controllers/pages/useBookingController.js` and `src/models/booking*.js`.
- Payment flow spans `src/services/paymentService.js`, `src/hooks/usePaymentFlow.js`, payment components, and related page controllers.
- This codebase uses localStorage-backed fallbacks and status normalization in several models.

Files to inspect first
- `src/controllers/pages/useBookingController.js`
- `src/services/paymentService.js`
- `src/hooks/usePaymentFlow.js`
- `[any specific payment or booking component/view]`

Constraints
- Inspect API mapping, state transitions, and rendered status together.
- Do not patch only the visible symptom if the root cause is normalization or state sync.
- Preserve existing route flow and role behavior unless the bug is caused by routing.

Required actions
- Reconstruct the failing flow from API/service to hook/controller to UI.
- Fix the root cause in the correct layer.
- Clean up misleading status or transition logic only where it directly affects this flow.
- Add targeted coverage if feasible.

Acceptance criteria
- The affected flow works from start to finish.
- UI state, labels, and route transitions stay consistent with backend results.
- No obvious regression appears in adjacent booking or payment actions.

Validation
- Run `npm run build`.
- Run relevant tests if added.
- List manual checks for the exact user flow, including role, route, and visible result.
```
