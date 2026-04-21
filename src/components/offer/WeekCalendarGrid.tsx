"use client";

import { useEffect, useRef, useCallback } from "react";
import HourCell from "./HourCell";
import type { CellState } from "./HourCell";
import type { Selection } from "@/hooks/useCalendarDrag";
import { useCalendarDrag } from "@/hooks/useCalendarDrag";
import {
  get7DayWindow,
  formatDateISO,
  formatHour,
  isToday,
  clampToCurrentHour,
} from "@/lib/utils/time";
import type { AvailabilitySlot } from "@/lib/types/domain";

interface WeekCalendarGridProps {
  existingOffers: AvailabilitySlot[];
  selection: Selection | null;
  onSelectionChange: (sel: Selection | null) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_H = 44;

function getShortDayName(date: Date): string {
  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  return days[date.getDay()];
}

export default function WeekCalendarGrid({
  existingOffers,
  selection,
  onSelectionChange,
}: WeekCalendarGridProps) {
  const dates = get7DayWindow();
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const { gridRef, handlePointerDown, isHourPast, isHourOffered } = useCalendarDrag({
    existingOffers,
    onSelectionChange,
  });

  // Sync vertical scroll between gutter and grid
  const syncScroll = useCallback((source: "gutter" | "grid") => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === "gutter" ? gutterRef.current : scrollRef.current;
    const to = source === "gutter" ? scrollRef.current : gutterRef.current;
    if (from && to) to.scrollTop = from.scrollTop;
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    const currentHour = clampToCurrentHour();
    const target = Math.max(0, (currentHour - 1) * ROW_H);
    if (gutterRef.current) gutterRef.current.scrollTop = target;
    if (scrollRef.current) scrollRef.current.scrollTop = target;
  }, []);

  function getCellState(dayIndex: number, hour: number): CellState {
    if (
      selection &&
      selection.dayIndex === dayIndex &&
      hour >= selection.startHour &&
      hour < selection.endHour
    ) {
      return "selecting";
    }
    if (isHourPast(dayIndex, hour)) return "past";
    if (isHourOffered(dayIndex, hour)) return "existing";
    return "available";
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
            ref={gridRef}
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
                    i > 0 ? "border-s border-s-[var(--color-primary-pale)]/30" : ""
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
              dates.map((_, dayIndex) => (
                <div
                  key={`c${dayIndex}h${hour}`}
                  className={
                    dayIndex > 0 ? "border-s border-s-[var(--color-primary-pale)]/30" : ""
                  }
                  style={{ height: ROW_H }}
                >
                  <HourCell
                    dayIndex={dayIndex}
                    hour={hour}
                    state={getCellState(dayIndex, hour)}
                    onPointerDown={handlePointerDown}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
