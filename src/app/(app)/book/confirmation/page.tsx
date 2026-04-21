"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatHour } from "@/lib/utils/time";
import { buildWhatsAppUrl, buildThankYouMessage, formatPhoneDisplay } from "@/lib/utils/phone";
import Link from "next/link";

interface BookingDetails {
  date: string;
  start_hour: number;
  end_hour: number;
  spot_number: string;
  provider_name: string;
  provider_phone: string;
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="py-8"><div className="skeleton h-64 w-full" /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!reservationId) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("reservations")
        .select(
          `
          date, start_hour, end_hour,
          parking_spots!parking_spot_id (spot_number),
          provider:profiles!provider_id (full_name, phone)
        `
        )
        .eq("id", reservationId)
        .single();

      if (data) {
        const provider = data.provider as unknown as { full_name: string; phone: string };
        const spot = data.parking_spots as unknown as { spot_number: string };
        setBooking({
          date: data.date,
          start_hour: data.start_hour,
          end_hour: data.end_hour,
          spot_number: spot.spot_number,
          provider_name: provider.full_name,
          provider_phone: provider.phone,
        });
      }
      setLoading(false);
    }
    load();
  }, [reservationId]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-8 text-center text-[var(--color-text-secondary)]">
        הזמנה לא נמצאה
      </div>
    );
  }

  const whatsappUrl = buildWhatsAppUrl(
    booking.provider_phone,
    buildThankYouMessage(booking.date, booking.start_hour, booking.end_hour)
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--color-success)] flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold">ההזמנה אושרה!</h2>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">מספר חניה</span>
          <span className="font-numbers font-bold text-lg">{booking.spot_number}</span>
        </div>
        <hr className="border-[var(--color-primary-pale)]" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">תאריך</span>
          <span className="font-numbers">{booking.date}</span>
        </div>
        <hr className="border-[var(--color-primary-pale)]" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">שעות</span>
          <span className="font-numbers">
            {formatHour(booking.start_hour)}–{formatHour(booking.end_hour)}
          </span>
        </div>
        <hr className="border-[var(--color-primary-pale)]" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">בעל החניה</span>
          <span>{booking.provider_name}</span>
        </div>
        <hr className="border-[var(--color-primary-pale)]" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">טלפון</span>
          <span className="font-numbers" dir="ltr">
            {formatPhoneDisplay(booking.provider_phone)}
          </span>
        </div>
      </Card>

      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <Button fullWidth variant="primary" className="bg-[#25D366] hover:bg-[#1da851]">
          שלח תודה בוואטסאפ
        </Button>
      </a>

      <button
        onClick={() => navigator.clipboard.writeText(booking.provider_phone)}
        className="text-sm text-[var(--color-primary)] text-center hover:underline"
      >
        העתק מספר טלפון
      </button>

      <Link href="/home">
        <Button fullWidth variant="outline">
          חזרה לדף הבית
        </Button>
      </Link>
    </div>
  );
}
