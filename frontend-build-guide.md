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
| Purchase Order list (runtime search) + detail page + line-item CRUD | Done (Milestones 5–7) |
| Sales Order list (runtime search + expandable rows) + form page (returns, discounts) + detail page | Done (Milestones 5–7) |
| Shared components (`SearchableSelect`, `ProductPickerModal`) + `orderMath` lib | Done (Milestone 5) |
| Backend integration (live on `http://localhost:8086/api`) | Working, CORS configured |
| Auth / login | Not started (parking lot) |
| Dashboard with real numbers | Placeholder only ("Coming soon") |
| Current Stock screen | Not started (needs backend) |

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
  App.tsx                       # BrowserRouter + routes (incl. detail routes)
  index.css                     # custom layout CSS (topbar/sidebar/breadcrumb, .page-title, .searchable-select-dropdown)
  components/
    StatusBadge.tsx             # Active/Inactive pill
    SearchableSelect.tsx        # type-to-filter dropdown select (shared; used by SO form + SO/PO list filters)
    ProductPickerModal.tsx      # modal product picker with search (shared; used by SO form line editor)
  lib/
    orderMath.ts                # round2/round4, formatMoney/formatPercent, discount + line/order totals math (shared; used by all Sales Order screens)
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
    saleOrderApi.ts
  types/
    api.ts                      # ApiResponse<T> envelope
    category.ts
    product.ts
    customer.ts
    purchaseOrder.ts
    saleOrder.ts                # SalesOrder + perlines + SaveDto + Query + ResponseDto (lighter envelope)
  pages/
    Dashboard.tsx               # placeholder ("Coming soon")
    categories/CategoryListPage.tsx + CategoryFormModal.tsx
    products/ProductListPage.tsx + ProductFormModal.tsx
    customers/CustomerListPage.tsx + CustomerFormModal.tsx
    purchase-orders/PurchaseOrderListPage.tsx + PurchaseOrderFormModal.tsx + PurchaseOrderDetailPage.tsx
    sales-orders/SalesOrderListPage.tsx + SalesOrderFormPage.tsx + SalesOrderDetailPage.tsx
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
| GET | `/purchase-orders?start&limit&keyword&overallStatus&fromDate&toDate` | ⚠️ **returns the page RAW, NO envelope** (same as sales-orders list) |
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

### 5.5 Sales Orders — `/sales-orders`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/sales-orders?start&limit&keyword&overallStatus&orderType&customerId&fromDate&toDate` | ⚠️ **returns the page RAW, NO envelope** (same as PO list) |
| GET | `/sales-orders/{id}` | ⚠️ lighter envelope `{ message, data }` → single |
| POST | `/sales-orders` | create; returns `{ message, data }` where `data` = **new id** (used to navigate to detail page) |
| PUT | `/sales-orders/{id}` | ⚠️ **update is PUT here** (unlike categories/PO which use POST) |
| DELETE | `/sales-orders/{id}` | |
| POST | `/sales-orders/{id}/complete` | ⚠️ posts stock; confirmed via `window.alert(result.message)` — cannot be undone |

```jsonc
// GET list record (raw page)
{ "salesOrderId": 5, "documentNumber": "SO092600001", "reference": null, "orderDate": "2026-09-19",
  "customerId": 3, "customerType": "PRAN RFL", "orderType": "SALE", "originalSalesOrderId": null,
  "totalQuantity": 12, "discountAmount": null, "discountPercentage": null, "totalAmount": 60000.0,
  "overallStatus": "Pending", "note": null, "deliveryAddress": null, "contactPersonMobileNumber": null,
  "createdBy": 1, "createdAt": "2026-09-19T...",
  "perlines": [ { "id": 9, "productId": 12, "productCode": "83051", "productName": "Barrel Samrat",
                  "quantity": 12, "unitOfMeasure": "Piece", "basePrice": 2040.0,
                  "discountAmount": null, "discountPercentage": null, "unitPrice": 2040.0,
                  "extendedPrice": 24480.0, "netAmount": 24480.0 } ] }

// POST/PUT body (prices are NOT sent — backend re-resolves from product master; only discounts are sent)
{ "orderDate": "2026-09-19", "customerId": 3, "customerType": "PRAN RFL", "orderType": "SALE",
  "reference": null, "note": null, "deliveryAddress": null, "contactPersonMobileNumber": null,
  "originalSalesOrderId": null,
  "lines": [ { "productId": 12, "quantity": 12, "discountAmount": null, "discountPercentage": null } ] }
```

