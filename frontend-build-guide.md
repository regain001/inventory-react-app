# Inventory React App — Build Guide & Context Handoff

> Everything you need to continue this project: tech decisions, real API contract, the exact step-by-step build log (why each file exists), discovered gotchas, and the improvement roadmap. Written so it can be pasted whole into another LLM as context.
> Companion file in the same folder: `frontend-phase1-task-breakdown.md` (the original plan this implementation follows).

---

## 1. Status at a glance

| Area | Status |
| --- | --- |
| App shell (topbar + collapsible sidebar + breadcrumb) | Done (Milestone 1) |
| Category CRUD | Done (Milestone 2) |
| Product list + filters + CRUD | Done (Milestone 3) |
| Customer CRUD | Done (Milestone 4) |
| Purchase Order list + filters + line-item CRUD | Done |
| Backend integration (live on `http://localhost:8086/api`) | Working, CORS configured |
| Auth / login | Not started (parking lot) |
| Dashboard with real numbers | Placeholder only |
| Sales Order / Current Stock screens | Not started (needs backend) |

---

## 2. Tech decisions (settled — do not re-decide)

- **Vite + React 19 + TypeScript**, `strict: true`. Strict TS is intentional (matches the Java background of the owner).
- **react-router-dom v7** — page navigation; ships its own TS types.
- **axios** — HTTP calls; ships its own TS types.
- **Bootstrap 5.3.3 via CDN** in `index.html` (CSS + JS bundle). No component library (no MUI/AntD). Modals are built by hand with React-controlled `d-block` markup + a `.modal-backdrop` div — deliberately NOT driven by Bootstrap's JS `data-bs-*`, so they compose cleanly with React state.
- **Bootstrap Icons** via CDN (`.bi` icon font) — used for all nav/search/action icons.
- **No Redux/Context** — plain `useState`/`useEffect` per page. All page data is fetched per page; nothing is shared globally yet.
- **One shared axios instance** (`src/api/axiosClient.ts`) with a response interceptor that unwraps errors centrally.
- **Build/typecheck commands**: `npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint), `npm run dev` (Vite dev server on port 5173).
- Base URL: `http://localhost:8086/api` (override with `VITE_API_BASE_URL` env var).

---

## 3. How to run

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # production build (+ tsc typecheck)
npm run lint         # oxlint
```

Backend must be running on `http://localhost:8086` and already allows CORS `http://localhost:5173` (verified: `Access-Control-Allow-Origin: http://localhost:5173` on both GET and OPTIONS preflight).

---

## 4. Folder structure (as built)

```
src/
  main.tsx                      # React root (StrictMode)
  App.tsx                       # BrowserRouter + routes
  index.css                     # custom layout CSS (topbar/sidebar/breadcrumb)
  components/
    StatusBadge.tsx             # Active/Inactive pill
  layout/
    AppLayout.tsx               # Topbar + Sidebar + breadcrumb + <Outlet/>; holds sidebarCollapsed state
    Topbar.tsx                  # dark-blue bar: brand, hamburger, search, user name + avatar
    Sidebar.tsx                 # nav groups from navItems.ts, active highlight via NavLink, collapse via prop
    navItems.ts                 # single typed array driving the whole sidebar
  api/
    axiosClient.ts              # shared axios instance + error interceptor + API_BASE_URL
    categoryApi.ts
    productApi.ts
    customerApi.ts
    purchaseOrderApi.ts
  types/
    api.ts                      # ApiResponse<T> envelope
    category.ts
    product.ts
    customer.ts
    purchaseOrder.ts
  pages/
    Dashboard.tsx               # placeholder
    categories/CategoryListPage.tsx + CategoryFormModal.tsx
    products/ProductListPage.tsx + ProductFormModal.tsx
    customers/CustomerListPage.tsx + CustomerFormModal.tsx
    purchase-orders/PurchaseOrderListPage.tsx + PurchaseOrderFormModal.tsx
```

---

## 5. Real API contract (verified live, June 2026 build)

Base URL: `http://localhost:8086/api`.

### Envelope (used by every endpoint EXCEPT the PO list — see ⚠️)

```json
{
  "status": 200,
  "message": "Success",
  "data": "<entity or array or page>",
  "debugHint": null,
  "errors": null,
  "success": true
}
```

### Pagination page shape (products, customers, and — as a TOP-LEVEL object — PO list)

