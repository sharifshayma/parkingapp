"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatHour, formatDateISO } from "@/lib/utils/time";
import type { ParkingSpot, AvailabilitySlot } from "@/lib/types/domain";
import Link from "next/link";

interface SpotReservation {
  id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  status: string;
  booker_name: string;
}

const HISTORY_PAGE_SIZE = 5;

type RawReservation = {
  id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  status: string;
  booker: { full_name: string } | null;
};

function mapReservation(r: RawReservation): SpotReservation {
  return {
    id: r.id,
    date: r.date,
    start_hour: r.start_hour,
    end_hour: r.end_hour,
    status: r.status,
    booker_name: r.booker?.full_name ?? "—",
  };
}

export default function MyParkingPage() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<string>("");
  const [upcoming, setUpcoming] = useState<SpotReservation[]>([]);
  const [offers, setOffers] = useState<AvailabilitySlot[]>([]);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<{ id: string; msg: string } | null>(null);
  const [history, setHistory] = useState<SpotReservation[]>([]);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
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

  const loadOffers = useCallback(async (spotId: string) => {
    const supabase = createClient();
    const today = formatDateISO(new Date());
    const { data } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("parking_spot_id", spotId)
      .eq("is_available", true)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_hour", { ascending: true });
    setOffers((data ?? []) as AvailabilitySlot[]);
  }, []);

  async function handleDeleteOffer(offerId: string) {
    setDeletingOfferId(offerId);
    setOfferError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_offer", { p_slot_id: offerId });
    if (error) {
      const msg = error.message.includes("OFFER_HAS_BOOKINGS")
        ? "לא ניתן למחוק — קיימת הזמנה פעילה. בטל את ההזמנה קודם."
        : error.message.includes("NOT_AUTHORIZED")
        ? "אין לך הרשאה למחוק הצעה זו"
        : error.message.includes("SLOT_NOT_FOUND")
        ? "ההצעה לא נמצאה"
        : "שגיאה במחיקת ההצעה";
      setOfferError({ id: offerId, msg });
      setDeletingOfferId(null);
      return;
    }
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
    setDeletingOfferId(null);
  }

  const loadUpcoming = useCallback(async (spotId: string) => {
    const supabase = createClient();
    const today = formatDateISO(new Date());
    const { data } = await supabase
      .from("reservations")
      .select(
        `id, date, start_hour, end_hour, status, booker:profiles!booker_id (full_name)`
      )
      .eq("parking_spot_id", spotId)
      .eq("status", "confirmed")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_hour", { ascending: true });

    setUpcoming(((data ?? []) as unknown as RawReservation[]).map(mapReservation));
  }, []);

  const loadHistoryPage = useCallback(
    async (spotId: string, offset: number): Promise<SpotReservation[]> => {
      const supabase = createClient();
      const today = formatDateISO(new Date());
      // History = cancelled OR (confirmed AND past date)
      const { data } = await supabase
        .from("reservations")
        .select(
          `id, date, start_hour, end_hour, status, booker:profiles!booker_id (full_name)`
        )
        .eq("parking_spot_id", spotId)
        .or(`status.eq.cancelled,and(status.eq.confirmed,date.lt.${today})`)
        .order("date", { ascending: false })
        .order("start_hour", { ascending: false })
        .range(offset, offset + HISTORY_PAGE_SIZE);

      return ((data ?? []) as unknown as RawReservation[]).map(mapReservation);
    },
    []
  );

  useEffect(() => {
    if (!selectedSpot) return;

    setUpcoming([]);
    setOffers([]);
    setOfferError(null);
    setHistory([]);
    setHistoryHasMore(false);

    loadUpcoming(selectedSpot);
    loadOffers(selectedSpot);
    loadHistoryPage(selectedSpot, 0).then((page) => {
      setHistoryHasMore(page.length > HISTORY_PAGE_SIZE);
      setHistory(page.slice(0, HISTORY_PAGE_SIZE));
    });
  }, [selectedSpot, loadUpcoming, loadOffers, loadHistoryPage]);

  async function handleLoadMoreHistory() {
    setHistoryLoadingMore(true);
    const next = await loadHistoryPage(selectedSpot, history.length);
    setHistoryHasMore(next.length > HISTORY_PAGE_SIZE);
    setHistory((prev) => [...prev, ...next.slice(0, HISTORY_PAGE_SIZE)]);
    setHistoryLoadingMore(false);
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

  return (
    <div className="flex flex-col gap-4 py-4">
      <h2 className="text-lg font-bold">החניה שלי</h2>

      {/* Read-only parking-number overview */}
      <Card>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {spots.length === 1 ? "מספר החניה שלך" : "מספרי החניות שלך"}
          </span>
          <div className="flex flex-wrap gap-2">
            {spots.map((spot) => (
              <span
                key={spot.id}
                className="font-numbers font-bold text-[var(--color-primary-dark)] bg-[var(--color-primary-pale)] rounded-[var(--radius-badge)] px-3 py-1 text-sm"
              >
                {spot.spot_number}
              </span>
            ))}
          </div>
        </div>
      </Card>

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

      {/* Offered times (my availability) */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          זמנים שהצעתי
        </h3>
        {offers.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            אין הצעות פעילות
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {offers.map((o) => {
              const isDeleting = deletingOfferId === o.id;
              const showErr = offerError?.id === o.id;
              return (
                <Card key={o.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-numbers text-[var(--color-primary-dark)]">
                        {formatHour(o.start_hour)}–{formatHour(o.end_hour)}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {o.date}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOffer(o.id)}
                      disabled={isDeleting}
                      aria-label="מחק הצעה"
                    >
                      {isDeleting ? "מוחק..." : "מחק"}
                    </Button>
                  </div>
                  {showErr && (
                    <p className="text-xs text-[var(--color-error)] mt-1">
                      {offerError?.msg}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming reservations */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          הזמנות פעילות
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            אין הזמנות פעילות כרגע
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((r) => (
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
        {history.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            עדיין אין היסטוריה
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {history.map((r) => (
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
            {historyHasMore && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMoreHistory}
                  disabled={historyLoadingMore}
                >
                  {historyLoadingMore ? "טוען..." : "טען עוד"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
