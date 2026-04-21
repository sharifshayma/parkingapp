-- ============================================================
-- USER APPROVAL + ADMIN
-- Gate sign-ups behind an admin approval. Add a banned state for
-- misuse. Seed the first admin.
-- ============================================================

-- Status enum
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'banned');

-- Profile columns
ALTER TABLE public.profiles
  ADD COLUMN status user_status NOT NULL DEFAULT 'pending',
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN banned_at TIMESTAMPTZ;

CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Seed the first admin (by their auth email). Also auto-approves them
-- so they don't lock themselves out on deploy.
UPDATE public.profiles
SET is_admin = TRUE,
    status = 'approved',
    approved_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'sharif.shayma@gmail.com'
);

-- ============================================================
-- RLS
-- ============================================================

-- Admins can update any profile row (for approve / ban / unban).
-- Self-update remains governed by the existing "Users can update own
-- profile" policy.
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Tighten: only approved users can offer slots.
DROP POLICY IF EXISTS "Providers can insert own slots" ON public.availability_slots;
CREATE POLICY "Approved providers can insert own slots"
  ON public.availability_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

-- Tighten: only approved users can book.
DROP POLICY IF EXISTS "Authenticated users can create reservations" ON public.reservations;
CREATE POLICY "Approved users can create reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = booker_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );
