import Link from "next/link";
import { getWeekWindow } from "@/lib/utils/time";
import { MAX_WEEKS_AHEAD } from "@/lib/constants";

interface WeekNavProps {
  weekOffset: number;
  basePath: string;
}

function formatRange(dates: Date[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const months = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${months[first.getMonth()]}`;
  }
  return `${first.getDate()} ${months[first.getMonth()]} – ${last.getDate()} ${months[last.getMonth()]}`;
}

function hrefForWeek(basePath: string, week: number): string {
  return week === 0 ? basePath : `${basePath}?week=${week}`;
}

export default function WeekNav({ weekOffset, basePath }: WeekNavProps) {
  const dates = getWeekWindow(weekOffset);
  const label = weekOffset === 0 ? "השבוע" : formatRange(dates);
  const prevDisabled = weekOffset <= 0;
  const nextDisabled = weekOffset >= MAX_WEEKS_AHEAD - 1;

  const buttonBase =
    "px-3 py-1.5 text-sm rounded-[var(--radius-button)] font-medium transition-colors";
  const enabledCls = "bg-[var(--color-primary-pale)] text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-pale)]/70";
  const disabledCls = "opacity-40 cursor-not-allowed bg-[var(--color-primary-pale)]/40 text-[var(--color-text-muted)]";

  return (
    <div className="flex items-center justify-between gap-2" dir="rtl">
      {prevDisabled ? (
        <span className={`${buttonBase} ${disabledCls}`} aria-disabled="true">
          → הקודם
        </span>
      ) : (
        <Link
          href={hrefForWeek(basePath, weekOffset - 1)}
          className={`${buttonBase} ${enabledCls}`}
          prefetch={false}
        >
          → הקודם
        </Link>
      )}

      <div className="text-sm font-semibold text-[var(--color-text-primary)]">
        {label}
      </div>

      {nextDisabled ? (
        <span className={`${buttonBase} ${disabledCls}`} aria-disabled="true">
          הבא ←
        </span>
      ) : (
        <Link
          href={hrefForWeek(basePath, weekOffset + 1)}
          className={`${buttonBase} ${enabledCls}`}
          prefetch={false}
        >
          הבא ←
        </Link>
      )}
    </div>
  );
}