`overallStatus` is only `'Pending' | 'Completed'` (no third state; `overallStatus: null` never occurs for sales orders, unlike POs). `orderType` is `'SALE' | 'RETURN'`. Completing a SALE posts stock; the UI offers "Create return" only on completed SALEs.

### 5.6 API quirks to respect (do NOT "fix" these silently)

1. **PO list AND sales-orders list have no envelope** (both return the page RAW); customer/product/category lists and PO single/get/save/delete DO have the full envelope → `purchaseOrderApi.getAll()` and `saleOrderApi.getAll()` return `response.data` (the raw page), every other list returns `response.data.data`.
2. **Sales-orders single/save/complete/delete use a LIGHTER envelope** — `{ message, data }` only (`ResponseDto<T>` in `types/saleOrder.ts`), NOT the full `ApiResponse` (`status/success/debugHint/errors`). Don't check `success` on these; check `data === null` after create instead.
3. **Category delete is `POST /product-categories/{id}`**, not `DELETE` (all other deletes are `DELETE`).
4. **Sales order update is `PUT /sales-orders/{id}`** (unlike category/PO create-or-update via POST).
5. **Sales order complete is `POST /sales-orders/{id}/complete`** — posts stock, irreversible.
6. Backend spells line items **`perlines`** on read but **`lines`** on write (both PO and SO). Typed separately on purpose.
7. **SO write body does NOT send prices** — the backend re-resolves `basePrice` from the product master at save time and recalculates all amounts. Only `productId`, `quantity`, and the line discount (`discountAmount` XOR `discountPercentage`) are sent. The edit-mode UI warns "Prices are refreshed from the product master and all amounts recalculated when you save."
8. `createdAt` formats are inconsistent across entities (`2026-09-17 07:48:29` vs ISO `2026-09-18T20:24:06.554978`); SO list just slices to 10 chars for display.
9. `GET /products/{id}` example shows `perlines` items can come back with `productName`/`productCode` null → the PO edit modal re-resolves names from the loaded product list.
10. PO `transactionDate` is a plain `YYYY-MM-DD`; the date input uses it directly. SO `orderDate` likewise.
11. Customer `customerType` values: master data uses `PRAN RFL` / `MAHTAB MACHINERIES`; the SO form's type select offers `PRAN RFL` / `PERSONAL` and auto-fills from the chosen customer's `customerType`.

---

## 6. Global conventions (what every page/API file follows)

- **`types/api.ts`** — `ApiResponse<T>` = `{ status, message, data, debugHint, errors, success }`. Every DTO interfaces *mirror the backend JSON field names exactly* (snake_case included).
- **`api/axiosClient.ts`** — single instance; **response interceptor**:
  - if body has `success === false` → reject with a readable `Error` (message from `message`, else first `errors` item, else fallback);
  - on HTTP error → reject with `error.response.data.message` / `errors` / status fallback;
  - network/timeout → "Network error" / "Request timed out".
  - Result: pages render backend validation messages (e.g. "A category with this name already exists...") as an on-screen red alert — no raw `alert()`.
- **Two filter patterns coexist — know which one a page uses**:
  - **Apply/Reset pattern** (older): Products + Customers list pages. `draft` state bound to inputs, `filters` state drives the query; Apply copies draft→filters, Reset resets both. Form `onSubmit` prevents default.
  - **Runtime search pattern** (current, same design as Sales Orders — Milestone 7): Purchase Orders list (and Sales Orders list). NO Apply/Reset buttons, NO draft state. A single `filters` state + `updateFilters(patch)` helper (which also resets `start` to 0) — every change fires the query immediately. Plus a debounced `keyword`: `keyword` state updates on each keystroke, a 400ms `setTimeout` effect syncs it into `debouncedKeyword` (trimmed); `toQuery(filters, debouncedKeyword, start, limit)` includes `keyword` only when non-empty; keyword input `onChange` also resets `start`. Filter form is a `<form onSubmit={(e) => e.preventDefault()}>` wrapper card with the search input-group (`.bi-search` icon) first, then the selects/date inputs.
