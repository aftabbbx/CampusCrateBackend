# CampusCrate — Change Log

All changes made to the project are documented here.

---

## [2026-06-14] — Mark as Sold Feature (Branch: feature/mark-as-sold)

### Backend

#### `src/models/Resource.js` — Updated
- Added `"Sold"` to `status` enum → now `["Available", "Pending", "Exchanged", "Sold"]`
- `Sold` = owner manually marks listing as sold (OLX-style)
- `Exchanged` = deal completed via platform request flow (unchanged)

#### `src/controllers/resource.controller.js` — Updated
- Added `markResourceSold` controller:
  - Owner-only (403 for non-owners)
  - Toggles `Available → Sold` and `Sold → Available`
  - Blocks toggle if resource is `Pending` or `Exchanged` (those are managed by request flow)
  - Returns updated resource

#### `src/routes/resource.routes.js` — Updated
- Added `PATCH /resource/:id/mark-sold` → owner-only toggle route

#### `src/controllers/message.controller.js` — Updated
- Added `Resource` import
- Added optional `resource_id` guard in `sendMessage`:
  - If `resource_id` provided in request body AND resource status is `Sold` → returns 403
  - Direct API hits with resource_id are blocked server-side

#### `/request/send` guard — already exists, no change needed
- Existing check `if (resource.status !== 'Available')` automatically blocks new requests for Sold resources

---

## [2026-05-31] — Backend + Frontend Setup & Fixes

### Backend

#### `.env` — Updated
- Added `JWT_SECRET`
- Added `JWT_EXPIRES_IN=7d`
- Added Brevo SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL)
- Added Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
- Updated MONGO_URI to use direct shard connection string (fixed IP whitelist issue)

#### `seed.js` — Created (root level)
- Inserts 5 dummy users using actual User model (with custom ID generator)
- Clears old users and counter before inserting
- All passwords: `password123`
- Users: rahul, priya, aman, sneha, vikram @college.com

#### `src/models/Resource.js` — Updated
- Added `is_deleted` field (Boolean, default: false) — for soft delete
- Added `deleted_at` field (Date, default: null)

#### `src/controllers/resource.controller.js` — Updated
- `getAllResources` — added `is_deleted: false` filter
- `getMyResources` — added `is_deleted: false` filter
- `searchResources` — added `is_deleted: false` filter
- `deleteResource` — changed from hard delete (`findByIdAndDelete`) to soft delete
  - Sets `is_deleted: true` and `deleted_at: new Date()` on the resource
  - Resource stays in DB, just hidden from all public queries

---

### Frontend

#### `src/pages/Dashboard.jsx` — Updated
- Added `Pencil`, `Trash2` icons from lucide-react
- Added `deletingId` state — tracks which resource is being deleted
- Added `deleteModal` state — controls confirmation modal visibility
- Added `handleDelete()` — opens modal instead of browser confirm()
- Added `confirmDelete()` — calls DELETE API, removes from UI on success
- Added Edit button per resource row — navigates to `/add-resource?edit=RSC-ID`
- Added Delete button per resource row — opens custom modal
- Added custom Delete Confirmation Modal UI
  - Shows resource name
  - Cancel button — closes modal
  - Yes Delete button — calls confirmDelete()
  - Click outside to close

#### `src/pages/resources/AddResource.jsx` — Updated
- Added `useEffect`, `useSearchParams` imports
- Removed `Link` import (was unused), re-added to fix crash
- Added `editId` — reads `?edit=` query param from URL
- Added `isEditMode` boolean
- Added `useEffect` — fetches existing resource data when in edit mode, pre-fills form
- `handleSubmit` — checks `isEditMode`:
  - Edit mode: calls `PUT /resource/update/:id`
  - Create mode: calls `POST /resource/create`
- Page title changes: "List a Resource" → "Edit Resource" in edit mode
- Submit button text changes: "List Resource" → "Update Resource" in edit mode
- Image URL preserved from existing resource if no new image selected

---

---

## [2026-05-31] — Dashboard Redesign (Coral + Navy theme)

Reference: furniture shopping app UI (clean white cards, coral accent, navy buttons, Poppins font).

### Frontend

#### `index.html` — Updated
- Added Poppins font to Google Fonts link (weights 400-800)

#### `src/pages/Dashboard.jsx` — Full Redesign
- New theme tokens: coral `#FF5C5C` (accent/price), navy `#242B3D` (action buttons), bg `#F6F7FB`, Poppins font
- Replaced resource **table** with a **card grid** (image + status pill + title + coral price + actions)
- Stat cards: calm style, single coral icon chip (removed multi-color icons)
- Added **skeleton loading** cards (replaced spinner)
- Redesigned empty state
- Primary buttons (Add Listing, View) → navy; coral reserved for price/accents/delete
- Delete confirmation modal restyled to match theme
- Responsive: 3 cols → 2 → 1 on mobile
- Backup saved at `src/pages/Dashboard.BACKUP.jsx`

> Note: This is the trial page. If approved, same theme to be applied across the whole project.

#### Whole-app theme aligned to ZIP reference (furniture app: coral + navy + Poppins)
Decision: match the furniture-shopping-app ZIP the user provided — clean coral accent, navy actions, cool light bg, Poppins font. Applied app-wide:

- `src/pages/Dashboard.jsx` — coral `#FF5C5C` accent, navy `#242B3D` actions, bg `#F6F7FB`, Poppins
- `src/pages/Homepage.jsx` — remapped `T` design tokens: terra→coral `#FF5C5C`, primary→navy `#242B3D`, bg→`#F6F7FB`, surface→white, cool borders
- `src/index.css` — global `--font-display` & `--font-body` → **Poppins** (whole app)
- `index.html` — Poppins font loaded from Google Fonts

---

---

## [2026-05-31] — Full App Theme Migration (Coral + Navy)

Applied coral `#FF5C5C` + navy `#242B3D` + Poppins font across entire frontend.

### Files Updated:
- `src/components/UserLayout.jsx` — CS tokens updated, font → Poppins, all hardcoded purple fixed
- `src/pages/resources/ExploreResources.jsx` — CS tokens updated
- `src/pages/resources/ResourceDetail.jsx` — CS tokens updated
- `src/pages/resources/AddResource.jsx` — CS tokens updated
- `src/pages/Notifications.jsx` — CS tokens updated
- `src/pages/Wishlist.jsx` — CS tokens updated
- `src/pages/admin/AdminDashboard.jsx` — indigo `#4f46e5` → coral
- `src/index.css` — all `--color-brand*` CSS variables → coral+navy. Affects: Profile, AuthPage, AdminLogin, Messages (which use `var(--color-brand)`)

### Homepage Space Optimization:
- Hero: `minHeight 90vh → 65vh`, `padding 5rem+4rem → 3rem+2.5rem`
- Hero heading: `5.5rem → 4rem`
- Navbar: always visible (was transparent on load)
- Nav links: dark (#242B3D) instead of muted grey
- Logo filter removed (was invisible on white navbar)
- Categories padding: `1.25rem 1.75rem → 0.9rem 1.25rem`
- Listings section: `4rem+5rem → 2.5rem+3rem`
- Features section: `5rem → 3rem`
- Features header margin: `3rem → 1.5rem`

---

## Pending / Next Tasks

- [ ] Admin approval flow — resource visible on Explore only after admin approves
- [ ] Dashboard redesign — Rogger feedback
- [ ] Resources page — full CRUD UI (separate page from dashboard)
- [ ] Test all pages end to end
- [ ] Push all changes to GitHub
