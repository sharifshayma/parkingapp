import React from "react";

export type AvailabilityCellState = "past" | "available" | "own" | "empty";

interface AvailabilityHourCellProps {
  state: AvailabilityCellState;
  availableCount: number;
  onClick?: () => void;
}

const stateStyles: Record<AvailabilityCellState, string> = {
  past: "cell-past opacity-40 cursor-not-allowed",
  available:
    "bg-[var(--color-primary-pale)] hover:bg-[var(--color-primary-light)] cursor-pointer transition-colors",
  own: "bg-[var(--color-accent-light)] opacity-60 cursor-not-allowed",
  empty: "bg-[var(--color-surface)]",
};

export default function AvailabilityHourCell({
  state,
  availableCount,
  onClick,
}: AvailabilityHourCellProps) {
  return (
    <div
      className={`h-full border-b border-[var(--color-primary-pale)]/40 select-none relative ${stateStyles[state]}`}
      onClick={state === "available" ? onClick : undefined}
    >
      {state === "available" && availableCount > 1 && (
        <span className="absolute top-0.5 end-1 text-[9px] font-numbers font-bold text-[var(--color-primary-dark)]">
          {availableCount}
        </span>
      )}
      {state === "own" && (
        <span className="absolute top-1 end-1 text-[9px] font-medium text-[var(--color-accent)]">
          שלך
        </span>
      )}
    </div>
  );
}
