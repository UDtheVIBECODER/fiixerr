# RBAC + Role-Based Dashboards for Fiixerr

A large feature spanning DB schema, auth flows, and three separate dashboards. Here's the plan.

## 1. Database (single migration)

**Enums & tables:**
- `app_role` enum: `ULTIMATE_ADMIN`, `ADMIN`, `EMPLOYEE`
- `profiles` table: `id` (PK = `auth.users.id`), `username` (unique), `role`, `created_at`
- `registration_codes` table: `code` (PK text), `role` (check: ADMIN or EMPLOYEE), `is_used` bool, `used_by` uuid, `created_at`

**Security primitives:**
- `has_role(_user_id uuid, _role app_role)` SECURITY DEFINER function (prevents recursive RLS)
- `get_my_role()` helper
- Trigger `handle_new_user()` on `auth.users` insert → if email matches `ULTIMATE_ADMIN_EMAIL` (hardcoded to the owner email — I'll ask), insert profile with `ULTIMATE_ADMIN` role; otherwise skip (registration page handles it manually).

**RLS:**
- `profiles`: users read own; ULTIMATE_ADMIN reads/deletes all; ADMIN reads all.
- `registration_codes`: only ULTIMATE_ADMIN selects/inserts; signup path validates via SECURITY DEFINER function `consume_registration_code(code, username, user_id)`.
- `brands`, `models`, `services`, `pricing_matrix`, `zip_codes`: public SELECT (already exists). Add INSERT/UPDATE/DELETE for ADMIN + ULTIMATE_ADMIN.
- `bookings`: public INSERT (already exists, customers). Add SELECT/UPDATE for EMPLOYEE, ADMIN, ULTIMATE_ADMIN. Add DELETE for ULTIMATE_ADMIN.

**Storage:**
- `brand-assets` public bucket for icon uploads (optional — admins can also paste URLs).

## 2. Auth flows

- **Owner login (Google OAuth):** Enable Google via `supabase--configure_social_auth`. Trigger assigns ULTIMATE_ADMIN if email matches the configured owner email.
- **Staff registration:** dedicated `/register` page. Step 1: enter code → server fn validates against `registration_codes`. Step 2: pick username + password → calls `supabase.auth.signUp` with email `{username}@fiixerr.staff` (synthetic), then a server fn consumes the code and inserts profile.
- **Staff login:** `/login` username + password path → looks up email by username (server fn using admin client) → signs in.
- **Gateway page** `/access`: two clear options — "Owner sign in with Google" and "Staff login / register".

## 3. Routes & dashboards

```
/                        — public landing (existing)
/access                  — gateway (Google for owner, link to staff login/register)
/login                   — staff username/password
/register                — staff code → username/password
/dashboard               — auth gate, redirects by role
/dashboard/orders        — bookings table (EMPLOYEE+)
/dashboard/catalog       — brands/models/services/pricing CRUD (ADMIN+)
/dashboard/codes         — generate registration codes (ULTIMATE_ADMIN only)
/dashboard/team          — list + delete staff (ULTIMATE_ADMIN only)
```

Layout: `_authenticated` route group with sidebar showing only the links the current role can access.

## 4. Server functions (`src/lib/*.functions.ts`)

- `auth.functions.ts`: `getMyProfile`, `loginWithUsername({username, password})`, `registerWithCode({code, username, password})`
- `codes.functions.ts`: `generateCode({code, role})` (ULTIMATE_ADMIN only)
- `team.functions.ts`: `listStaff`, `deleteStaff({userId})` (ULTIMATE_ADMIN only, uses `supabaseAdmin.auth.admin.deleteUser`)
- `bookings.functions.ts`: `listBookings`, `updateBookingStatus`
- `catalog.functions.ts`: CRUD for brands/models/services/pricing (ADMIN+)

All protected with `requireSupabaseAuth` + role check inside handler (using `has_role` SQL or a `requireRole(role)` middleware wrapper).

## 5. Catalog UI additions

- Brands table: add `icon_url` column (migration). Edit form with URL input + live preview.
- Booking engine reads `icon_url` and renders the image next to the brand name.

## 6. Open question

I need one input: **what's the owner's Google email** that should auto-receive ULTIMATE_ADMIN on first login? (It will be hardcoded into the `handle_new_user` trigger.) I'll ask before running the migration.

## Technical notes

- Username→email mapping for staff: store synthetic email `{username}@fiixerr.local` in auth, real username in `profiles.username`. Login resolves via server-side admin lookup to avoid exposing the mapping.
- The `_authenticated` layout uses `beforeLoad` with `supabase.auth.getUser()` (per tanstack-auth-guards). Role check happens in each child route's `beforeLoad`.
- Need to wire `attachSupabaseAuth` in `src/start.ts` if not already present.
- Google OAuth uses the Lovable broker (`lovable.auth.signInWithOAuth("google", ...)`).