# Module 1.5 — Customer-Facing Display: What Changed

## New file
- `src/pages/CustomerDisplayScreen.tsx` — the pop-out window. Idle,
  cart, payment, and receipt states, large-print layout. Pure listener,
  no API calls.

## Modified files
- `src/App.tsx` — added the `/customer-display` route, behind
  `ProtectedRoute` (no specific permission — it just needs a logged-in
  session, since the popped-out window shares the same-origin
  localStorage as the cashier's tab).
- `src/pages/BillingScreen.tsx` — added:
  - A `BroadcastChannel("smartpos-customer-display")` connection
  - A broadcast effect that fires on every cart/screen/completedSale
    change, sending the right message for whichever state the sale is in
  - An "Open customer display" button next to Sign out
- `src/api/catalogApi.ts` — fixed a real, pre-existing bug unrelated to
  this module (see below), because I needed the `Item`/`Category` types
  to actually resolve while building this.

## The bug this surfaced, worth knowing about even though it's not new

`BillingScreen.tsx` and `ProductInventoryScreen.tsx` both import `Item`
and `Category` from `catalogApi.ts` — but that file only ever exported
`ItemOut` and `CategoryOut`. This would have passed `npm run dev`
silently (esbuild doesn't type-check) but **failed `npm run build`**
(`tsc && vite build`) the first time anyone actually tried to ship this.
Fixed with two type aliases in `catalogApi.ts` rather than renaming every
import site — smallest possible fix, and it's the file both other
components were already assuming existed.

Worth running `npm run build` once after merging this in, just to
confirm — I can't run it myself in this environment (no network access
to `npm install`), so this is inferred from reading the code, not from
watching the build actually fail and then pass.

## Why the hooks are placed where they are

Both new `useEffect` calls in `BillingScreen.tsx` sit *before* the
`if (!storeId) return ...` / `if (isLoading) return ...` early returns,
not after. React hooks must run in the same order on every render — if
they'd been placed after the early returns, the loading/error render
paths would call fewer hooks than the success path, and React would
throw. The broadcast effect guards internally (`if (!catalog) return`)
instead, since `catalog` itself is available before the early returns
even while it's still `null`.

## Testing this yourself

1. Log in as a Cashier, open Billing.
2. Click "Customer display" — a second window opens. Drag it to a
   second monitor (or just position it anywhere for testing).
3. Add items to the cart in the main window — the second window should
   update live with each change.
4. Proceed to Payment — the second window should switch to "Amount Due."
5. Complete a sale — the second window should show "Thank you" with the
   receipt number, then return to idle once you start a new sale.
