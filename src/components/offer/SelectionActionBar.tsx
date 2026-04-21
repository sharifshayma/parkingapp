import Button from "@/components/ui/Button";
import { formatDateHebrew, formatHour } from "@/lib/utils/time";

interface SelectionActionBarProps {
  date: Date;
  startHour: number;
  endHour: number;
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
  onSubmit,
  onCancel,
  submitting,
  error,
  success,
}: SelectionActionBarProps) {
  return (
    <div className="fixed bottom-20 inset-x-4 z-40 animate-slide-up">
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-[var(--shadow-strong)] p-4 flex flex-col gap-3">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {formatDateHebrew(date)}
            </span>
            <span className="text-lg font-numbers font-bold text-[var(--color-primary-dark)]">
              {formatHour(startHour)} – {formatHour(endHour)}
            </span>
          </div>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {endHour - startHour} {endHour - startHour === 1 ? "שעה" : "שעות"}
          </span>
        </div>

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
