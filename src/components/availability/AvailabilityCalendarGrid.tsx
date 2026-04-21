"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import AvailabilityHourCell from "./AvailabilityHourCell";
import type { AvailabilityCellState } from "./AvailabilityHourCell";
import type { AggregatedAvailability } from "@/lib/types/domain";
import {
  get7DayWindow,
  formatDateISO,
  formatHour,
  isToday,
  clampToCurrentHour,
} from "@/lib/utils/time";

export interface ReservedRange {
  date: string;
  start_hour: number;
  end_hour: number;
}

interface AvailabilityCalendarGridProps {
  availability: AggregatedAvailability[];
  reservations?: ReservedRange[];
  providedReservations?: ReservedRange[];
}

interface HourInfo {
  count: number;
  isOwnOnly: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_H = 44;

function getShortDayName(date: Date): string {
  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  return days[date.getDay()];
}

export default function AvailabilityCalendarGrid({
  availability,
  reservations = [],
  providedReservations = [],
}: AvailabilityCalendarGridProps) {
  const dates = get7DayWindow();
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  // Build hour map: "YYYY-MM-DD_HH" → HourInfo
  const hourMap = useMemo(() => {
    const map = new Map<string, HourInfo>();
    for (const slot of availability) {
      for (let h = slot.start_hour; h < slot.end_hour; h++) {
        const key = `${slot.date}_${h}`;
        const existing = map.get(key);
        if (existing) {
          existing.count += slot.available_count;
          // Only "own" if ALL slots at this hour are own
          if (!slot.is_own_spot) existing.isOwnOnly = false;
        } else {
          map.set(key, {
            count: slot.available_count,
            isOwnOnly: slot.is_own_spot && slot.available_count === 1,
          });
        }
      }
    }
    return map;
  }, [availability]);

  // Flatten reservations to "YYYY-MM-DD_HH" keys
  const reservedHours = useMemo(() => {
    const set = new Set<string>();
    for (const r of reservations) {
      for (let h = r.start_hour; h < r.end_hour; h++) {
        set.add(`${r.date}_${h}`);
      }
    }
    return set;
  }, [reservations]);

  const providedBookedHours = useMemo(() => {
    const set = new Set<string>();
    for (const r of providedReservations) {
      for (let h = r.start_hour; h < r.end_hour; h++) {
        set.add(`${r.date}_${h}`);
      }
    }
    return set;
  }, [providedReservations]);

  // Sync vertical scroll between gutter and grid
  const syncScroll = useCallback((source: "gutter" | "grid") => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === "gutter" ? gutterRef.current : scrollRef.current;
    const to = source === "gutter" ? scrollRef.current : gutterRef.current;
    if (from && to) to.scrollTop = from.scrollTop;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    const currentHour = clampToCurrentHour();
    const target = Math.max(0, (currentHour - 1) * ROW_H);
    if (gutterRef.current) gutterRef.current.scrollTop = target;
    if (scrollRef.current) scrollRef.current.scrollTop = target;
  }, []);

  function getCellState(dayIndex: number, hour: number): AvailabilityCellState {
    const dateStr = formatDateISO(dates[dayIndex]);
    const key = `${dateStr}_${hour}`;
    // Priority: past → reserved (you booked) → own_booked (your spot was
    // booked) → own (your spot, still available) → available → empty.
    if (isToday(dates[dayIndex]) && hour < clampToCurrentHour()) return "past";
    if (reservedHours.has(key)) return "reserved";
    if (providedBookedHours.has(key)) return "own_booked";
    const info = hourMap.get(key);
    if (!info) return "empty";
    if (info.isOwnOnly) return "own";
    return "available";
  }

  function getHourInfo(dayIndex: number, hour: number): HourInfo | undefined {
    const dateStr = formatDateISO(dates[dayIndex]);
    return hourMap.get(`${dateStr}_${hour}`);
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="flex">
        {/* Fixed hour gutter */}
        <div
          ref={gutterRef}
          onScroll={() => syncScroll("gutter")}
          className="flex-shrink-0 w-10 overflow-y-auto overflow-x-hidden max-h-[65vh] scrollbar-hide"
        >
          {/* Header spacer */}
          <div className="h-14 sticky top-0 z-10 bg-[var(--color-surface)]" />
          {/* Hour labels */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex items-start justify-center pt-0.5 text-[10px] font-numbers text-[var(--color-text-muted)]"
              style={{ height: ROW_H }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Scrollable day columns */}
        <div
          ref={scrollRef}
          onScroll={() => syncScroll("grid")}
          className="flex-1 overflow-auto max-h-[65vh] border-s border-s-[var(--color-primary-pale)]/40"
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(7, minmax(44px, 1fr))`,
            }}
          >
            {/* Day headers */}
            {dates.map((date, i) => {
              const today = isToday(date);
              return (
                <div
                  key={formatDateISO(date)}
                  className={`sticky top-0 z-10 flex flex-col items-center justify-center py-1.5 border-b border-[var(--color-primary-pale)] bg-[var(--color-surface)] ${
                    i > 0
                      ? "border-s border-s-[var(--color-primary-pale)]/30"
                      : ""
                  }`}
                >
                  <span className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                    {getShortDayName(date)}
                  </span>
                  <span
                    className={`text-xs font-numbers font-bold leading-tight ${
                      today
                        ? "bg-[var(--color-primary)] text-white rounded-full w-6 h-6 flex items-center justify-center"
                        : "text-[var(--color-text-primary)]"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
              );
            })}

            {/* Hour cells */}
            {HOURS.flatMap((hour) =>
              dates.map((_, dayIndex) => {
                const state = getCellState(dayIndex, hour);
                const info = getHourInfo(dayIndex, hour);
                return (
                  <div
                    key={`c${dayIndex}h${hour}`}
                    className={
                      dayIndex > 0
                        ? "border-s border-s-[var(--color-primary-pale)]/30"
                        : ""
                    }
                    style={{ height: ROW_H }}
                  >
                    <AvailabilityHourCell
                      state={state}
                      availableCount={info?.count ?? 0}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
