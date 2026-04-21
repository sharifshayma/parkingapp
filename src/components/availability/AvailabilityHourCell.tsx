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

function getStateClasses(state: AvailabilityCellState): string {
  switch (state) {
    case "past":
      return "cell-past opacity-40 cursor-not-allowed";
    case "reserved":
      return "bg-[var(--color-success)] cursor-not-allowed";
    case "own_booked":
      return "bg-[var(--color-navy-light)] cursor-not-allowed";
    case "own":
      return "bg-[var(--color-navy)] cursor-not-allowed";
    case "available":
      return "bg-[var(--color-primary-pale)] hover:bg-[var(--color-primary-light)] cursor-pointer transition-colors";
    case "empty":
      return "bg-[var(--color-surface)]";
  }
}

export default function AvailabilityHourCell({
  state,
  availableCount,
  onClick,
}: AvailabilityHourCellProps) {
  const stateCls = getStateClasses(state);
  const isClickable = state === "available";

  return (
    <div
      className={`h-full border-b border-[var(--color-primary-pale)]/40 select-none relative ${stateCls}`}
      onClick={isClickable ? onClick : undefined}
    >
      {state === "available" && (
        <span className="absolute top-0.5 end-1 text-[10px] font-numbers font-bold text-[var(--color-primary-dark)] leading-none">
          {availableCount}
        </span>
      )}
      {state === "own" && (
        <span className="absolute top-1 end-1 text-[10px] font-medium text-white leading-none">
          שלך
        </span>
      )}
      {state === "own_booked" && (
        <span className="absolute top-1 end-1 text-[10px] font-medium text-white leading-none">
          תפוס
        </span>
      )}
      {state === "reserved" && (
        <svg
          className="absolute top-1 end-1 text-white"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}
