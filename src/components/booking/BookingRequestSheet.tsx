"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type CheckResult =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available"; slotIds: string[]; date: string; startHour: number; endHour: number }
  | { kind: "fragmented" } // multiple non-own slots together cover the range, but no single one does
  | { kind: "unavailable" } // gaps or no availability at all
  | { kind: "own_offer_overlap" }; // you're already offering your own spot during the range

export default function BookingRequestSheet() {
  const router = useRouter();
  const dates = get7DayWindow();
  const [open, setOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [startHour, setStartHour] = useState(clampToCurrentHour() + 1);
  const [endHour, setEndHour] = useState(clampToCurrentHour() + 2);
  const [result, setResult] = useState<CheckResult>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset result whenever the inputs change
  useEffect(() => {
    setResult({ kind: "idle" });
    setError("");
  }, [dayIndex, startHour, endHour]);

  function openSheet() {
    setDayIndex(0);
    const now = clampToCurrentHour();
    setStartHour(Math.min(now + 1, 23));
    setEndHour(Math.min(now + 2, 24));
    setResult({ kind: "idle" });
    setError("");
    setOpen(true);
  }

  function closeSheet() {
    if (submitting || result.kind === "checking") return;
    setOpen(false);
  }

  const selectedDate = dates[dayIndex];
  const dateStr = formatDateISO(selectedDate);
  const selectedIsToday = isToday(selectedDate);
  const minStart = selectedIsToday ? clampToCurrentHour() : 0;
  const startOptions: number[] = [];
  for (let h = minStart; h <= 23; h++) startOptions.push(h);
  const endOptions: number[] = [];
  for (let h = startHour + 1; h <= 24; h++) endOptions.push(h);

  // Keep end > start whenever start changes
  useEffect(() => {
    if (endHour <= startHour) setEndHour(startHour + 1);
  }, [startHour, endHour]);

  // If day changes to today and startHour is past, bump it forward
  useEffect(() => {
    if (selectedIsToday && startHour < minStart) {
      setStartHour(minStart);
    }
  }, [dayIndex, selectedIsToday, startHour, minStart]);

  async function check() {
    setResult({ kind: "checking" });
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("לא מחובר");
      setResult({ kind: "idle" });
      return;
    }

    // 1. Is the user already offering one of their own spots during this range?
    //    If so, they shouldn't be booking someone else's spot at the same time.
    const { data: ownOverlap, error: ownErr } = await supabase
      .from("availability_slots")
      .select("id")
      .eq("date", dateStr)
      .eq("is_available", true)
      .eq("provider_id", user.id)
      .lt("start_hour", endHour)
      .gt("end_hour", startHour)
      .limit(1);

    if (ownErr) {
      setError("שגיאה בבדיקת הזמינות");
      setResult({ kind: "idle" });
      return;
    }
    if (ownOverlap && ownOverlap.length > 0) {
      setResult({ kind: "own_offer_overlap" });
      return;
    }

    // 2. Fetch every non-own slot overlapping [startHour, endHour).
    const { data: slots, error: queryError } = await supabase
      .from("availability_slots")
      .select("id, start_hour, end_hour")
      .eq("date", dateStr)
      .eq("is_available", true)
      .neq("provider_id", user.id)
      .lt("start_hour", endHour)
      .gt("end_hour", startHour)
      .order("created_at", { ascending: true });

    if (queryError) {
      setError("שגיאה בבדיקת הזמינות");
      setResult({ kind: "idle" });
      return;
    }

    const overlapping = slots ?? [];

    // 3. Single-slot coverage: any one slot that covers the full request?
    const singleCovers = overlapping.filter(
      (s) => s.start_hour <= startHour && s.end_hour >= endHour
    );
    if (singleCovers.length > 0) {
      setResult({
        kind: "available",
        slotIds: singleCovers.map((s) => s.id),
        date: dateStr,
        startHour,
        endHour,
      });
      return;
    }

    // 4. Multi-slot coverage: do the non-own slots together cover the range
    //    with no gaps?
    const hoursCovered = new Set<number>();
    for (const s of overlapping) {
      const from = Math.max(s.start_hour, startHour);
      const to = Math.min(s.end_hour, endHour);
      for (let h = from; h < to; h++) hoursCovered.add(h);
    }
    const needed = endHour - startHour;
    if (hoursCovered.size === needed) {
      setResult({ kind: "fragmented" });
      return;
    }

    // 5. Otherwise: gaps or nothing at all.
    setResult({ kind: "unavailable" });
  }

  async function confirm() {
    if (result.kind !== "available") return;
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("לא מחובר");
      setSubmitting(false);
      return;
    }

    // FIFO: attempt each candidate slot until one succeeds
    for (const slotId of result.slotIds) {
      const { data, error: rpcError } = await supabase.rpc("book_slot", {
        p_slot_id: slotId,
        p_booker_id: user.id,
        p_start_hour: result.startHour,
        p_end_hour: result.endHour,
      });

      if (!rpcError && data) {
        track.bookingConfirmed();
        router.push(`/book/confirmation?id=${data}`);
        return;
      }

      if (rpcError?.message?.includes("SLOT_NOT_AVAILABLE")) continue;

      if (rpcError?.message?.includes("CANNOT_BOOK_OWN_SPOT")) {
        setError("לא ניתן להזמין את החניה שלך");
        setSubmitting(false);
        return;
      }

      if (rpcError?.message?.includes("RANGE_OUT_OF_BOUNDS")) {
        setError("השעות שנבחרו לא זמינות");
        setSubmitting(false);
        return;
      }
    }

    setError("החניה כבר נתפסה, נסה שוב");
    setResult({ kind: "unavailable" });
    setSubmitting(false);
  }

  const canCheck = endHour > startHour && !submitting && result.kind !== "checking";

  return (
    <>
      <Button
        variant="success"
        size="sm"
        fullWidth
        onClick={openSheet}
      >
        להזמין
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
              <h3 className="text-lg font-bold">הזמנת חניה</h3>
              <button
                type="button"
                onClick={closeSheet}
                disabled={submitting || result.kind === "checking"}
                aria-label="סגור"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl leading-none disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-primary-pale)]/60 rounded-[var(--radius-input)] px-3 py-2">
              ניתן לצפות בלוח הזמינות בדף הבית לפני הזמנת חניה.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">יום</label>
              <select
                value={dayIndex}
                onChange={(e) => setDayIndex(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
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

            {result.kind === "idle" && (
              <Button
                variant="primary"
                fullWidth
                onClick={check}
                disabled={!canCheck}
              >
                בדוק זמינות
              </Button>
            )}

            {result.kind === "checking" && (
              <Button variant="primary" fullWidth disabled>
                בודק...
              </Button>
            )}

            {result.kind === "available" && (
              <div className="flex flex-col gap-3">
                <div className="text-sm bg-[var(--color-success)]/10 text-[var(--color-success)] font-medium rounded-[var(--radius-input)] px-3 py-3 text-center">
                  ✓ החניה זמינה ל-{formatHour(result.startHour)}–{formatHour(result.endHour)} ({result.endHour - result.startHour} שעות)
                </div>
                <Button
                  variant="success"
                  fullWidth
                  onClick={confirm}
                  disabled={submitting}
                >
                  {submitting ? "מזמין..." : "אשר הזמנה"}
                </Button>
              </div>
            )}

            {result.kind === "fragmented" && (
              <div className="flex flex-col gap-2">
                <div className="text-sm bg-[var(--color-primary-pale)]/60 text-[var(--color-text-primary)] rounded-[var(--radius-input)] px-3 py-3">
                  אין חניה אחת שמכסה את כל הזמן המבוקש, אבל ניתן להזמין מספר
                  חניות שונות ולהחליף ביניהן. יש לשנות את השעות או לפצל את
                  ההזמנה לכמה בקשות קצרות יותר לפי הלוח.
                </div>
                <Button variant="outline" fullWidth onClick={() => setResult({ kind: "idle" })}>
                  שנה שעות
                </Button>
              </div>
            )}

            {result.kind === "unavailable" && (
              <div className="flex flex-col gap-2">
                <div className="text-sm bg-[var(--color-primary-pale)]/60 text-[var(--color-text-primary)] rounded-[var(--radius-input)] px-3 py-3">
                  אין חניה זמינה בזמן המבוקש. ניתן לצפות בלוח הזמינות בדף הבית.
                </div>
                <Button variant="outline" fullWidth onClick={() => setResult({ kind: "idle" })}>
                  שנה שעות
                </Button>
              </div>
            )}

            {result.kind === "own_offer_overlap" && (
              <div className="flex flex-col gap-2">
                <div className="text-sm bg-[var(--color-primary-pale)]/60 text-[var(--color-text-primary)] rounded-[var(--radius-input)] px-3 py-3">
                  יש לך חניה מוצעת בזמן המבוקש — לא ניתן להזמין חניה אחרת באותו זמן.
                </div>
                <Button variant="outline" fullWidth onClick={() => setResult({ kind: "idle" })}>
                  שנה שעות
                </Button>
              </div>
            )}

            {error && (
              <p className="text-sm text-[var(--color-error)] text-center">{error}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
