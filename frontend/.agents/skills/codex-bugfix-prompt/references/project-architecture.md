# Sanbong Frontend Architecture

## Stack

- React `19.2.x`
- `react-router-dom` `7.13.x`
- Create React App via `react-scripts` `5.0.1`
- Sass styles via `.scss`
- Testing with React Testing Library and Jest

## Runtime Entry Path

- `src/index.js` boots the app.
- `src/App.js` re-exports `src/controllers/AppController.jsx`.
- `src/controllers/AppController.jsx` wires routes, auth gating, and layout controllers.
- `src/views/AppView.jsx` renders the application shell.

When a prompt needs route-level fixes, start from the runtime path above instead of assuming `src/pages/**` is the primary entry layer.

## Layer Responsibilities

- `src/controllers/**`
  - Route composition, page orchestration, auth guards, effect wiring
- `src/controllers/pages/use*.js`
  - Stateful page logic and side effects
- `src/views/**`
  - Presentational JSX and page or layout SCSS
- `src/components/**`
  - Reusable UI blocks shared across pages
- `src/models/**`
  - Business rules, route helpers, auth helpers, text helpers, API wrappers, localStorage helpers, normalization logic
- `src/services/api.js`
  - Re-exports `src/models/api.js`
- `src/services/paymentService.js`
  - Payment-specific service layer
- `src/hooks/**`
  - Cross-cutting stateful behavior such as payment flow
- `src/pages/**`
  - Thin wrappers and legacy-style page exports; do not assume this is the runtime control layer

## Domain Hotspots

### Auth and Role Routing

- `src/controllers/AppController.jsx`
- `src/controllers/useAppController.js`
- `src/models/authModel.js`
- `src/models/routeModel.js`
- `src/controllers/layout/*`
- `src/models/layout/*`

### Field Listing and Detail

- `src/controllers/pages/useFieldsController.js`
- `src/controllers/pages/useFieldDetailController.js`
- `src/models/fieldModel.js`
- `src/models/adminFieldModel.js`

### Booking

- `src/controllers/pages/BookingController.jsx`
- `src/controllers/pages/useBookingController.js`
- `src/models/bookingModel.js`
- `src/models/bookingTextModel.js`
- `src/models/bookingCacheModel.js`
- `src/views/pages/BookingView.jsx`

Booking bugs often involve date normalization, slot parsing, booking merge logic, or localStorage-backed fallback state.

### Payment

- `src/controllers/pages/DepositPaymentController.jsx`
- `src/controllers/pages/MyPaymentsController.jsx`
- `src/hooks/usePaymentFlow.js`
- `src/services/paymentService.js`
- `src/models/paymentModel.js`
- `src/components/PaymentMethodForm.jsx`
- `src/components/PaymentMethodModal.jsx`
- `src/components/PaymentQRModal.jsx`
- `src/components/PaymentStatusBadge.jsx`
- `src/views/pages/MyPaymentsView.jsx`

Payment bugs often span API response shape, hook state transitions, modal props, and Vietnamese UI text encoding.

### Admin and Owner Portals

- `src/controllers/pages/Admin*.jsx`
- `src/controllers/pages/useAdmin*.js`
- `src/controllers/pages/OwnerFieldRequestsController.jsx`
- matching files in `src/views/pages/*.jsx` and `*.scss`

## API and Environment Notes

- `REACT_APP_API_URL` is normalized in `src/models/api.js`.
- If no env var is set, the app falls back to the OnRender backend or local host variants.
- `REACT_APP_FIELD_IDS` affects public field listing because the backend does not expose a public list endpoint.

Prompts about missing field data should explicitly mention env config and fallback behavior.

## Prompting Heuristics

- Route or protected-page bugs:
  - inspect `ROUTES`, `ProtectedPortalRoute`, login redirect state, and role checks together
- Stale or missing field data:
  - inspect env fallback, `REACT_APP_FIELD_IDS`, stored field snapshots, and known field IDs in localStorage helpers
- Booking slot inconsistencies:
  - inspect merged booking collections, time-slot parsing, date normalization, and booking status mapping
- Payment regressions:
  - inspect service response mapping, hook loading or error transitions, modal lifecycle, and payment status display
- Style-only issues:
  - stay in `views`, `components`, and SCSS unless state or data flow is clearly involved

## Validation Commands

- `npm run build`
- `CI=true npm test -- --watch=false`

Use the second command when tests are relevant and the environment supports non-interactive CRA test runs.

## Safety Constraints

- Prefer the smallest safe patch over a broad rewrite.
- Do not revert unrelated local changes.
- Keep cleanup tightly coupled to the bug fix.
- Add comments only when logic is otherwise hard to parse.
