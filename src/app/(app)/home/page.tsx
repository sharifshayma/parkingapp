import { createClient } from "@/lib/supabase/server";
import { formatDateISO, get7DayWindow } from "@/lib/utils/time";
import EmptyState from "@/components/ui/EmptyState";
import AvailabilityCalendarGrid from "@/components/availability/AvailabilityCalendarGrid";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dates = get7DayWindow();
  const fromDate = formatDateISO(dates[0]);
  const toDate = formatDateISO(dates[dates.length - 1]);

  const { data: availability } = await supabase.rpc(
    "get_aggregated_availability",
    {
      p_from_date: fromDate,
      p_to_date: toDate,
      p_current_user_id: user?.id || null,
    }
  );

  const { data: reservations } = user
    ? await supabase
        .from("reservations")
        .select("date, start_hour, end_hour")
        .eq("booker_id", user.id)
        .eq("status", "confirmed")
        .gte("date", fromDate)
        .lte("date", toDate)
    : { data: [] };

  const hasAnySlots = (availability || []).length > 0;

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">חניות זמינות</h2>
        <Link href="/offer">
          <Button size="sm">הצע חניה</Button>
        </Link>
      </div>

      {!hasAnySlots ? (
        <EmptyState message="אין חניות זמינות כרגע. בדוק שוב מאוחר יותר" />
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-secondary)]">
            לחץ על שעה זמינה כדי להזמין
          </p>

          <AvailabilityCalendarGrid
            availability={availability || []}
            reservations={reservations || []}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-primary-pale)]" />
              <span>זמין</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary-light)]" />
              <span>נותר אחד</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-navy)]" />
              <span>שלך</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-success)]" />
              <span>הזמנתי</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm cell-past" />
              <span>עבר</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
