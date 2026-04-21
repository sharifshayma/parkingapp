import Button from "@/components/ui/Button";
import { formatDateHebrew, formatHour } from "@/lib/utils/time";

interface SelectionActionBarProps {
  date: Date;
  startHour: number;
  endHour: number;
  nextDayEndHour: number | null;
  onNextDayEndHourChange: (hour: number | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  error?: string;
  success?: boolean;
}

export default function SelectionActionBar({
  date,
  startHour,
  endHour,
  nextDayEndHour,
  onNextDayEndHourChange,
  onSubmit,
  onCancel,
  submitting,
  error,
  success,
}: SelectionActionBarProps) {
  const canExtend = endHour === 24;
  const totalHours = nextDayEndHour !== null ? endHour - startHour + nextDayEndHour : endHour - startHour;

  return (
    <div className="fixed bottom-20 inset-x-4 z-40 animate-slide-up">
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-[var(--shadow-strong)] p-4 flex flex-col gap-3">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {formatDateHebrew(date)}
              {nextDayEndHour !== null && (
                <span className="text-[var(--color-text-secondary)]"> → למחרת</span>
              )}
            </span>
            <span className="text-lg font-numbers font-bold text-[var(--color-primary-dark)]">
              {formatHour(startHour)} – {formatHour(nextDayEndHour ?? endHour)}
            </span>
          </div>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {totalHours} {totalHours === 1 ? "שעה" : "שעות"}
          </span>
        </div>

        {/* Extend past midnight (only when selection ends at 24:00) */}
        {canExtend && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={nextDayEndHour !== null}
                onChange={(e) => onNextDayEndHourChange(e.target.checked ? 6 : null)}
                disabled={submitting}
              />
              ממשיך למחרת עד
            </label>
            {nextDayEndHour !== null && (
              <select
                className="font-numbers border border-[var(--color-primary-pale)] rounded-md px-2 py-1"
                value={nextDayEndHour}
                onChange={(e) => onNextDayEndHourChange(Number(e.target.value))}
                disabled={submitting}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <p className="text-sm text-[var(--color-error)] text-center">{error}</p>
        )}
        {success && (
          <p className="text-sm text-[var(--color-success)] text-center">
            החניה נוספה בהצלחה!
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
            ביטול
          </Button>
          <Button size="sm" fullWidth onClick={onSubmit} disabled={submitting}>
            {submitting ? "מוסיף..." : "הצע חניה"}
          </Button>
        </div>
      </div>
    </div>
  );
}