- **List page pattern** (all list pages follow it): `useState` records/loading/error/total → `useCallback` fetch fn → `useEffect` on the fetch fn (whose deps are `[filters, debouncedKeyword, start, limit]`) → loading spinner / empty state / error alert → Bootstrap `table table-hover` → Prev/Next pagination from `start`/`limit`/`totalRecords` + page-size `<select>` (10/20/50/100) → conditionally-rendered modal.
- **Expandable-row pattern** (Sales Orders list): each row is a `<Fragment key={id}>` wrapping the main `<tr>` (row click navigates) + a chevron `<button>` in the first cell (`event.stopPropagation()`; toggles `expandedIds: number[]`) +, when expanded, a second `<tr>` with `colSpan={11}` containing a nested striped line-items table. Actions cell also calls `stopPropagation()`.
- **Modal pattern** (PO + master-data pages): mounted only when `showForm` is true; parent passes `key={editing?.id ?? 'new'}` so the form's `useState` initializers re-run on open. Rendered as `modal fade show d-block` + sibling `.modal-backdrop` (no Bootstrap JS). Save button shows inline spinner. Backend messages appear inside the modal.
- **Full-page form pattern** (Sales Order form — `SalesOrderFormPage.tsx`): routed page, not a modal. Three cards: order details / line items / order discount + totals summary card. Uses `useParams` (`id` → edit mode) + `useSearchParams` (`?original={id}&customer={id}` → RETURN prefill). Edit/RETURN lock type + customer. After save, navigates to the detail page passing `{ state: { message } }` which the detail page renders as a green flash alert. All totals math lives in `lib/orderMath.ts` (NOT in the component).
- **`lib/orderMath.ts`** — shared, pure, typed helpers: `round2/round4`, `formatMoney`/`formatPercent` (`—` for null), `discountFromMode` / `lineDiscountResult` (discount can be flat amount XOR percentage; percentage clamped 0–100), `computeLineTotals` (unitPrice = base − discount; extendedPrice = base × qty; netAmount = unitPrice × qty), `computeOrderTotals` (order-level discount applied on line-net subtotal), `modeFromDto` (rebuilds `{mode, value}` from the saved DTO for edit mode).
- **`SearchableSelect`** (`components/SearchableSelect.tsx`) — shared type-to-filter dropdown: controlled `<input>` + absolutely-positioned `list-group.searchable-select-dropdown` (custom CSS in `index.css`), client-side filtering capped at 100 options, click-outside + Escape to close, `disabled` renders a plain read-only `form-control`. Props: `options {value,label}[]`, `value: number|null`, `onSelect(value, label)`, `placeholder`, `ariaLabel`, `disabled`.
- **`ProductPickerModal`** (`components/ProductPickerModal.tsx`) — shared modal product picker: search input (auto-focus on open), scrollable list-group capped at 100 options with a "showing first N of M" hint, checkmark on the currently selected row, backdrop click + Escape to close. Used by the SO form line editor (each line opens it; already-picked products are filtered out of the options for that line).
- **Status toggle**: dedicated PATCH for products; for customers it is a full POST (`save`) with `active` flipped.
- **Delete**: `window.confirm` then the API call; backend errors surface as the on-page alert. PO/SO delete + SO complete also `window.alert` the backend's returned `message` on success.
- **Detail pages** (`PurchaseOrderDetailPage.tsx`, `SalesOrderDetailPage.tsx`): `useParams` id → `getById`; header with status/type badges + Back / Edit / Delete (Pending only) / Complete (SO only) / Create return (completed SO SALE only) buttons; `<dl className="row">` metadata card; line-items table card; right-aligned totals card. Invalid/non-numeric id → error + back button. PO detail renders the edit modal in place (`showEdit` state).
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