```json
{ "fetchedRecords": 2, "limit": 100, "records": [ ... ], "start": 0, "totalRecords": 2 }
```

### 5.1 Product Categories — `/product-categories`

| Verb/method | Path | Notes |
| --- | --- | --- |
| GET | `/product-categories` | envelope → `data: Category[]` (unpaginated) |
| GET | `/product-categories/{id}` | envelope → single |
| POST | `/product-categories` | **create OR update** — `id: null` = create, `id` set = update |
| POST | `/product-categories/{id}` | ⚠️ **delete is POST here, not DELETE** (known backend quirk) |

```jsonc
// GET record
{ "productCategoryId": 1, "categoryName": "Turbo", "description": null, "active": true, "createdAt": "2026-09-17 07:48:29", "updatedAt": "..." }
// POST body
{ "id": null, "categoryName": "Beverages", "description": "...", "active": true }
```
No status PATCH endpoint for categories. List is short → fetched unpaginated, sorted however the backend returns it.

### 5.2 Products — `/products`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products?start&limit&keyword&categoryId&active&minPrice&maxPrice` | envelope → `data: Page` |
| GET | `/products/{id}` | |
| POST | `/products` | create (id null) / update (id set) |
| PATCH | `/products/{id}/status` | body `{ "active": false }` |
| DELETE | `/products/{id}` | |

```jsonc
// GET record
{ "productId": 12, "sku": "83051", "productName": "Barrel Samrat", "categoryId": 1, "productCategoryName": "Turbo",
  "price": 2040.0, "packQuantity": 1, "packUnit": "Piece", "minStockLevel": 0, "active": true, "createdAt": "...", "updatedAt": "..." }
// POST body
{ "id": null, "sku": "SKU-001", "productName": "...", "categoryId": 1, "price": 99.99, "packQuantity": 12, "packUnit": "pcs", "minStockLevel": 5, "active": true }
```

### 5.3 Customers — `/customers`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/customers?start&limit&keyword&status` | envelope → `data: Page` |
| GET | `/customers/{id}` | |
| POST | `/customers` | create (id null) / update (id set) |
| DELETE | `/customers/{id}` | |

```jsonc
// GET record
{ "customerId": 3, "customerName": "Rahim Ikbul", "phone": "01657788215", "address": "Akrampur, Kishoreganj",
  "customerType": "MAHTAB MACHINERIES", "active": true, "createdAt": "2026-09-18T20:24:06.554978", "updatedAt": "..." }
// POST body
{ "id": null, "customerName": "Acme Corp", "phone": "+8801712345678", "address": "123 Main St, Dhaka",
  "customerType": "MAHTAB MACHINERIES", "active": true }
```
`customerType` is currently one of `PRAN RFL` / `MAHTAB MACHINERIES` (rendered as a hard-coded `<select>` in the form "for now"). No status PATCH — activate/deactivate is a full POST with `active` flipped.

### 5.4 Purchase Orders — `/purchase-orders`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/purchase-orders?start&limit&overallStatus&fromDate&toDate` | ⚠️ **returns the page RAW, NO envelope** |
| GET | `/purchase-orders/{id}` | envelope → single |
| POST | `/purchase-orders` | create (`purchaseOrderId: null`) / update (`purchaseOrderId` set); body uses `lines` |
| DELETE | `/purchase-orders/{id}` | |

```jsonc
// GET record (raw page)
{ "purchaseOrderId": 2, "poNumber": "DO002", "documentNumber": "DO092600002", "transactionDate": "2026-07-20",
  "createdAt": "2026-03-20T00:00:00", "createdBy": 1, "note": null, "overallStatus": "Completed",
  "totalAmount": 100000.0, "totalQuantity": 10,
  "perlines": [ { "id": 3, "productId": 4, "productCode": "962408", "productName": "Teflon Tape Silver -Turbo",
                  "quantity": 4, "unitPrice": 5000.0, "perlineTotalAmount": 20000.0 } ] }

// POST body (note the field name difference!)
{ "purchaseOrderId": null, "poNumber": "PO-2026-001", "transactionDate": "2026-09-19", "note": "Initial purchase order",
  "overallStatus": "Completed",
  "lines": [ { "productId": 1, "quantity": 10, "unitPrice": 600.00 } ] }
```

