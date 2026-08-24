# SmartPOS Frontend

A fresh frontend project, replacing the earlier one entirely per your
instruction to omit it. Every screen here is wired to a real, verified
backend endpoint — nothing is mock data, and nothing is UI for an
endpoint that doesn't exist yet.

## What's included, and why only this much

| Screen | Backed by | Notes |
|---|---|---|
| Login | `POST /api/v1/auth/login` | Handles the forced password-change redirect |
| Change Password | `POST /api/v1/auth/change-password` | Signs out afterward and requires re-login, since this endpoint doesn't re-issue a token |
| Home | — | Permission-aware landing; shows only the screens the logged-in role can actually use, rather than guessing a redirect that might dead-end |
| Billing | `GET /api/v1/catalog/tree`, `POST /api/v1/sales` | Full checkout flow, all 6 payment modes, server-computed VAT-inclusive receipt |
| Store Management | `/api/v1/admin/stores` (list/create/activate/deactivate) | Surfaces auto-provisioned temp passwords once, as the backend's own code comment requires |
| Products & Inventory | `/api/v1/catalog/items`, `/inventory/adjust` | Tax rate is deliberately not editable — no endpoint exists yet to list available tax rates |

**Deliberately not built:** Users & Roles, Suppliers, Purchase Orders,
Table Management, Hold & Resume, Returns, Reports, and the VAT/Profit
pricing UI from the design prototype. None have a real backend endpoint.
Store Manager specifically has **no screen at all** right now — every
permission that role holds (`REPORTS.VIEW_*`) maps to something
unbuilt. The Home screen says so honestly rather than pretending
otherwise.

## Running it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Expects the backend running at
`http://localhost:8000` (matches the CORS origins already configured in
the backend's `app/main.py`).

Log in with any seeded account — e.g. the Super Admin created by
`seed_rbac.py` (`superadmin` / `Passw0rd!`), or whatever Cashier/Store
Admin accounts your `seed_catalog.py` / store-creation flow produced.

## Verified against your real backend, not inferred

Every API path, permission code, and response field in `src/api/*.ts`
was checked directly against your uploaded `smartpos-local-backend.zip`
— the actual `router.py` and `schemas.py` files, not conversation
summaries or guessed conventions. Cross-checked with a script comparing
every permission string and API path used here against what the real
backend's routers and seed data actually define; all matched.

**Still not run end-to-end** — no network access in this environment to
`npm install` and actually launch it. `npx tsc --noEmit` confirms no
syntax errors across every file, but that's not the same as a browser
successfully calling your running server. That's the real first test,
on your machine.

## One UX decision worth knowing about

`AddEditItemModal` intentionally doesn't include a tax rate selector —
`ItemCreate`/`ItemUpdate` want a `tax_rate_id`, but there's no
`GET /api/v1/catalog/tax-rates` (or similar) endpoint to populate a
picker with. Items created here will have no tax rate until either
that endpoint gets built or tax rates get assigned some other way.
