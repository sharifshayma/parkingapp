-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- ALLOWED PHONES (whitelist)
-- ============================================================
CREATE TABLE public.allowed_phones (
  phone TEXT PRIMARY KEY,
  resident_name TEXT,
  apartment_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  apartment_number TEXT,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PARKING SPOTS (a user can have MULTIPLE spots)
-- ============================================================
CREATE TABLE public.parking_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_number TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parking_spots_owner ON public.parking_spots(owner_id);

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================
CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parking_spot_id UUID NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_hour SMALLINT NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour SMALLINT NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_hour > start_hour),
  CONSTRAINT max_24h CHECK (end_hour - start_hour <= 24)
);

CREATE INDEX idx_availability_date ON public.availability_slots(date, is_available);
CREATE INDEX idx_availability_provider ON public.availability_slots(provider_id);
CREATE INDEX idx_availability_spot ON public.availability_slots(parking_spot_id);

-- Prevent overlapping offers for the same spot on the same day
ALTER TABLE public.availability_slots
  ADD CONSTRAINT no_overlap_same_spot_day
  EXCLUDE USING gist (
    parking_spot_id WITH =,
    date WITH =,
    int4range(start_hour, end_hour) WITH &&
  )
  WHERE (is_available = TRUE);

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TYPE reservation_status AS ENUM ('confirmed', 'cancelled');

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  availability_slot_id UUID NOT NULL REFERENCES public.availability_slots(id),
  parking_spot_id UUID NOT NULL REFERENCES public.parking_spots(id),
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  booker_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  start_hour SMALLINT NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour SMALLINT NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  status reservation_status DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,

  CONSTRAINT valid_reservation_range CHECK (end_hour > start_hour),
  CONSTRAINT no_self_booking CHECK (booker_id != provider_id)
);

CREATE INDEX idx_reservations_booker ON public.reservations(booker_id, status);
CREATE INDEX idx_reservations_provider ON public.reservations(provider_id);
CREATE INDEX idx_reservations_slot ON public.reservations(availability_slot_id);
CREATE INDEX idx_reservations_date ON public.reservations(date, status);
