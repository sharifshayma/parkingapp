import React from "react";

export type CellState = "past" | "available" | "selecting" | "existing";

interface HourCellProps {
  dayIndex: number;
  hour: number;
  state: CellState;
  onPointerDown: (dayIndex: number, hour: number, e: React.PointerEvent) => void;
}

const stateStyles: Record<CellState, string> = {
  past: "cell-past opacity-40 cursor-not-allowed",
  available:
    "bg-[var(--color-surface)] hover:bg-[var(--color-primary-pale)] cursor-pointer transition-colors",
  selecting:
    "bg-[var(--color-primary-light)] border-s-3 border-s-[var(--color-primary)]",
  existing:
    "bg-[var(--color-primary-pale)] border-s-3 border-s-[var(--color-primary)]",
};

export default function HourCell({ dayIndex, hour, state, onPointerDown }: HourCellProps) {
  return (
    <div
      className={`h-full border-b border-[var(--color-primary-pale)]/40 select-none relative ${stateStyles[state]}`}
      onPointerDown={(e) => {
        if (state === "past" || state === "existing") return;
        onPointerDown(dayIndex, hour, e);
      }}
      data-day={dayIndex}
      data-hour={hour}
    >
      {state === "existing" && (
        <span className="absolute top-1 end-1 text-[10px] font-medium text-[var(--color-primary-dark)]">
          מוצע
        </span>
      )}
    </div>
  );
}