### Milestone 5 — Purchase Orders: list, line-item form, detail page (`/purchase-orders`)
1. **`types/purchaseOrder.ts`** — `PurchaseOrder` (with `perlines`), `PurchaseOrderPage`, `PurchaseOrderQuery` (`start/limit/keyword/overallStatus/fromDate/toDate`), `PurchaseOrderSaveDto` (with `lines`).
2. **`api/purchaseOrderApi.ts`** — ⚠️ `getAll` returns `response.data` (raw page, no envelope — verified live); `getById`/`save` unwrap the envelope; `remove` is DELETE.
3. **`PurchaseOrderListPage.tsx`** — initially status (All/Pending/Completed) + from/to date filters with Apply/Reset buttons; table (PO Number, Document Number, Date, Total Qty, Total Amount, Status pill Completed/Pending/N/A, View/Edit/Delete). Row click navigates to `/purchase-orders/{id}` (with keyboard Enter support). **Later converted to the runtime search pattern in Milestone 7.**
4. **`PurchaseOrderFormModal.tsx`** — header fields (PO number, transaction date defaulting to today, status select, note) + **line-items editor**: rows of native product `<select>` (`sku — name`, from `productApi.getAll({limit:1000})` — deliberately a plain select, NOT `ProductPickerModal`), qty, unit price, remove button, "Add line"; live per-line totals + running total qty/amount in `<tfoot>`; saves only valid lines (productId + qty > 0); edit mode prefills from `perlines`. Used by both the list page and the detail page.
5. **`PurchaseOrderDetailPage.tsx`** — read-only detail: header (doc no. + status badge + date), Back / Edit (opens the modal in place) / Delete (Pending only; "Completed — read only" label otherwise), `<dl>` metadata (PO number, document no., date, status, note, created), perlines table (Code, Product, Qty, Unit price, Amount with `perlineTotalAmount ?? unitPrice * quantity` fallback), totals card.
6. **`navItems.ts`** + **`App.tsx`** — added "Transactions » Purchase Orders" group, `/purchase-orders` list route and `/purchase-orders/:id` detail route.

