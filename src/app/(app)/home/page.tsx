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

          <AvailabilityCalendarGrid availability={availability || []} />

          {/* Legend */}
          <div className="flex gap-4 justify-center text-[10px] text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-primary-pale)]" />
              <span>זמין</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-accent-light)] opacity-60" />
              <span>שלך</span>
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
