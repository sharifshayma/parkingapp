"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatHour } from "@/lib/utils/time";
import Link from "next/link";
import { track } from "@/lib/analytics";

interface Booking {
  id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  status: "confirmed" | "cancelled";
  spot_number: string;
  provider_name: string;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("reservations")
      .select(
        `
        id, date, start_hour, end_hour, status,
        parking_spots!parking_spot_id (spot_number),
        provider:profiles!provider_id (full_name)
      `
      )
      .eq("booker_id", user.id)
      .order("date", { ascending: false })
      .order("start_hour", { ascending: false });

    if (data) {
      setBookings(
        data.map((r) => {
          const provider = r.provider as unknown as { full_name: string };
          const spot = r.parking_spots as unknown as { spot_number: string };
          return {
            id: r.id,
            date: r.date,
            start_hour: r.start_hour,
            end_hour: r.end_hour,
            status: r.status,
            spot_number: spot.spot_number,
            provider_name: provider.full_name,
          };
        })
      );
    }
    setLoading(false);
  }

  async function handleCancel(reservationId: string) {
    setCancelling(reservationId);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: rpcError } = await supabase.rpc("cancel_booking", {
      p_reservation_id: reservationId,
      p_booker_id: user.id,
    });

    if (!rpcError) track.bookingCancelled();

    await loadBookings();
    setCancelling(null);
  }

  if (loading) {
    return (
      <div className="py-8 flex flex-col gap-3">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <h2 className="text-lg font-bold">ההזמנות שלי</h2>

      {bookings.length === 0 ? (
        <EmptyState
          message="עדיין לא הזמנת חניה"
          action={
            <Link href="/home">
              <Button size="sm">חפש חניה</Button>
            </Link>
          }
        />
      ) : (
        bookings.map((booking) => {
          const isCancelled = booking.status === "cancelled";

          return (
            <Card
              key={booking.id}
              className={`flex flex-col gap-2 ${isCancelled ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-numbers text-lg text-[var(--color-primary-dark)]">
                  {formatHour(booking.start_hour)}–{formatHour(booking.end_hour)}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-[var(--radius-badge)] ${
                    isCancelled
                      ? "bg-red-100 text-[var(--color-error)]"
                      : "bg-[var(--color-primary-pale)] text-[var(--color-primary-dark)]"
                  }`}
                >
                  {isCancelled ? "בוטלה" : "מאושרת"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                <span>{booking.date}</span>
                <span>חניה {booking.spot_number}</span>
                <span>{booking.provider_name}</span>
              </div>
              {!isCancelled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelling === booking.id}
                  className="self-start text-[var(--color-error)] hover:text-[var(--color-error)]"
                >
                  {cancelling === booking.id ? "מבטל..." : "ביטול הזמנה"}
                </Button>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
