-- Enable RLS on all tables
ALTER TABLE public.allowed_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- ── ALLOWED_PHONES ──
-- No client access — checked via server action with service role.

-- ── PROFILES ──
CREATE POLICY "Users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── PARKING_SPOTS ──
CREATE POLICY "Anyone authed can read parking spots"
  ON public.parking_spots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own parking spots"
  ON public.parking_spots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own parking spots"
  ON public.parking_spots FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ── AVAILABILITY_SLOTS ──
CREATE POLICY "Anyone authed can read available slots"
  ON public.availability_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can insert own slots"
  ON public.availability_slots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own slots"
  ON public.availability_slots FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own available slots"
  ON public.availability_slots FOR DELETE
  TO authenticated
  USING (auth.uid() = provider_id);

-- ── RESERVATIONS ──
CREATE POLICY "Bookers and providers can read their reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = booker_id OR auth.uid() = provider_id);

CREATE POLICY "Authenticated users can create reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = booker_id);

CREATE POLICY "Bookers can update own reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = booker_id);
