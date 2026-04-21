"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SpotSelector from "@/components/offer/SpotSelector";
import WeekCalendarGrid from "@/components/offer/WeekCalendarGrid";
import SelectionActionBar from "@/components/offer/SelectionActionBar";
import { useExistingOffers } from "@/hooks/useExistingOffers";
import { createClient } from "@/lib/supabase/client";
import { get7DayWindow, formatDateISO } from "@/lib/utils/time";
import type { ParkingSpot } from "@/lib/types/domain";
import type { Selection } from "@/hooks/useCalendarDrag";
import Link from "next/link";

export default function OfferPage() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string>("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const dates = get7DayWindow();
  const { offers, refetch } = useExistingOffers(selectedSpotId);

  useEffect(() => {
    async function loadSpots() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("owner_id", user.id);

      if (data && data.length > 0) {
        setSpots(data);
        setSelectedSpotId(data[0].id);
      }
      setLoading(false);
    }
    loadSpots();
  }, []);

  async function handleSubmit() {
    if (!selectedSpotId || !selection) return;

    setError("");
    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("לא מחובר");
      setSubmitting(false);
      return;
    }

    const dateStr = formatDateISO(dates[selection.dayIndex]);

    const { error: insertError } = await supabase
      .from("availability_slots")
      .insert({
        provider_id: user.id,
        parking_spot_id: selectedSpotId,
        date: dateStr,
        start_hour: selection.startHour,
        end_hour: selection.endHour,
      });

    if (insertError) {
      if (insertError.code === "23P01") {
        setError("יש לך כבר חניה זמינה בשעות האלה");
      } else {
        setError("שגיאה בהוספת החניה");
      }
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setSelection(null);
    refetch();
    setTimeout(() => setSuccess(false), 3000);
  }

  function handleCancel() {
    setSelection(null);
    setError("");
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          message="אין לך חניה רשומה. הוסף חניה בפרופיל שלך כדי להציע אותה."
          action={
            <Link href="/profile">
              <Button size="sm">עבור לפרופיל</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <h2 className="text-lg font-bold">הצע חניה</h2>

      <SpotSelector
        spots={spots}
        selectedSpotId={selectedSpotId}
        onChange={(id) => {
          setSelectedSpotId(id);
          setSelection(null);
          setError("");
        }}
      />

      <p className="text-xs text-[var(--color-text-secondary)]">
        גרור על הלוח כדי לבחור שעות
      </p>

      <WeekCalendarGrid
        existingOffers={offers}
        selection={selection}
        onSelectionChange={setSelection}
      />

      {/* Legend */}
      <div className="flex gap-4 justify-center text-[10px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[var(--color-primary-pale)] border-s-2 border-s-[var(--color-primary)]" />
          <span>מוצע</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm cell-past" />
          <span>עבר</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[var(--color-primary-light)]" />
          <span>נבחר</span>
        </div>
      </div>

      {selection && (
        <SelectionActionBar
          date={dates[selection.dayIndex]}
          startHour={selection.startHour}
          endHour={selection.endHour}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={submitting}
          error={error}
          success={success}
        />
      )}
    </div>
  );
}
