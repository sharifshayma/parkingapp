-- ============================================================
-- FUNCTION: book_slot
-- Atomic booking with slot splitting and race-condition safety
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id UUID,
  p_booker_id UUID,
  p_start_hour SMALLINT,
  p_end_hour SMALLINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_reservation_id UUID;
BEGIN
  -- Lock the slot row to prevent race conditions
  SELECT * INTO v_slot
  FROM availability_slots
  WHERE id = p_slot_id AND is_available = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_AVAILABLE';
  END IF;

  -- Validate requested range fits within the slot
  IF p_start_hour < v_slot.start_hour OR p_end_hour > v_slot.end_hour THEN
    RAISE EXCEPTION 'RANGE_OUT_OF_BOUNDS';
  END IF;

  -- Validate booker is not the provider
  IF p_booker_id = v_slot.provider_id THEN
    RAISE EXCEPTION 'CANNOT_BOOK_OWN_SPOT';
  END IF;

  -- Create the reservation
  INSERT INTO reservations (
    availability_slot_id, parking_spot_id, provider_id,
    booker_id, date, start_hour, end_hour
  ) VALUES (
    v_slot.id, v_slot.parking_spot_id, v_slot.provider_id,
    p_booker_id, v_slot.date, p_start_hour, p_end_hour
  )
  RETURNING id INTO v_reservation_id;

  -- SPLIT the availability slot
  -- Case 1: Booking covers the entire slot
  IF p_start_hour = v_slot.start_hour AND p_end_hour = v_slot.end_hour THEN
    UPDATE availability_slots SET is_available = FALSE WHERE id = v_slot.id;

  -- Case 2: Booking at the start
  ELSIF p_start_hour = v_slot.start_hour THEN
    UPDATE availability_slots
    SET start_hour = p_end_hour
    WHERE id = v_slot.id;

  -- Case 3: Booking at the end
  ELSIF p_end_hour = v_slot.end_hour THEN
    UPDATE availability_slots
    SET end_hour = p_start_hour
    WHERE id = v_slot.id;

  -- Case 4: Booking in the middle
  ELSE
    -- Shrink original to the "before" portion
    UPDATE availability_slots
    SET end_hour = p_start_hour
    WHERE id = v_slot.id;

    -- Create new slot for the "after" portion
    INSERT INTO availability_slots (
      provider_id, parking_spot_id, date, start_hour, end_hour, is_available
    ) VALUES (
      v_slot.provider_id, v_slot.parking_spot_id, v_slot.date,
      p_end_hour, v_slot.end_hour, TRUE
    );
  END IF;

  RETURN v_reservation_id;
END;
$$;

-- ============================================================
-- FUNCTION: cancel_booking
-- Cancels a reservation and restores + merges availability
-- ============================================================
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

-- ============================================================
-- FUNCTION: get_aggregated_availability
-- Returns availability grouped by date+time range with counts
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_aggregated_availability(
  p_from_date DATE,
  p_to_date DATE,
  p_current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  start_hour SMALLINT,
  end_hour SMALLINT,
  available_count BIGINT,
  is_own_spot BOOLEAN,
  slot_ids UUID[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.date,
    a.start_hour,
    a.end_hour,
    COUNT(*) AS available_count,
    BOOL_OR(a.provider_id = p_current_user_id) AS is_own_spot,
    ARRAY_AGG(a.id ORDER BY a.created_at ASC) AS slot_ids
  FROM availability_slots a
  WHERE a.date BETWEEN p_from_date AND p_to_date
    AND a.is_available = TRUE
  GROUP BY a.date, a.start_hour, a.end_hour
  ORDER BY a.date, a.start_hour;
$$;
