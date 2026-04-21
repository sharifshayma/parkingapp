-- Fix: allow availability_slot_id to be NULL on cancelled reservations
-- This prevents FK violations when merging availability slots during cancellation
ALTER TABLE reservations ALTER COLUMN availability_slot_id DROP NOT NULL;

-- Recreate cancel_booking with the fix
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_reservation_id UUID,
  p_booker_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_new_start SMALLINT;
  v_new_end SMALLINT;
  v_merge_ids UUID[];
BEGIN
  -- Lock the reservation
  SELECT * INTO v_res
  FROM reservations
  WHERE id = p_reservation_id AND booker_id = p_booker_id AND status = 'confirmed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
  END IF;

  -- Mark as cancelled and detach from slot (so slot can be deleted during merge)
  UPDATE reservations
  SET status = 'cancelled', cancelled_at = NOW(), availability_slot_id = NULL
  WHERE id = v_res.id;

  -- Restore availability: insert a new slot for the freed time
  INSERT INTO availability_slots (
    provider_id, parking_spot_id, date, start_hour, end_hour, is_available
  ) VALUES (
    v_res.provider_id, v_res.parking_spot_id, v_res.date,
    v_res.start_hour, v_res.end_hour, TRUE
  );

  -- MERGE adjacent available slots for the same spot+date
  SELECT MIN(start_hour), MAX(end_hour), ARRAY_AGG(id)
  INTO v_new_start, v_new_end, v_merge_ids
  FROM (
    WITH RECURSIVE connected AS (
      SELECT id, start_hour, end_hour
      FROM availability_slots
      WHERE parking_spot_id = v_res.parking_spot_id
        AND date = v_res.date
        AND is_available = TRUE
        AND (start_hour = v_res.end_hour OR end_hour = v_res.start_hour
             OR (start_hour >= v_res.start_hour AND end_hour <= v_res.end_hour))

      UNION

      SELECT a.id, a.start_hour, a.end_hour
      FROM availability_slots a
      INNER JOIN connected c ON (
        a.parking_spot_id = v_res.parking_spot_id
        AND a.date = v_res.date
        AND a.is_available = TRUE
        AND (a.start_hour = c.end_hour OR a.end_hour = c.start_hour)
      )
    )
    SELECT * FROM connected
  ) merged;

  -- If we found multiple adjacent slots, merge them
  IF array_length(v_merge_ids, 1) > 1 THEN
    DELETE FROM availability_slots WHERE id = ANY(v_merge_ids);

    INSERT INTO availability_slots (
      provider_id, parking_spot_id, date, start_hour, end_hour, is_available
    ) VALUES (
      v_res.provider_id, v_res.parking_spot_id, v_res.date,
      v_new_start, v_new_end, TRUE
    );
  END IF;
END;
$$;
