# PRD — Parking Sharing App

## Vision
A building-exclusive web app that lets residents share and book parking spots effortlessly. Residents offer their spots when unused, others browse availability and book — all verified by phone to keep it building-only.

---

## 1. Users & Roles

| Role | Description |
|------|-------------|
| **Admin (You)** | Pre-loads the whitelist of allowed phone numbers. Has a permanent parking spot listed. Can view full calendar and reservation history. |
| **Resident** | Signs up with a whitelisted phone number, verifies via OTP. Can browse/book available spots AND offer their own spot. |

Every resident is both a potential **provider** (offers parking) and a **booker** (reserves parking). The admin is a provider by default.

---

## 2. Core Features

### 2.1 Authentication & Onboarding
- **Phone-based signup/login** via Supabase Auth (OTP SMS)
- Phone number must exist in an `allowed_phones` table — if not, registration is rejected with a message: "מספר הטלפון לא נמצא ברשימת הדיירים"
- On first login, user completes profile: full name, apartment number, parking spot number(s) (optional — not all residents have one)
- A resident can own **multiple parking spots** (separate `parking_spots` table, unique spot numbers across all users)
- Each person in an apartment can register with their own phone (e.g., a couple gets separate accounts)
- International phone numbers supported (E.164 format, validated with `libphonenumber-js`)
- Profile must be completed before accessing any feature (enforced by middleware)
- Session persists via Supabase JWT

### 2.2 Homepage — Parking Availability (Logged-in)
- Shows **7-day rolling window** (today → today+6)
- Each day shows a list of available parking slots with:
  - Available time range only (24hr format, e.g., 08:00–18:00)
  - **No parking number or provider name shown** — those are revealed only after booking (in the confirmation screen)
- **Only shows unreserved availability** — once booked, the slot disappears from the list
- All times displayed in **24hr format** with **1-hour granularity** (e.g., 08:00, 09:00, 10:00…)
- A spot can be offered for **up to 24 hours** (e.g., 00:00–24:00)
- When multiple providers offer the same time range, show it once with a count (e.g., "2 חניות זמינות")
- User's **own offered spots are visible but not bookable** (muted style, disabled button)
- Resident taps an available range → selects how many hours within that range they want (minimum 1 hour) → confirms booking
- **Fragmented availability**: if a user needs 10:00–14:00 but only 10:00–12:00 and 12:00–14:00 are available from different providers, the user makes two separate bookings

### 2.3 Booking Confirmation
After booking, the resident sees:
- Parking spot number
- Provider name & phone number
- Reserved time range
- **"שלח תודה בוואטסאפ"** button → opens `https://wa.me/<phone>?text=...` with a pre-filled thank-you message

### 2.4 Offer My Parking
- Button on homepage: **"הצע חניה"**
- Resident selects:
  - Which parking spot (if they own multiple)
  - Date (from today to +6 days)
  - Start time & end time (1-hour granularity)
- The slot is added to the availability pool
- **Past time clamping**: if offering for today at 15:20, earliest start is 15:00 (current hour, not next)
- **Cross-midnight offers** (e.g., 22:00–06:00): auto-split into two days (22:00–24:00 day 1, 00:00–06:00 day 2)
- **Overlap rejection**: can't offer overlapping hours for the same spot on the same day
- **Cannot delete an offer with active bookings** — must cancel bookings first
- If the resident doesn't have a parking spot number in their profile, they're prompted to add one first

### 2.5 Provider Dashboard ("החניה שלי")
- If user has no parking spots: show prompt to add one
- If user has multiple spots: spot selector (tabs or dropdown)
- **Calendar view** of the provider's own parking spot(s)
  - Shows who booked, for what hours, their name
  - Color-coded: available (green), booked (blue), past (gray)
- **History tab**: list of all past reservations on their spot
  - Booker name, date, hours
  - Sorted newest-first, paginated

### 2.6 My Bookings ("ההזמנות שלי")
- List of all spots the resident has booked (past and upcoming)
- Each entry shows: parking #, provider name, date, hours, status
- Bookings can be cancelled at any time, even after start time (frees the slot back to availability)
- After cancellation, adjacent available slots are automatically merged to prevent fragmentation

---

## 3. Backend Logic — Availability Engine

### 3.1 Data Model