### Milestone 6 — Sales Orders: list, form page, detail page (`/sales-orders`)
1. **`types/saleOrder.ts`** — `SalesOrder` + `SalesOrderPerline` (basePrice/discount/unitPrice/extendedPrice/netAmount), `SalesOrderPage`, `SalesOrderQuery` (`keyword/overallStatus/orderType/customerId/fromDate/toDate`), `SalesOrderSaveDto`, `ResponseDto<T>` (lighter `{message, data}` envelope), `SALE_ORDER_TYPES` + `DiscountMode` consts.
2. **`api/saleOrderApi.ts`** — `getAll` (raw page, like PO), `getById`, `create`, `update` (**PUT**), `remove`, `complete` (**POST /{id}/complete**).
3. **`lib/orderMath.ts`** — extracted shared math: rounding, money/percent formatting, line + order discount/totals computation, `modeFromDto`. All SO screens import from here (single source of truth for the discount rules).
4. **`SalesOrderListPage.tsx`** — runtime search from day one: debounced keyword + status (All/Pending/Completed) + type (All/SALE/RETURN) + customer `SearchableSelect` (with clear button) + from/to date filters with from>to validation; table (expander chevron, Doc. No., Reference, Date, Customer, Type badge, Qty, Total, Status badge, Created, Actions) with the expandable-rows pattern (nested `SalesOrderLines` table, colSpan=11); row actions: View, Edit + Complete + Delete (Pending), Create return (completed SALE); page-size select + Prev/Next.
5. **`SalesOrderFormPage.tsx`** — full-page routed form (NOT a modal), triple-mode via route/query params: New (`/sales-orders/new`), Edit (`/sales-orders/:id/edit`), Create Return (`/sales-orders/new?type=RETURN&original={id}&customer={id}`):
   - Order details card: type select (locked on edit/return), customer `SearchableSelect` (locked on edit/return; auto-fills `customerType`), customer type select (`PRAN RFL`/`PERSONAL`), order date (defaults today), reference (≤100), contact mobile (≤20), delivery address, note; RETURN-only "Original completed sale" `SearchableSelect` (candidates = customer's Completed SALEs, fetched live when customer changes; selecting one pre-fills lines from its `perlines` and shows a returnable-quantity hint).
   - Line items card: rows with a "Select product" button that opens `ProductPickerModal` (or the picked label + clear button), qty, per-line `DiscountField` (None / Per unit / % mode toggle), read-only base/unit/net columns, remove line (disabled at 1 line), live Subtotal in `<tfoot>`; products already picked on other lines are filtered out of the picker options.
   - Order discount card: order-level `DiscountField` + totals summary (Total quantity, Subtotal, Discount, Total).
   - `DiscountField` is a local subcomponent: `btn-group` mode toggle (none/amount/percentage) + conditional number input (step 0.0001 for %).
   - Client-side `validate()` returns a list of errors (joined with `\n` into one alert): required date/customer/original-for-return, ≥1 line, no duplicate products, qty > 0, line discount ≤ base price (amount mode) / 0–100 (% mode), order discount ≤ subtotal / 0–100, string length caps.
   - Submit: sends only `productId`/`quantity`/discount per line (**no prices** — backend re-resolves); create navigates to `/sales-orders/{result.data}` with a flash message; update navigates back to the detail page (replace).
6. **`SalesOrderDetailPage.tsx`** — detail: header (doc no. + status/type badges + order date), Back / Edit / Complete / Delete (Pending) or Create return (completed SALE); green flash alert from `location.state.message` (set by the form after save); `<dl>` metadata (reference, customer + type, order type, link back to the original sale for returns, contact, delivery address, note, created); perlines table (Code, Product, Qty, UoM, Base price, Discount, Unit price, Extended, Net); totals card (subtotal reconstructed as `totalAmount + discountAmount` for display).
7. **`navItems.ts`** + **`App.tsx`** — added "Sales Orders" + "New Sales Order" items and the `/sales-orders`, `/sales-orders/new`, `/sales-orders/:id`, `/sales-orders/:id/edit` routes.

### Milestone 7 — Runtime search applied to Purchase Orders (latest work)
1. Converted **`PurchaseOrderListPage.tsx`** to the Sales-Orders runtime search design, at the owner's request ("apply Sales order list searching mechanism to purchase order. no apply and reset btn. same design"):
   - Removed the `draft`/`filters` split, `handleApply`, `handleReset`, and the Apply/Reset buttons entirely.
   - Added `keyword` + `debouncedKeyword` state with the same 400ms debounce effect as the SO list.
   - Single `filters` state + `updateFilters(patch)` helper (resets `start` to 0 on every change) — status/from/to now fire queries immediately.
   - `toQuery(filters, keyword, start, limit)` now takes the keyword and passes it as `query.keyword` (backend already supported it in `PurchaseOrderQuery`).
   - Added the Search input first in the filter row: label `Search`, `input-group` with `bi-search` icon, `id="poKeyword"`, placeholder "PO number or document no...", grid widened to the SO layout (`col-lg-3 col-md-4` for search, `col-lg-2` selects/dates).
   - Form is now a no-op `<form onSubmit={(event) => event.preventDefault()}>` (keyword change also resets `start` inline).
2. Verified: `npx tsc --noEmit` passes clean (exit 0). Note: the project has no ESLint config (only oxlint in devDependencies; `npm run lint` = oxlint).

### Verification runs performed
- `npm run build` (tsc + vite) passes clean (no TS errors); `npx tsc --noEmit` also passes after the runtime-search conversion.
- `npm run lint` = oxlint passes (harmless `react(set-state-in-effect)` warnings from the standard fetch/debounce pattern — expected, not errors). There is NO ESLint config in the project; do not install/ad-hoc run ESLint.
- Live curl checks against `:8086`: categories 200, products+keyword 200, customers+status 200, purchase-orders+overallStatus 200, CORS headers present.

---

## 8. Improvement sections

### 8.1 Parking lot (needs backend first — do not start)
- Real **Dashboard** with live numbers (currently a "Coming soon" placeholder).
- **Current Stock** page (needs stock/transaction endpoints).
- **Auth/login** — the topbar user is hard-coded `"Admin"`; no guards, no token, no session.
- Anything in `frontend-phase1-task-breakdown.md` §Parking lot.

### 8.2 Short-term UX hardening (frontend-only, do anytime)
- **Modal polish**: close on Escape/backdrop-click (done for `ProductPickerModal`/`SearchableSelect`; the CRUD modals still lack it), prevent background scroll, focus trap + `aria` refinement.
- **Toast notifications** instead of (or in addition to) inline alerts for save/delete success.
- **Runtime search for Products + Customers lists** (they still use the older Apply/Reset pattern; the Sales Orders + Purchase Orders lists already use the debounced runtime search pattern — Milestone 7 documents the conversion recipe).
- **Pagination page numbers**, not just Prev/Next (page shape gives `totalRecords`/`limit`).
- Filter **count/summary** chips ("x of y filtered") and clear-on-empty behavior.
- **PO line editor could adopt `ProductPickerModal`** (currently a native `<select>`; the SO form already uses the picker).

### 8.3 Medium-term engineering
- **React Router lazy loading** (`React.lazy` + `Suspense`) — currently one big bundle, code-split per page.
- **Shared form skeleton / form fields abstraction** — the 4 modals + the SO full-page form repeat the same save/cancel/error/spinner wiring; a `<ModalShell>` + `useSaveForm` hook + a shared `DiscountField` component (currently local to `SalesOrderFormPage.tsx`) would remove ~40% of duplication.
- **API layer**: add a typed `useApiQuery`-style hook or switch to TanStack Query once cross-page data sharing is needed (e.g. category select on multiple pages; customers list is fetched on 3 different screens today).
- **Envelope normalization** — make `axiosClient` strip the envelope for *all* endpoints (including the raw PO/SO lists and the lighter SO `{message,data}` responses) so call sites are uniform.
- **Currency/date helpers** — `lib/orderMath.ts` already has `formatMoney`/`formatPercent`; PO pages still define their own `currencyFormat` constant — consolidate.
- **Environment files** — commit `.env.example` with `VITE_API_BASE_URL`; stop inlining the port in source.
- **Error boundary** around routed pages + a friendly 404 route.

### 8.4 Backend alignment (for the API owner)
- Fix the **PO list AND sales-orders list endpoints to return the standard envelope** (or document the raw shape officially).
- Return the **full `ApiResponse` envelope** from sales-orders single/save/complete/delete (currently the lighter `{message,data}`).
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
2. Add API wrapper → `src/api/*Api.ts` (check envelope vs raw returns — and whether save/update uses POST or PUT!).
3. Add page + form modal (or full-page form) under `src/pages/...`.
4. One line in `navItems.ts` (group + item) and one `<Route>` in `App.tsx`.
5. Done — do **not** touch `Sidebar.tsx`, `Topbar.tsx`, or `AppLayout.tsx`.

Templates:
- Minimal CRUD entity (modal form, Apply/Reset filters): copy `pages/categories/CategoryListPage.tsx` + `CategoryFormModal.tsx`.
- List with runtime search + detail page: copy `pages/purchase-orders/PurchaseOrderListPage.tsx` + `PurchaseOrderDetailPage.tsx` (runtime search pattern from Milestone 7, including the debounced keyword).
- Complex transactional entity (expandable list rows, full-page form, returns, discounts): copy the `pages/sales-orders/` trio.

### Runtime search pattern — copy/paste recipe (Milestone 7)

```tsx
// 1. State: single filters object + debounced keyword (NO draft, NO Apply/Reset)
const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
const [keyword, setKeyword] = useState('')
const [debouncedKeyword, setDebouncedKeyword] = useState('')
const [start, setStart] = useState(0)

// 2. 400ms debounce effect
useEffect(() => {
  const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
  return () => clearTimeout(timer)
}, [keyword])

// 3. Filter change helper — resets pagination on every change
const updateFilters = (patch: Partial<Filters>) => {
  setFilters((current) => ({ ...current, ...patch }))
  setStart(0)
}

// 4. Query builder includes keyword only when non-empty
function toQuery(filters: Filters, keyword: string, start: number, limit: number): XQuery {
  const query: XQuery = { start, limit }
  if (keyword) query.keyword = keyword
  if (filters.overallStatus) query.overallStatus = filters.overallStatus
  if (filters.fromDate) query.fromDate = filters.fromDate
  if (filters.toDate) query.toDate = filters.toDate
  return query
}

// 5. Fetch callback deps: [filters, debouncedKeyword, start, limit]
const load = useCallback(async () => {
  const page = await api.getAll(toQuery(filters, debouncedKeyword, start, limit))
  // ...
}, [filters, debouncedKeyword, start, limit])

// 6. Search input — keyword change resets start inline; form onSubmit prevents default only
<form className="card border-0 shadow-sm mb-3" onSubmit={(event) => event.preventDefault()}>
  <input
    type="text" className="form-control"
    placeholder="..."
    value={keyword}
    onChange={(event) => { setKeyword(event.target.value); setStart(0) }}
  />
</form>
```

Reference implementations: `SalesOrderListPage.tsx` (with customer filter + expandable rows) and `PurchaseOrderListPage.tsx` (minimal version).