"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  get7DayWindow,
  formatDateISO,
  formatDateHebrew,
  formatHour,
  clampToCurrentHour,
  isToday,
} from "@/lib/utils/time";
import { track } from "@/lib/analytics";
import type { ParkingSpot } from "@/lib/types/domain";

export default function OfferParkingSheet() {
  const router = useRouter();
  const dates = get7DayWindow();
  const [open, setOpen] = useState(false);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [startHour, setStartHour] = useState(clampToCurrentHour() + 1);
  const [endHour, setEndHour] = useState(clampToCurrentHour() + 2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function openSheet() {
    setError("");
    setSuccess(false);
    setDayIndex(0);
    const now = clampToCurrentHour();
    setStartHour(Math.min(now + 1, 23));
    setEndHour(Math.min(now + 2, 24));
    setOpen(true);
    setSpotsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSpotsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("parking_spots")
      .select("*")
      .eq("owner_id", user.id);

    const list = data ?? [];
    setSpots(list);
    if (list.length > 0) setSelectedSpotId(list[0].id);
    setSpotsLoading(false);
  }

  function closeSheet() {
    if (submitting) return;
    setOpen(false);
    if (success) {
      // Refresh the /home server component so the new offer shows up
      router.refresh();
    }
  }

  const selectedDate = dates[dayIndex];
  const dateStr = formatDateISO(selectedDate);
  const selectedIsToday = isToday(selectedDate);
  const minStart = selectedIsToday ? clampToCurrentHour() : 0;
  const startOptions: number[] = [];
  for (let h = minStart; h <= 23; h++) startOptions.push(h);
  const endOptions: number[] = [];
  for (let h = startHour + 1; h <= 24; h++) endOptions.push(h);

  useEffect(() => {
    if (endHour <= startHour) setEndHour(startHour + 1);
  }, [startHour, endHour]);

  useEffect(() => {
    if (selectedIsToday && startHour < minStart) {
      setStartHour(minStart);
    }
  }, [dayIndex, selectedIsToday, startHour, minStart]);

  useEffect(() => {
    setError("");
    setSuccess(false);
  }, [selectedSpotId, dayIndex, startHour, endHour]);

  async function submit() {
    if (!selectedSpotId) return;
    setSubmitting(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("לא מחובר");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("availability_slots").insert({
      provider_id: user.id,
      parking_spot_id: selectedSpotId,
      date: dateStr,
      start_hour: startHour,
      end_hour: endHour,
    });

    if (insertError) {
      if (insertError.code === "23P01") {
        setError("השעות חופפות להצעה קיימת לאותה חניה");
      } else {
        setError("שגיאה בהוספת ההצעה");
      }
      setSubmitting(false);
      return;
    }

    track.offerSubmitted();
    setSuccess(true);
    setSubmitting(false);
  }

  const canSubmit =
    !!selectedSpotId && endHour > startHour && !submitting && !spotsLoading;

  return (
    <>
      <Button variant="primary" size="sm" fullWidth onClick={openSheet}>
        הצע חניה
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
          onClick={closeSheet}
        >
          <div
            className="bg-[var(--color-surface)] rounded-t-[var(--radius-card)] w-full max-w-lg p-5 animate-slide-up flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">הצעת חניה</h3>
              <button
                type="button"
                onClick={closeSheet}
                disabled={submitting}
                aria-label="סגור"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl leading-none disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {spotsLoading && (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                טוען…
              </p>
            )}

            {!spotsLoading && spots.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  אין לך חניה רשומה. הוסף חניה בפרופיל כדי להציע אותה.
                </p>
                <Link href="/profile" onClick={() => setOpen(false)}>
                  <Button variant="outline" fullWidth>
                    עבור לפרופיל
                  </Button>
                </Link>
              </div>
            )}

            {!spotsLoading && spots.length > 0 && (
              <>
                {spots.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">חניה</label>
                    <select
                      value={selectedSpotId}
                      onChange={(e) => setSelectedSpotId(e.target.value)}
                      className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:outline-none"
                    >
                      {spots.map((s) => (
                        <option key={s.id} value={s.id}>
                          חניה {s.spot_number}
                          {s.label ? ` — ${s.label}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">יום</label>
                  <select
                    value={dayIndex}
                    onChange={(e) => setDayIndex(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    {dates.map((d, i) => (
                      <option key={i} value={i}>
                        {formatDateHebrew(d)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">משעה</label>
                    <select
                      value={startHour}
                      onChange={(e) => setStartHour(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:outline-none font-numbers"
                    >
                      {startOptions.map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">עד שעה</label>
                    <select
                      value={endHour}
                      onChange={(e) => setEndHour(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:outline-none font-numbers"
                    >
                      {endOptions.map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {success ? (
                  <div className="flex flex-col gap-3">
                    <div className="text-sm bg-[var(--color-success)]/10 text-[var(--color-success)] font-medium rounded-[var(--radius-input)] px-3 py-3 text-center">
                      ✓ ההצעה נוספה ל-{formatHour(startHour)}–{formatHour(endHour)}
                    </div>
                    <Button variant="outline" fullWidth onClick={closeSheet}>
                      סגור
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={submit}
                    disabled={!canSubmit}
                  >
                    {submitting ? "שומר…" : "הצע חניה"}
                  </Button>
                )}

                {error && (
                  <p className="text-sm text-[var(--color-error)] text-center">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