```
allowed_phones
├── phone (text, PK — E.164 format)
├── resident_name (text, optional)
├── created_at

profiles
├── id (uuid, PK, FK → auth.users)
├── phone (text, unique — E.164)
├── full_name (text)
├── apartment_number (text)
├── is_profile_complete (boolean)
├── created_at, updated_at

parking_spots (separate table — supports multiple spots per user)
├── id (uuid, PK)
├── owner_id (uuid, FK → profiles)
├── spot_number (text, UNIQUE across all users)
├── label (text, optional — e.g., "חניה עליונה")
├── created_at

availability_slots
├── id (uuid, PK)
├── provider_id (uuid, FK → profiles)
├── parking_spot_id (uuid, FK → parking_spots)
├── date (date)
├── start_hour (smallint, 0–23)
├── end_hour (smallint, 1–24)
├── is_available (boolean)
├── created_at
├── EXCLUDE constraint: no overlapping offers for same spot+date

reservations
├── id (uuid, PK)
├── availability_slot_id (uuid, FK → availability_slots)
├── parking_spot_id (uuid, FK → parking_spots)
├── provider_id (uuid, FK → profiles)
├── booker_id (uuid, FK → profiles)
├── date (date)
├── start_hour (smallint), end_hour (smallint)
├── status (enum: confirmed, cancelled)
├── created_at, cancelled_at
├── CHECK: booker_id != provider_id
```

**Note:** Hours stored as SMALLINT (0–24) instead of TIME — enforces 1-hour granularity at schema level, makes arithmetic trivial, and works with int4range EXCLUDE constraints.

### 3.2 Availability Resolution
- **Granularity:** all times snap to 1-hour increments (no 08:30 — only 08:00, 09:00, etc.)
- **Minimum booking:** 1 hour
- **Maximum offering:** 24 hours (00:00–24:00)
- When a provider offers 08:00–18:00 and someone books 10:00–12:00:
  - The original slot is **split** into two remaining slots: 08:00–10:00 and 12:00–18:00
  - The reservation is recorded separately
- The homepage query only returns slots where `remaining available time ≥ 1 hour`
- Past slots (date < today, or end_time < now for today) are automatically excluded from display

### 3.3 Conflict Prevention
- Use Supabase Row Level Security (RLS) + database-level checks
- A booking request validates: the requested time range is fully within an available (unreserved) slot
- Optimistic locking: if two people try to book the same slot simultaneously, only the first succeeds
- **FIFO assignment**: when multiple providers offer the same time, the first-offered slot is assigned first
- **Self-booking prevention**: enforced at DB level (CHECK constraint: booker_id != provider_id)

---

## 4. Design System

| Element | Spec |
|---------|------|
| Primary | #5BAADB (sky blue) |
| Primary Dark | #3A8BC2 |
| Primary Light | #8CC8ED |
| Primary Pale | #D0E9F7 |
| Accent | #F0A885 (peach) |
| Accent Light | #F7CDB8 |
| Background | #F4F8FC |
| Surface | #FFFFFF |
| Text Primary | #1A2B3D |
| Text Secondary | #7E94A8 |
| Text Muted | #A8BDCF |
| Font (Hebrew) | Rubik 400–800 |
| Font (Numbers) | Plus Jakarta Sans 700–800 |
| Border Radius (buttons) | 50px |
| Border Radius (cards) | 24px |
| Shadows | rgba(58,139,194, 0.08–0.16) |
| Direction | RTL throughout |
| Gradients | Sky-to-peach (header), sky-to-blue (buttons) |
| Organic waves | Section dividers |

---

## 5. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS (custom theme from brand guide) |
| Auth | Supabase Auth (Phone OTP) |
| Database | Supabase PostgreSQL |
| API | Supabase client SDK + Server Actions |
| Analytics | PostHog (events, funnels, session replay) |
| Error Tracking | Sentry |
| Phone Validation | libphonenumber-js |
| Hosting | Vercel |
| Messaging | WhatsApp deep link (wa.me) |

---

## 6. Implementation Milestones

### Milestone 1 — Foundation & Auth
**Goal:** Project setup, database schema, phone-based auth with whitelist gate.

