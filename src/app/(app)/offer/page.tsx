"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SpotSelector from "@/components/offer/SpotSelector";
import WeekCalendarGrid from "@/components/offer/WeekCalendarGrid";
import SelectionActionBar from "@/components/offer/SelectionActionBar";
import { useExistingOffers } from "@/hooks/useExistingOffers";
import { createClient } from "@/lib/supabase/client";
import { get7DayWindow, formatDateISO, formatHour, formatDateHebrew, splitCrossMidnight } from "@/lib/utils/time";
import type { ParkingSpot } from "@/lib/types/domain";
import type { Selection } from "@/hooks/useCalendarDrag";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { track } from "@/lib/analytics";

export default function OfferPage() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string>("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; msg: string } | null>(null);
  const [nextDayEndHour, setNextDayEndHour] = useState<number | null>(null);

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

    const splits =
      nextDayEndHour !== null
        ? splitCrossMidnight(dateStr, selection.startHour, nextDayEndHour)
        : [{ date: dateStr, startHour: selection.startHour, endHour: selection.endHour }];

    const rows = splits.map((s) => ({
      provider_id: user.id,
      parking_spot_id: selectedSpotId,
      date: s.date,
      start_hour: s.startHour,
      end_hour: s.endHour,
    }));

    const { error: insertError } = await supabase.from("availability_slots").insert(rows);

    if (insertError) {
      if (insertError.code === "23P01") {
        setError("יש לך כבר חניה זמינה בשעות האלה");
      } else {
        setError("שגיאה בהוספת החניה");
      }
      setSubmitting(false);
      return;
    }

    track.offerSubmitted();
    setSuccess(true);
    setSubmitting(false);
    setSelection(null);
    setNextDayEndHour(null);
    refetch();
    setTimeout(() => setSuccess(false), 3000);
  }

  function handleCancel() {
    setSelection(null);
    setNextDayEndHour(null);
    setError("");
  }

  async function handleDelete(slotId: string) {
    setDeletingId(slotId);
    setDeleteError(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("delete_offer", { p_slot_id: slotId });

    if (rpcError) {
      const msg =
        rpcError.message.includes("OFFER_HAS_BOOKINGS")
          ? "לא ניתן למחוק — קיימת הזמנה פעילה על החניה. בטל את ההזמנה קודם."
          : rpcError.message.includes("NOT_AUTHORIZED")
          ? "אין לך הרשאה למחוק חניה זו"
          : rpcError.message.includes("SLOT_NOT_FOUND")
          ? "החניה לא נמצאה"
          : "שגיאה במחיקת ההצעה";
      setDeleteError({ id: slotId, msg });
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    refetch();
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
          nextDayEndHour={nextDayEndHour}
          onNextDayEndHourChange={setNextDayEndHour}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={submitting}
          error={error}
          success={success}
        />
      )}

      {offers.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            ההצעות שלי
          </h3>
          <div className="flex flex-col gap-2">
            {[...offers]
              .sort((a, b) =>
                a.date === b.date ? a.start_hour - b.start_hour : a.date.localeCompare(b.date)
              )
              .map((offer) => {
                const date = new Date(offer.date);
                const isDeleting = deletingId === offer.id;
                const showErr = deleteError?.id === offer.id;
                return (
                  <Card key={offer.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-numbers text-[var(--color-primary-dark)]">
                          {formatHour(offer.start_hour)}–{formatHour(offer.end_hour)}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          {formatDateHebrew(date)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(offer.id)}
                        disabled={isDeleting}
                        aria-label="מחק הצעה"
                      >
                        {isDeleting ? "מוחק..." : "מחק"}
                      </Button>
                    </div>
                    {showErr && (
                      <p className="text-xs text-red-600 mt-1">{deleteError?.msg}</p>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
