import React from "react";

export type AvailabilityCellState =
  | "past"
  | "available"
  | "own"
  | "own_booked"
  | "empty"
  | "reserved";

interface AvailabilityHourCellProps {
  state: AvailabilityCellState;
  availableCount: number;
  onClick?: () => void;
}

function getStateClasses(state: AvailabilityCellState, count: number): string {
  switch (state) {
    case "past":
      return "cell-past opacity-40 cursor-not-allowed";
    case "reserved":
      return "bg-[var(--color-success)] cursor-not-allowed";
    case "own_booked":
      return "bg-[var(--color-accent)] cursor-not-allowed";
    case "own":
      return "bg-[var(--color-navy)] cursor-not-allowed";
    case "available":
      return count >= 2
        ? "bg-[var(--color-primary-pale)] hover:bg-[var(--color-primary-light)] cursor-pointer transition-colors"
        : "bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary-light)] hover:bg-[var(--color-primary-pale)] cursor-pointer transition-colors";
    case "empty":
      return "bg-[var(--color-surface)]";
  }
}

export default function AvailabilityHourCell({
  state,
  availableCount,
  onClick,
}: AvailabilityHourCellProps) {
  const stateCls = getStateClasses(state, availableCount);
  const isClickable = state === "available";

  return (
    <div
      className={`h-full border-b border-[var(--color-primary-pale)]/40 select-none relative ${stateCls}`}
      onClick={isClickable ? onClick : undefined}
    >
      {state === "available" && (
        <span className="absolute top-0.5 end-1 text-[9px] font-numbers font-bold text-[var(--color-primary-dark)]">
          {availableCount}
        </span>
      )}
      {state === "own" && (
        <span className="absolute top-1 end-1 text-[9px] font-medium text-white">
          שלך
        </span>
      )}
      {state === "own_booked" && (
        <span className="absolute top-1 end-1 text-[9px] font-medium text-white">
          נתפס
        </span>
      )}
      {state === "reserved" && (
        <span className="absolute top-1 end-1 text-[10px] font-bold text-white leading-none">
          ✓
        </span>
      )}
    </div>
  );
}
