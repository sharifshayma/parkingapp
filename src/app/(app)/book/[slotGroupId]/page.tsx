"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatHour, formatDateHebrew } from "@/lib/utils/time";
import { track } from "@/lib/analytics";

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const slotGroupId = params.slotGroupId as string;

  // Parse slotGroupId: "2026-04-14_8_18"
  const parts = slotGroupId.split("_");
  const dateStr = parts[0];
  const availStart = Number(parts[1]);
  const availEnd = Number(parts[2]);

  const [startHour, setStartHour] = useState<number>(availStart);
  const [endHour, setEndHour] = useState<number>(availStart + 1);
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSlots() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase.rpc("get_aggregated_availability", {
        p_from_date: dateStr,
        p_to_date: dateStr,
        p_current_user_id: user?.id || null,
      });

      const match = (data || []).find(
        (s: { start_hour: number; end_hour: number }) =>
          s.start_hour === availStart && s.end_hour === availEnd
      );

      if (match) {
        setSlotIds(match.slot_ids);
      }
      setLoading(false);
    }
    loadSlots();
  }, [dateStr, availStart, availEnd]);

  async function handleBook() {
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

    // Try FIFO: attempt each slot in order
    for (const slotId of slotIds) {
      const { data, error: rpcError } = await supabase.rpc("book_slot", {
        p_slot_id: slotId,
        p_booker_id: user.id,
        p_start_hour: startHour,
        p_end_hour: endHour,
      });

      if (!rpcError && data) {
        track.bookingConfirmed();
        router.push(`/book/confirmation?id=${data}`);
        return;
      }

      // If this slot failed, try next one
      if (rpcError?.message?.includes("SLOT_NOT_AVAILABLE")) {
        continue;
      }
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
    setSubmitting(false);
  }

  const date = new Date(dateStr);

  // Generate hour options within available range
  const startOptions: number[] = [];
  for (let h = availStart; h < availEnd; h++) {
    startOptions.push(h);
  }

  const endOptions: number[] = [];
  for (let h = startHour + 1; h <= availEnd; h++) {
    endOptions.push(h);
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <h2 className="text-lg font-bold">הזמנת חניה</h2>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {formatDateHebrew(date)}
            </p>
            <p className="font-numbers text-2xl text-[var(--color-primary-dark)]">
              {formatHour(availStart)}–{formatHour(availEnd)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">זמין</p>
          </div>

          <hr className="border-[var(--color-primary-pale)]" />

          <p className="text-sm font-medium text-center">בחר את השעות שלך</p>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium">משעה</label>
              <select
                value={startHour}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setStartHour(h);
                  if (endHour <= h) setEndHour(h + 1);
                }}
                className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] font-numbers"
              >
                {startOptions.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium">עד שעה</label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)] font-numbers"
              >
                {endOptions.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            משך: <span className="font-numbers font-bold">{endHour - startHour}</span> שעות
          </p>

          {error && (
            <p className="text-sm text-[var(--color-error)] text-center">
              {error}
            </p>
          )}

          <Button
            fullWidth
            onClick={handleBook}
            disabled={submitting}
          >
            {submitting ? "מזמין..." : "הזמן חניה"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