### 5.5 API quirks to respect (do NOT "fix" these silently)

1. **PO list has no envelope**; customer/product/category lists and all single/get/save/delete DO have the envelope → `purchaseOrderApi.getAll()` returns `response.data` (the raw page), every other list returns `response.data.data`.
2. **Category delete is `POST /product-categories/{id}`**, not `DELETE` (all other deletes are `DELETE`).
3. Backend spells line items **`perlines`** on read but **`lines`** on write. Typed separately on purpose.
4. `createdAt` formats are inconsistent across entities (`2026-09-17 07:48:29` vs ISO `2026-09-18T20:24:06.554978`); not displayed in tables so no parsing is needed.
5. `GET /products/{id}` example shows `perlines` items can come back with `productName`/`productCode` null → the PO edit modal re-resolves names from the loaded product list.
6. PO `transactionDate` is a plain `YYYY-MM-DD` (single order has `2021-03-20`); the date input uses it directly.

---

## 6. Global conventions (what every page/API file follows)

- **`types/api.ts`** — `ApiResponse<T>` = `{ status, message, data, debugHint, errors, success }`. Every DTO interfaces *mirror the backend JSON field names exactly* (snake_case included).
- **`api/axiosClient.ts`** — single instance; **response interceptor**:
  - if body has `success === false` → reject with a readable `Error` (message from `message`, else first `errors` item, else fallback);
  - on HTTP error → reject with `error.response.data.message` / `errors` / status fallback;
  - network/timeout → "Network error" / "Request timed out".
  - Result: pages render backend validation messages (e.g. "A category with this name already exists...") as an on-screen red alert — no raw `alert()`.
- **Page pattern** (all four list pages follow it exactly): `useState` table/loading/error → `useCallback` fetch fn → `useEffect` on `[filters, start]` → loading spinner / empty state / error alert → Bootstrap table → Prev/Next pagination from `start`/`limit`/`totalRecords` → Apply/Reset filter form → conditionally-rendered modal.
- **Modal pattern**: mounted only when `showForm` is true; parent passes `key={editing?.id ?? 'new'}` so the form's `useState` initializers re-run on open. Rendered as `modal fade show d-block` + sibling `.modal-backdrop` (no Bootstrap JS). Save button shows inline spinner. Backend messages appear inside the modal.
- **Status toggle**: dedicated PATCH for products; for customers it is a full POST (`save`) with `active` flipped.
- **Delete**: `window.confirm` then the API call; backend errors surfaces as the on-page alert.
- Modal line-editor for PO computes per-line total (`qty × price`) and grand totals client-side for display only; the backend computes/stores the persisted `totalAmount`/`totalQuantity`.
- Sidebar and routing are driven 100% by `navItems.ts` + `App.tsx`; `Sidebar.tsx`/`Topbar.tsx`/`AppLayout.tsx` do not need edits to add a page.

---

## 7. Step-by-step build log

### Milestone 0 — Bootstrap
1. Scaffolded `create-vite` React-TS template into a temp dir and copied files into the project folder (folder already contained the task-breakdown md + screenshots). Cleaned the starter demo (`App.css`, demo SVGs).
2. `npm install`, then `npm install react-router-dom axios`.
3. `index.html`: title → "Mahtab Machineries — Inventory"; added Bootstrap 5.3.3 CSS+JS and Bootstrap Icons CDN; kept the module script for `/src/main.tsx`.
4. Confirmed backend reachability later (initially `:8080`, corrected to live `http://localhost:8086/api`).

