"use client";

import { useRef, useCallback, useEffect } from "react";
import type { AvailabilitySlot } from "@/lib/types/domain";
import { isToday, clampToCurrentHour, formatDateISO, get7DayWindow } from "@/lib/utils/time";

export interface Selection {
  dayIndex: number;
  startHour: number;
  endHour: number;
}

interface UseCalendarDragOptions {
  existingOffers: AvailabilitySlot[];
  onSelectionChange: (sel: Selection | null) => void;
}

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 56;

export function useCalendarDrag({ existingOffers, onSelectionChange }: UseCalendarDragOptions) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ dayIndex: number; hour: number } | null>(null);
  const dates = get7DayWindow();

  // Get the hour from a pointer Y position relative to the grid
  const getHourFromY = useCallback((clientY: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const scrollTop = gridRef.current.scrollTop;
    const y = clientY - rect.top + scrollTop - HEADER_HEIGHT;
    const hour = Math.floor(y / ROW_HEIGHT);
    return Math.max(0, Math.min(23, hour));
  }, []);

  // Check if an hour is past (for today only)
  const isHourPast = useCallback((dayIndex: number, hour: number): boolean => {
    if (!isToday(dates[dayIndex])) return false;
    return hour < clampToCurrentHour();
  }, [dates]);

  // Check if an hour overlaps an existing offer
  const isHourOffered = useCallback((dayIndex: number, hour: number): boolean => {
    const dateStr = formatDateISO(dates[dayIndex]);
    return existingOffers.some(
      (offer) => offer.date === dateStr && hour >= offer.start_hour && hour < offer.end_hour
    );
  }, [dates, existingOffers]);

  // Find the nearest offer boundary to clamp selection
  const clampToOfferBoundary = useCallback(
    (dayIndex: number, startHour: number, endHour: number): { startHour: number; endHour: number } => {
      const dateStr = formatDateISO(dates[dayIndex]);
      const dayOffers = existingOffers
        .filter((o) => o.date === dateStr)
        .sort((a, b) => a.start_hour - b.start_hour);

      let clampedStart = startHour;
      let clampedEnd = endHour;

      for (const offer of dayOffers) {
        // If offer is between start and end, clamp
        if (offer.start_hour > clampedStart && offer.start_hour < clampedEnd) {
          // Offer blocks the range — decide which side to keep based on drag start
          if (dragStartRef.current) {
            const anchor = dragStartRef.current.hour;
            if (anchor < offer.start_hour) {
              clampedEnd = offer.start_hour;
            } else {
              clampedStart = offer.end_hour;
            }
          }
        }
        // If start is inside an offer
        if (clampedStart >= offer.start_hour && clampedStart < offer.end_hour) {
          clampedStart = offer.end_hour;
        }
        // If end is inside an offer
        if (clampedEnd > offer.start_hour && clampedEnd <= offer.end_hour) {
          clampedEnd = offer.start_hour;
        }
      }

      return { startHour: clampedStart, endHour: clampedEnd };
    },
    [dates, existingOffers]
  );

  const handlePointerDown = useCallback(
    (dayIndex: number, hour: number, e: React.PointerEvent) => {
      if (isHourPast(dayIndex, hour) || isHourOffered(dayIndex, hour)) return;

      isDraggingRef.current = true;
      dragStartRef.current = { dayIndex, hour };

      // Capture pointer on the grid so we get events even outside cells
      if (gridRef.current) {
        gridRef.current.setPointerCapture(e.pointerId);
      }

      onSelectionChange({ dayIndex, startHour: hour, endHour: hour + 1 });
    },
    [isHourPast, isHourOffered, onSelectionChange]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;

      const currentHour = getHourFromY(e.clientY);
      const { dayIndex, hour: anchorHour } = dragStartRef.current;

      let startHour = Math.min(anchorHour, currentHour);
      let endHour = Math.max(anchorHour, currentHour) + 1;

      // Clamp past hours for today
      if (isToday(dates[dayIndex])) {
        const minHour = clampToCurrentHour();
        startHour = Math.max(startHour, minHour);
      }

      // Clamp to 24
      endHour = Math.min(endHour, 24);

      // Clamp to offer boundaries
      const clamped = clampToOfferBoundary(dayIndex, startHour, endHour);

      if (clamped.endHour > clamped.startHour) {
        onSelectionChange({ dayIndex, startHour: clamped.startHour, endHour: clamped.endHour });
      }
    },
    [getHourFromY, dates, clampToOfferBoundary, onSelectionChange]
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    // Selection stays — user must confirm or cancel via the action bar
  }, []);

  // Attach move/up listeners to the grid
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    const preventTouchScroll = (e: TouchEvent) => {
      if (isDraggingRef.current) e.preventDefault();
    };

    grid.addEventListener("pointermove", onMove);
    grid.addEventListener("pointerup", onUp);
    grid.addEventListener("pointercancel", onUp);
    grid.addEventListener("touchmove", preventTouchScroll, { passive: false });

    return () => {
      grid.removeEventListener("pointermove", onMove);
      grid.removeEventListener("pointerup", onUp);
      grid.removeEventListener("pointercancel", onUp);
      grid.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [handlePointerMove, handlePointerUp]);

  return {
    gridRef,
    handlePointerDown,
    isHourPast,
    isHourOffered,
  };
}
