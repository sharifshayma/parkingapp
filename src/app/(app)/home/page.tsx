import { createClient } from "@/lib/supabase/server";
import { formatDateISO, getWeekWindow } from "@/lib/utils/time";
import { MAX_WEEKS_AHEAD } from "@/lib/constants";
import EmptyState from "@/components/ui/EmptyState";
import AvailabilityCalendarGrid from "@/components/availability/AvailabilityCalendarGrid";
import WeekNav from "@/components/availability/WeekNav";
import BookingRequestSheet from "@/components/booking/BookingRequestSheet";
import OfferParkingSheet from "@/components/offer/OfferParkingSheet";

interface HomePageProps {
  searchParams: Promise<{ week?: string }>;
}

function parseWeekOffset(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(Math.trunc(n), MAX_WEEKS_AHEAD - 1));
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const weekOffset = parseWeekOffset(params.week);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dates = getWeekWindow(weekOffset);
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

  const [{ data: reservations }, { data: providedReservations }] = user
    ? await Promise.all([
        supabase
          .from("reservations")
          .select("date, start_hour, end_hour")
          .eq("booker_id", user.id)
          .eq("status", "confirmed")
          .gte("date", fromDate)
          .lte("date", toDate),
        supabase
          .from("reservations")
          .select("date, start_hour, end_hour")
          .eq("provider_id", user.id)
          .eq("status", "confirmed")
          .gte("date", fromDate)
          .lte("date", toDate),
      ])
    : [{ data: [] }, { data: [] }];

  const hasAnySlots = (availability || []).length > 0;

  const actionRow = (
    <div className="flex gap-2">
      <div className="flex-1">
        <BookingRequestSheet />
      </div>
      <div className="flex-1">
        <OfferParkingSheet />
      </div>
    </div>
  );

  const legend = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-[var(--color-text-secondary)]">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm bg-[var(--color-primary-pale)]" />
        <span>זמין</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm bg-[var(--color-navy)]" />
        <span>שלך</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm bg-[var(--color-navy-light)]" />
        <span>שלך — תפוס</span>
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
  );

  return (
    <div className="flex flex-col gap-3 py-4">
      {actionRow}

      <h2 className="text-lg font-bold text-center">חניות זמינות</h2>

      <WeekNav weekOffset={weekOffset} basePath="/home" />

      {legend}

      {!hasAnySlots ? (
        <EmptyState message="אין חניות זמינות לשבוע הזה, נסה שוב מאוחר יותר" />
      ) : (
        <AvailabilityCalendarGrid
          weekOffset={weekOffset}
          availability={availability || []}
          reservations={reservations || []}
          providedReservations={providedReservations || []}
        />
      )}
    </div>
  );
}
