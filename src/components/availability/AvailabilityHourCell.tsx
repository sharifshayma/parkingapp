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
}

function getStateClasses(state: AvailabilityCellState): string {
  switch (state) {
    case "past":
      return "cell-past opacity-40";
    case "reserved":
      return "bg-[var(--color-success)]";
    case "own_booked":
      return "bg-[var(--color-navy-light)]";
    case "own":
      return "bg-[var(--color-navy)]";
    case "available":
      return "bg-[var(--color-primary-pale)]";
    case "empty":
      return "bg-[var(--color-surface)]";
  }
}

export default function AvailabilityHourCell({
  state,
}: AvailabilityHourCellProps) {
  const stateCls = getStateClasses(state);

  return (
    <div
      className={`h-full border-b border-[var(--color-primary-pale)]/40 select-none relative ${stateCls}`}
    >
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
