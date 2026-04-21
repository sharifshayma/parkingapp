"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { get7DayWindow, formatDateISO } from "@/lib/utils/time";
import type { AvailabilitySlot } from "@/lib/types/domain";

export function useExistingOffers(spotId: string) {
  const [offers, setOffers] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    if (!spotId) {
      setOffers([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const dates = get7DayWindow();
    const fromDate = formatDateISO(dates[0]);
    const toDate = formatDateISO(dates[dates.length - 1]);

    const { data } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("parking_spot_id", spotId)
      .eq("provider_id", user.id)
      .eq("is_available", true)
      .gte("date", fromDate)
      .lte("date", toDate);

    setOffers(data ?? []);
    setLoading(false);
  }, [spotId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  return { offers, loading, refetch: fetchOffers };
}
