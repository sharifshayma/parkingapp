-- ============================================================
-- FUNCTION: delete_offer
-- Deletes an availability slot (offer) for the caller.
-- Blocks deletion if any confirmed reservation on the same
-- spot+date touches the slot's hour range — the user must
-- cancel those bookings first.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_offer(
  p_slot_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_booking_count INT;
BEGIN
  SELECT * INTO v_slot
  FROM availability_slots
  WHERE id = p_slot_id AND is_available = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND';
  END IF;

  IF v_slot.provider_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  -- Block when a confirmed reservation on the same spot+date touches this slot
  -- (inclusive of adjacency, since bookings split the original offer into adjacent remnants)
  SELECT COUNT(*) INTO v_booking_count
  FROM reservations
  WHERE parking_spot_id = v_slot.parking_spot_id
    AND date = v_slot.date
    AND status = 'confirmed'
    AND start_hour <= v_slot.end_hour
    AND end_hour >= v_slot.start_hour;

  IF v_booking_count > 0 THEN
    RAISE EXCEPTION 'OFFER_HAS_BOOKINGS';
  END IF;

  DELETE FROM availability_slots WHERE id = p_slot_id;
END;
$$;
