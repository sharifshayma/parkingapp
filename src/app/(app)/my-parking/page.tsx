"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatHour, get7DayWindow, formatDateISO, formatDateHebrew } from "@/lib/utils/time";
import type { ParkingSpot } from "@/lib/types/domain";
import Link from "next/link";

interface SpotReservation {
  id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  status: string;
  booker_name: string;
}

export default function MyParkingPage() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<string>("");
  const [reservations, setReservations] = useState<SpotReservation[]>([]);
  const [loading, setLoading] = useState(true);

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
        setSelectedSpot(data[0].id);
      }
      setLoading(false);
    }
    loadSpots();
  }, []);

  useEffect(() => {
    if (!selectedSpot) return;
    loadReservations();
  }, [selectedSpot]);

  async function loadReservations() {
    const supabase = createClient();
    const { data } = await supabase
      .from("reservations")
      .select(
        `
        id, date, start_hour, end_hour, status,
        booker:profiles!booker_id (full_name)
      `
      )
      .eq("parking_spot_id", selectedSpot)
      .order("date", { ascending: false })
      .order("start_hour", { ascending: false });

    if (data) {
      setReservations(
        data.map((r) => {
          const booker = r.booker as unknown as { full_name: string };
          return {
            id: r.id,
            date: r.date,
            start_hour: r.start_hour,
            end_hour: r.end_hour,
            status: r.status,
            booker_name: booker.full_name,
          };
        })
      );
    }
  }

  if (loading) {
    return (
      <div className="py-8 flex flex-col gap-3">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          message="אין לך חניה רשומה. הוסף חניה בפרופיל שלך."
          action={
            <Link href="/profile">
              <Button size="sm">עבור לפרופיל</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const upcomingReservations = reservations.filter(
    (r) => r.status === "confirmed" && r.date >= formatDateISO(new Date())
  );
  const pastReservations = reservations.filter(
    (r) => r.status === "cancelled" || r.date < formatDateISO(new Date())
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <h2 className="text-lg font-bold">החניה שלי</h2>

      {/* Spot selector */}
      {spots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {spots.map((spot) => (
            <button
              key={spot.id}
              onClick={() => setSelectedSpot(spot.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-[var(--radius-button)] text-sm font-medium transition-colors ${
                selectedSpot === spot.id
                  ? "gradient-button text-white"
                  : "bg-[var(--color-primary-pale)] text-[var(--color-primary-dark)]"
              }`}
            >
              חניה {spot.spot_number}
            </button>
          ))}
        </div>
      )}

      {/* Upcoming reservations */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          הזמנות פעילות
        </h3>
        {upcomingReservations.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            אין הזמנות פעילות כרגע
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingReservations.map((r) => (
              <Card key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-numbers text-[var(--color-primary-dark)]">
                    {formatHour(r.start_hour)}–{formatHour(r.end_hour)}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {r.date}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{r.booker_name}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          היסטוריה
        </h3>
        {pastReservations.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            עדיין אין היסטוריה
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pastReservations.map((r) => (
              <Card key={r.id} className="flex items-center justify-between opacity-60">
                <div>
                  <div className="font-numbers text-[var(--color-text-secondary)]">
                    {formatHour(r.start_hour)}–{formatHour(r.end_hour)}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {r.date}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm">{r.booker_name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {r.status === "cancelled" ? "בוטלה" : "הושלמה"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