- [ ] Initialize Next.js 14 project with TypeScript + Tailwind
- [ ] Configure Tailwind with brand tokens (colors, fonts, radii, shadows)
- [ ] Set up Supabase project (database + auth)
- [ ] Create database tables: `allowed_phones`, `profiles`
- [ ] Implement phone OTP login/signup flow
- [ ] Add whitelist check: verify phone exists in `allowed_phones` before sending OTP
- [ ] Build profile completion form (name, apartment, parking spot)
- [ ] Set up RLS policies on all tables
- [ ] Build layout shell: RTL, Hebrew, header, navigation

**Deliverable:** Users can sign up/login with verified phone, complete profile. Unauthorized phones are blocked.

---

### Milestone 2 — Availability & Offering
**Goal:** Residents can offer their parking spot for specific time ranges.

- [ ] Create `availability_slots` table with RLS
- [ ] Build "הצע חניה" (Offer Parking) form: date picker, time range selector
- [ ] Validate: user must have parking_spot_number in profile
- [ ] Display user's own offered slots with ability to delete
- [ ] Build homepage availability feed: 7-day rolling view grouped by date
- [ ] Show each slot as a card: available time range only (24hr) — no provider details until booked
- [ ] Auto-hide past slots

**Deliverable:** Residents can offer parking and see all available spots on the homepage.

---

### Milestone 3 — Booking Engine
**Goal:** Residents can book available slots, with proper conflict handling and slot splitting.

- [ ] Build booking flow: tap slot → select hours within range → confirm
- [ ] Create `reservations` table with RLS
- [ ] Implement slot-splitting logic (database function):
  - On booking, split the original availability slot around the reserved time
- [ ] Add optimistic locking / conflict check
- [ ] Build booking confirmation screen:
  - Show parking #, provider name, phone, reserved hours
  - "שלח תודה בוואטסאפ" button (wa.me deep link)
- [ ] Update homepage to exclude booked time ranges
- [ ] Build "ההזמנות שלי" (My Bookings) page
- [ ] Add cancel booking functionality (restores availability)

**Deliverable:** Full booking loop — browse, book, confirm, WhatsApp thank-you, cancel.

---

### Milestone 4 — Provider Dashboard
**Goal:** Parking owners can see who booked their spot and full history.

- [ ] Build "החניה שלי" (My Parking) page
- [ ] Calendar view: show current week with booked/available/past slots
- [ ] Each booked slot shows: booker name, time range
- [ ] History tab: all past reservations, newest first
- [ ] Admin seed: pre-load your parking info (name, email, phone, parking #)

**Deliverable:** Providers have full visibility into their parking usage.

---

### Milestone 5 — Polish & Launch
**Goal:** Final UX polish, edge cases, and deployment.

- [ ] Responsive design pass (mobile-first — residents will mostly use phones)
- [ ] Add organic wave dividers between sections
- [ ] Add gradient header (sky-to-peach)
- [ ] Empty states with friendly Hebrew copy
- [ ] Error handling: network errors, expired sessions, edge cases
- [ ] Loading skeletons for all data-fetching states
- [ ] Seed `allowed_phones` with your building's phone list
- [ ] Deploy to Vercel + connect custom domain (optional)
- [ ] Test full flow end-to-end: signup → offer → book → confirm → WhatsApp → cancel

**Deliverable:** Production-ready app deployed and usable by building residents.

---

## 7. Analytics & Tracking

### PostHog (product analytics)
- Page views, autocapture (clicks, form submits), session replay
- **Signup funnel**: phone_entered → otp_requested → otp_verified → profile_completed
- **Offer funnel**: offer_started → offer_date_selected → offer_time_selected → offer_submitted (vs offer_abandoned)
- **Booking funnel**: availability_viewed → slot_tapped → booking_time_selected → booking_confirmed → whatsapp_tapped

### Sentry (error tracking)
- Unhandled exceptions, failed API calls
- Custom DB function errors (SLOT_NOT_AVAILABLE, RANGE_OUT_OF_BOUNDS, etc.)

### Supabase Dashboard
- Sign-ups, active users, auth logs
- Database queries, row counts for reservations/availability

---

## 8. Out of Scope (v1)
- Push notifications (can add in v2)
- Payment/fees for parking
- Multi-building support
- Admin panel for managing whitelist (seed via SQL for now)
- English/Arabic language support
- Recurring availability (e.g., "every weekday 8–18")

---

## 9. Success Metrics
- Residents can sign up and verify in under 2 minutes
- A parking spot can be offered in 3 taps
- A booking can be made in 3 taps
- Zero double-bookings (enforced at DB level)
