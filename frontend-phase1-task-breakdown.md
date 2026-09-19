# Frontend Build Plan — Sidebar Shell → First Working CRUD List

No code in this file on purpose — this is the map. Each task below is written so you can paste just that one block (plus the "Tech decisions" and "Folder structure" sections) into me, into another Claude/ChatGPT/Gemini chat, or into the YouTube video's approach, and get one working piece back. Do them in order — each one assumes the previous ones exist.

---

## Tech decisions (settled — don't re-decide per task)

- **Vite + React, TypeScript** (`.tsx`/`.ts`). Coming from a statically-typed Java background, TS's interfaces/types are a closer mental model than JS's loose typing — a wrong field name on a DTO shows up as a red underline in the editor instead of a silent `undefined` at runtime you have to hunt down. The trade-off: a handful of TS-specific things to learn on top of React itself — typing component props, typing event handlers on inputs, `useState<T>`. Keep Vite's default `strict: true` tsconfig rather than loosening it — it's closer to what you're used to from Java than a permissive config would be.
- If the YouTube tutorial you're watching is plain JavaScript, that's fine — TypeScript is a superset. Follow its React logic/structure (components, hooks, routing) and just add the type annotations yourself; you can't copy-paste its code unchanged, but you don't need a different tutorial.
- **react-router-dom** for page navigation (sidebar click → content area changes, URL changes, no full reload). Ships its own TS types — no extra `@types/...` package needed.
- **axios** for calling the backend. Also ships its own TS types.
- **Bootstrap 5 via CDN** (`<link>` tag in `index.html`) for styling — tables, buttons, modals, form inputs all come pre-styled. No component library to learn (no MUI, no Ant Design), no build config.
- **No Redux/Context yet.** Plain `useState`/`useEffect` per page is enough for phase 1.
- Backend base URL assumed to be `http://localhost:8080/api` — confirm your actual port, and confirm Spring Boot CORS allows `http://localhost:5173` (Vite's default dev port) before Task 1 — a missing CORS config is the #1 cause of a confusing "network error" for anyone at this stage.

## Folder structure (target — grows one file at a time as you do each task)

```
src/
  types/
    category.ts              # TS interfaces mirroring the backend DTOs/entities
    product.ts
    customer.ts
  api/
    axiosClient.ts            # one shared axios instance (base URL, headers)
    categoryApi.ts
    productApi.ts
    customerApi.ts
  layout/
    AppLayout.tsx             # wraps Sidebar + Topbar + page content
    Sidebar.tsx
    Topbar.tsx
    navItems.ts                # single array driving the sidebar links — adding a page later = one line here
  pages/
    Dashboard.tsx              # empty placeholder for now
    categories/
      CategoryListPage.tsx
      CategoryFormModal.tsx
    products/
      ProductListPage.tsx
      ProductFormModal.tsx
    customers/
      CustomerListPage.tsx
      CustomerFormModal.tsx
  App.tsx                      # routes
  main.tsx                     # entry point
```

## Visual target for the shell (from your two screenshots)

- Top bar: dark blue, full width. Left side: small logo + app name, then a hamburger icon that collapses/expands the sidebar. Under the top bar, a thin breadcrumb row (home icon `/` current page name). Right side: a search icon, then the logged-in user's name + a circular avatar.
- Sidebar: light grey background, narrower than the content area. Items grouped under small uppercase grey section headers (like "SYLLABUS", "EXAM MANAGEMENT" in your screenshot). Each item has an icon + label. Items that expand into sub-items show a chevron on the right. The active item has a light-grey highlighted background.
- Content area: white background, page title top-left, breadcrumb under it, then the page's own content (a table, a filter bar, whatever the page needs).
- Keep it **plain** — no gradients, no animation, just the structure. Polish comes later, once it works.

---

## Milestone 0 — Project bootstrap

**Task 0.1 — Scaffold the project**
- Goal: empty Vite + React (TypeScript) project that runs.
- Files: whole new project folder.
- Depends on: nothing.
- Done when: `npm create vite@latest` (choose the **React + TypeScript** template) → `npm install` → `npm run dev` shows the default Vite welcome page in the browser.

**Task 0.2 — Install dependencies**
- Goal: add the libraries this whole plan uses.
- Files: `package.json`.
- Depends on: 0.1.
- Done when: `npm install react-router-dom axios` succeeds (no extra `@types/...` packages needed — both ship their own); Bootstrap 5's CDN `<link>` and `<script>` tags are added to `index.html`'s `<head>`/before `</body>`.

**Task 0.3 — Confirm backend reachability**
- Goal: make sure the browser can actually call the Spring Boot API before building any UI around it.
- Files: none (just a manual check, or a throwaway test call).
- Depends on: 0.2, and the backend running locally.
- Done when: opening `http://localhost:8080/api/product-categories` directly in the browser (or via Postman/curl) returns JSON, and CORS is configured on the backend to allow `http://localhost:5173`.

---

## Milestone 1 — Static app shell (no data yet, matches the screenshots)

**Task 1.1 — Build the layout skeleton**
- Goal: `Topbar` + `Sidebar` + a content area, all static/hard-coded, matching the "Visual target" section above.
- Files: `layout/AppLayout.tsx`, `layout/Sidebar.tsx`, `layout/Topbar.tsx`, `layout/navItems.ts`.
- Depends on: Milestone 0.
- Backend endpoints used: none yet.
- Done when: the page shows a top bar and sidebar with these groups/items (rest are placeholders for now, greyed out or simply not there yet):
  - **Dashboard** (no group header, top item — like "Home" in your screenshot)
  - **MASTER DATA**: Products, Categories, Customers
- `navItems.ts` holds this as a plain typed array (e.g. `{ group: string; label: string; path: string; icon: string }[]`) — this is the file every future "add a new page" task will touch.

**Task 1.2 — Wire up routing**
- Goal: clicking a sidebar item actually navigates and swaps the content area.
- Files: `App.tsx`, `main.tsx`, plus one empty placeholder component per page (`pages/Dashboard.tsx`, `pages/categories/CategoryListPage.tsx`, `pages/products/ProductListPage.tsx`, `pages/customers/CustomerListPage.tsx` — each just returns a `<h2>Coming soon</h2>` for now).
- Depends on: 1.1.
- Done when: clicking each sidebar item changes the URL and the content area, without a full page reload; refreshing the browser on `/products` (say) still loads the Products placeholder, not a 404.

**Task 1.3 — Sidebar collapse + active-item highlight**
- Goal: hamburger icon toggles the sidebar between expanded/collapsed; whichever nav item matches the current route gets the highlighted style.
- Files: `layout/Sidebar.tsx`, `layout/Topbar.tsx`.
- Depends on: 1.2.
- Done when: clicking the hamburger visibly collapses/expands the sidebar; navigating to a page visibly highlights the matching sidebar item and no other.

*(Checkpoint: at the end of Milestone 1 you have exactly what's in your first screenshot — a working shell — with three empty placeholder pages behind it.)*

---

## Milestone 2 — First real CRUD: Product Category

*(Simplest entity — no dropdown dependencies — and the backend is already built for it.)*

**Task 2.1 — Types + API wrapper for categories**
- Goal: a TS interface matching the backend's category shape, plus one file with typed functions for every category operation, so pages never call axios directly.
- Files: `types/category.ts`, `api/axiosClient.ts` (shared instance, base URL), `api/categoryApi.ts`.
- Depends on: Milestone 1.
- Backend endpoints used: `GET /api/product-categories`, `GET /api/product-categories/{id}`, `POST /api/product-categories`, `PUT /api/product-categories/{id}`, `PATCH /api/product-categories/{id}/status`, `DELETE /api/product-categories/{id}`.
- Done when: `Category` interface has `id`, `categoryName`, `description`, `active` (matching `ProductCategorySaveDto`/the entity); each function (`getAll`, `getById`, `create`, `update`, `updateStatus`, `remove`) is typed against it and can be called from the browser console (temporarily wired to a button) and logs a real response from the backend.

**Task 2.2 — Category list page**
- Goal: replace the placeholder with a real table: Name, Description, Status (Active/Inactive badge), Edit/Delete buttons per row.
- Files: `pages/categories/CategoryListPage.tsx`.
- Depends on: 2.1.
- Done when: the page shows a loading state while fetching, the real list once loaded, and a friendly empty state if there are zero categories.

**Task 2.3 — Create / edit form (modal)**
- Goal: a Bootstrap modal with Name, Description, Active toggle. Same modal handles both "create" (fields empty) and "edit" (fields pre-filled) depending on whether an id was passed in.
- Files: `pages/categories/CategoryFormModal.tsx`, small edit to `CategoryListPage.tsx` to open it (an "Add Category" button, and the row-level Edit button).
- Depends on: 2.2.
- Done when: saving a new category adds it to the list without a full page reload; editing an existing one updates it in place; the backend's validation messages ("A category with this name already exists...") show up as an on-screen error instead of a silent failure or a raw browser alert.

**Task 2.4 — Delete + status toggle**
- Goal: wire the Delete button (with a confirm dialog) and an Activate/Deactivate button per row.
- Files: `CategoryListPage.tsx`.
- Depends on: 2.3.
- Done when: deleting an unused category removes it from the list; deleting a category that's in use shows the backend's exact message ("used by N products, deactivate instead") instead of a generic error; toggling status flips the badge immediately.

*(Checkpoint: Categories are fully usable end to end. This is your template — Milestones 3 and 4 are the same four tasks again, on a different entity.)*

---

## Milestone 3 — Product CRUD

*(Same shape as Milestone 2, plus a category dropdown and search/pagination since the product list can get long — recall the sample report had 26+ line items.)*

**Task 3.1 — Types + API wrapper for products**
- Files: `types/product.ts`, `api/productApi.ts`.
- Backend endpoints used: `GET /api/products?keyword=&page=&size=`, `GET /api/products/{id}`, `POST /api/products`, `PUT /api/products/{id}`, `PATCH /api/products/{id}/status`, `DELETE /api/products/{id}`.
- Done when: `Product` interface matches the backend (`id`, `sku`, `productName`, `categoryId`, `unit`, `minStockLevel`, `active`); a typed `Page<Product>` shape (`content`, `totalPages`, etc. — Spring's default `Page` JSON) is handled correctly by the paginated `getAll` function.

**Task 3.2 — Product list page**
- Files: `pages/products/ProductListPage.tsx`.
- Depends on: 3.1.
- Done when: table shows SKU, Name, Category name, Unit, Min Stock, Status; a search box filters by name/SKU (calls the API with `keyword`, not a client-side filter); pagination controls (Prev/Next or page numbers) work.

**Task 3.3 — Create / edit form**
- Files: `pages/products/ProductFormModal.tsx`.
- Depends on: 3.2, and Milestone 2 (needs `categoryApi.getAll()` to populate the category `<select>`).
- Done when: same as 2.3, plus the category dropdown is populated from the live category list and submits `categoryId` correctly.

**Task 3.4 — Delete + status toggle**
- Files: `ProductListPage.tsx`.
- Depends on: 3.3.
- Done when: same as 2.4, surfacing the backend's "N stock transactions, deactivate instead" message on a blocked delete.

---

## Milestone 4 — Customer CRUD

*(Same four tasks again — by now this pattern should feel familiar even without deeply understanding every line.)*

**Task 4.1 — Types + API wrapper** → `types/customer.ts`, `api/customerApi.ts`, endpoints under `/api/customers` (same verb set as products).
**Task 4.2 — List page** → `pages/customers/CustomerListPage.tsx` — Name, Phone, Zone, Status; search + pagination.
**Task 4.3 — Create/edit form** → `pages/customers/CustomerFormModal.tsx` — no dropdown needed, simpler than the product form.
**Task 4.4 — Delete + status toggle** → surfaces "N sales orders, deactivate instead" on a blocked delete.

---

## Parking lot — not yet (needs backend work first)

Purchase Order screen, Sales Order screen, Current Stock page, real Dashboard numbers, login/auth. Don't start these until the corresponding backend piece exists — same rule you've been following on the backend side.

---

## How to add a page later (why `navItems.ts` matters)

Once Milestone 4 is done, adding e.g. a Purchase Order page is: one new entry in `navItems.ts`, one new route in `App.tsx`, one new page file, one new API wrapper (+ types) file — never touching `Sidebar.tsx`/`Topbar.tsx`/`AppLayout.tsx` again. That's the payoff of getting Milestone 1 right.

## Handing a single task to any AI

Paste: the "Tech decisions" section, the "Folder structure" section, and the one task block you want done. That's a complete, self-contained brief — no other context from this project is needed for that AI to produce working code for just that piece. Drop the returned file(s) exactly where the folder structure says.