### Milestone 1 — Static app shell (matches screenshot spec in `frontend-phase1-task-breakdown.md` §"Visual target")
1. **`navItems.ts`** — typed `NavGroup[]` = `{ group?, items: {id,label,path,icon}[] }`. Groups: ungrouped Dashboard; "Master Data" (Products, Categories, Customers); "Transactions" (Purchase Orders — added in the PO step).
2. **`Topbar.tsx`** — dark-blue full-width bar: brand logo (white "M" tile) + name, hamburger toggle button, spacer, search icon, user name + circular avatar. Recieves `collapsed`-toggle callback + `userName` (currently hard-coded `"Admin"`).
3. **`Sidebar.tsx`** — light-grey column; uppercase grey group labels; `NavLink` items with icon + label; `isActive` → `.active` highlight; `collapsed` prop hides labels + shrinks width (CSS transition).
4. **`AppLayout.tsx`** — owns `sidebarCollapsed` state; renders Topbar + [Sidebar | content]; content = breadcrumb strip (`home icon / current page`) derived from `navItems` via `useLocation`, then `<Outlet/>`.
5. **`App.tsx`** — `BrowserRouter` + `<Route element={<AppLayout/>}>` with nested routes `/`, `/categories`, `/products`, `/customers` (placeholder `<h2>Coming soon</h2>` pages), later `/purchase-orders`.
6. **`index.css`** — replaced Vite demo styles with app styles: topbar (bg `#153a5e`), sidebar (bg `#f2f4f7`, width 240px → collapsed 64px), breadcrumb row, page padding, `a.sidebar-item` active/hover states.
7. Verified: checkpoint — hamburger collapses sidebar; each nav item routes + highlights; refresh on `/products` returns the page (Vite SPA fallback), not a 404.

### Milestone 2 — Category CRUD (`/product-categories`)
1. **`types/category.ts`** — `Category` (snake_case mirror) + `CategorySaveDto` (`id|null`, name, description, active).
2. **`api/axiosClient.ts`** — shared instance, `API_BASE_URL` with `VITE_API_BASE_URL` override, error interceptor.
3. **`api/categoryApi.ts`** — `getAll/getById/save/remove`; `remove` uses **POST** per the backend.
4. **`CategoryListPage.tsx`** — header + "Add Category", error alert, loading spinner, empty state, table (Name, Description, Status badge, Edit/Delete), confirm-delete → reload.
5. **`CategoryFormModal.tsx`** — create + edit in one modal (pre-filled when `category` prop set); name required; description nullable; active switch. Save → `categoryApi.save` → `onSaved` reloads without full page reload.
6. Verified with the live API: list renders real categories (Techno/Toronto/Turbo); backend validation messages reach the UI.

### Milestone 3 — Product list with filters + CRUD (`/products`)
1. **`types/product.ts`** — `Product` (includes `productCategoryName`), `ProductPage`, `ProductQuery` (`start/limit/keyword/categoryId/active/minPrice/maxPrice`), `ProductSaveDto`.
2. **`api/productApi.ts`** — `getAll(query)`, `getById`, `save`, `updateStatus` (PATCH), `remove` (DELETE).
3. **`ProductListPage.tsx`** — Apply/Reset filter bar (keyword search, category `<select>` populated from `categoryApi.getAll`, status select, min/max price); table (SKU, Name, Category, Price, Pack, Min Stock, Status, Actions); Prev/Next pagination from `totalRecords`; per-row Edit / Deactivate-Activate / Delete.
4. **`ProductFormModal.tsx`** — SKU, name, category select (live), price, min stock, pack quantity/unit, active switch; submits `categoryId` number.
5. Verified: `GET /products?start=0&limit=5` and `keyword=83051` return expected records; filter params hit the backend (not client-side).

### Milestone 4 — Customer CRUD (`/customers`)
1. **`types/customer.ts`** + **`api/customerApi.ts`** — same four operations; page shape.
2. **`CustomerListPage.tsx`** — keyword + status filters, pagination, table (Name, Phone, Address, Type badge, Status, Edit/Activate-Deactivate/Delete).
3. **`CustomerFormModal.tsx`** — name/phone/address/type select (`MAHTAB MACHINERIES` default, `PRAN RFL`) + active switch.
4. Status toggle implemented as full POST (`save`) with `active` flipped (no PATCH exists for customers).

### Purchase Orders — list, filters, line-item form (`/purchase-orders`)
1. **`types/purchaseOrder.ts`** — `PurchaseOrder` (with `perlines`), `PurchaseOrderPage`, `PurchaseOrderQuery` (`overallStatus/fromDate/toDate`), `PurchaseOrderSaveDto` (with `lines`).
2. **`api/purchaseOrderApi.ts`** — ⚠️ `getAll` returns `response.data` (raw page, no envelope — verified live); the rest use the envelope.
3. **`PurchaseOrderListPage.tsx`** — status (All/Pending/Completed) + from/to date filters, pagination, table (PO Number, Document Number, Date, Total Qty, Total Amount, Status pill Completed/Pending/N/A, Edit/Delete).
4. **`PurchaseOrderFormModal.tsx`** — header fields (PO number, transaction date defaulting to today, status select, note) + **line-items editor**: rows of product `<select>` (`sku — name`, from `productApi.getAll({limit:1000})`), qty, unit price, remove button, "Add line"; live per-line totals + running total qty/amount in `<tfoot>`; saves only valid lines (productId + qty > 0); edit mode prefills from `perlines`.
5. **`navItems.ts`** + **`App.tsx`** — added "Transactions » Purchase Orders" group and `/purchase-orders` route.

