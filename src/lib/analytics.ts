import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });

  initialized = true;
}

export function identifyUser(userId: string, phone: string) {
  posthog.identify(userId, { phone });
}

export const track = {
  // Auth
  phoneEntered: () => posthog.capture("phone_entered"),
  otpRequested: () => posthog.capture("otp_requested"),
  otpVerified: () => posthog.capture("otp_verified"),
  profileCompleted: () => posthog.capture("profile_completed"),

  // Offer
  offerStarted: () => posthog.capture("offer_started"),
  offerDateSelected: (date: string) =>
    posthog.capture("offer_date_selected", { date }),
  offerTimeSelected: (start: number, end: number) =>
    posthog.capture("offer_time_selected", { start, end }),
  offerSubmitted: () => posthog.capture("offer_submitted"),
  offerAbandoned: () => posthog.capture("offer_abandoned"),

  // Booking
  availabilityViewed: (date: string) =>
    posthog.capture("availability_viewed", { date }),
  slotTapped: (count: number) =>
    posthog.capture("slot_tapped", { available_count: count }),
  bookingTimeSelected: (start: number, end: number) =>
    posthog.capture("booking_time_selected", { start, end }),
  bookingConfirmed: () => posthog.capture("booking_confirmed"),
  bookingCancelled: () => posthog.capture("booking_cancelled"),
  whatsappTapped: () => posthog.capture("whatsapp_tapped"),

  // Dashboard
  dashboardViewed: () => posthog.capture("dashboard_viewed"),
  historyViewed: () => posthog.capture("history_viewed"),
};