### Verification runs performed
- `npm run build` (tsc + vite) passes clean (no TS errors).
- `npm run lint` passes (4 harmless `react(set-state-in-effect)` warnings from the standard fetch pattern — expected, not errors).
- Live curl checks against `:8086`: categories 200, products+keyword 200, customers+status 200, purchase-orders+overallStatus 200, CORS headers present.

---

## 8. Improvement sections

### 8.1 Parking lot (needs backend first — do not start)
- Real **Dashboard** with live numbers (currently a "Coming soon" placeholder).
- **Sales Orders** screen (there is no `/sales-orders` yet).
- **Current Stock** page (needs stock/transaction endpoints).
- **Auth/login** — the topbar user is hard-coded `"Admin"`; no guards, no token, no session.
- Anything in `frontend-phase1-task-breakdown.md` §Parking lot.

### 8.2 Short-term UX hardening (frontend-only, do anytime)
- **Modal polish**: close on Escape, backdrop-click to close, prevent background scroll, focus trap + `aria` refinement.
- **Toast notifications** instead of (or in addition to) inline alerts for save/delete success.
- **Debounced keyword search** (currently Apply-button-driven; a 300ms debounce would feel snappier).
- **Pagination page numbers**, not just Prev/Next (page shape gives `totalRecords`/`limit`).
- Filter **count/summary** chips ("x of y filtered") and clear-on-empty behavior.

### 8.3 Medium-term engineering
- **React Router lazy loading** (`React.lazy` + `Suspense`) — currently one big bundle (~356 kB), code-split per page.
- **Shared form skeleton / form fields abstraction** — the 4 modals repeat the same save/cancel/error/spinner wiring; a `<ModalShell>` + `useSaveForm` hook would remove ~40% of duplication.
- **API layer**: add a typed `useApiQuery`-style hook or switch to TanStack Query once cross-page data sharing is needed (e.g. category select on multiple pages).
- **Envelope normalization** — make `axiosClient` strip the envelope for *all* endpoints (including the odd PO list) so call sites are uniform.
- **Currency/date helpers** — one module for `Intl.NumberFormat` and date formatting instead of per-page constants.
- **Environment files** — commit `.env.example` with `VITE_API_BASE_URL`; stop inlining the port in source.
- **Error boundary** around routed pages + a friendly 404 route.

### 8.4 Backend alignment (for the API owner)
- Fix the **PO list endpoint to return the standard envelope** (or document the raw shape officially).
- Make **category delete use `DELETE`** to match the other entities.
- Rename **`perlines` → `lines`** consistently, or accept a write-side DTO name (`lines`) documented clearly.
- Standardize **`createdAt`/`updatedAt` format** (ISO 8601 with zone everywhere).
- Add **status PATCH for customers** and **status PATCH for categories** to match the product pattern.
- Consider a **pagination/sort contract** shared across all list endpoints (`page`/`size` + `sort` vs current `start`/`limit`).

### 8.5 Testing & quality (currently none)
- Add **Vitest + React Testing Library**: CRUD modal save paths, filter→query mapping (`toQuery`), interceptor error mapping.
- Add **Playwright** smoke test: navigate all sidebar routes against a stubbed backend.
- Introduce typed **mocks of the API layer** so pages can be tested without the live server.

---

## 9. How to add a new page (the payoff of `navItems.ts`)

1. Add types → `src/types/*.ts` (mirror backend JSON exactly).
2. Add API wrapper → `src/api/*Api.ts` (check envelope vs raw returns!).
3. Add page + form modal under `src/pages/...`.
4. One line in `navItems.ts` (group + item) and one `<Route>` in `App.tsx`.
5. Done — do **not** touch `Sidebar.tsx`, `Topbar.tsx`, or `AppLayout.tsx`.

New entity template: copy `pages/categories/CategoryListPage.tsx` + `CategoryFormModal.tsx` — they are the minimal, cleanest CRUD example.