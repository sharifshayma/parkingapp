import { WEEK_DAYS, MAX_WEEKS_AHEAD, HOURS_IN_DAY } from "@/lib/constants";

export function clampToCurrentHour(): number {
  return new Date().getHours();
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function formatHour(hour: number): string {
  if (hour === 24) return "00:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

export function generateHourOptions(
  selectedDate: Date,
  isStart: boolean,
  otherHour?: number
): number[] {
  const today = isToday(selectedDate);
  const minHour = today ? clampToCurrentHour() : 0;
  const hours: number[] = [];

  if (isStart) {
    // Start hours: from minHour to 23 (leave room for at least 1hr)
    for (let h = minHour; h <= 23; h++) {
      hours.push(h);
    }
  } else {
    // End hours: from (startHour + 1) to 24
    const from = otherHour !== undefined ? otherHour + 1 : minHour + 1;
    for (let h = from; h <= HOURS_IN_DAY; h++) {
      hours.push(h);
    }
  }

  return hours;
}

export function splitCrossMidnight(
  date: string,
  startHour: number,
  endHour: number
): Array<{ date: string; startHour: number; endHour: number }> {
  if (endHour > startHour) {
    // Normal same-day range
    return [{ date, startHour, endHour }];
  }

  // Cross-midnight: split into two days
  const nextDate = getNextDate(date);
  return [
    { date, startHour, endHour: HOURS_IN_DAY },
    { date: nextDate, startHour: 0, endHour },
  ];
}

export function getWeekWindow(weekOffset: number = 0): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const startOffset = weekOffset * WEEK_DAYS;
  for (let i = 0; i < WEEK_DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + startOffset + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

// Returns all dates from today through the last allowed week (inclusive).
// Used by pickers that show the full future window in a single dropdown.
export function getMonthWindow(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const total = WEEK_DAYS * MAX_WEEKS_AHEAD;
  for (let i = 0; i < total; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

// Legacy alias — new code should prefer getWeekWindow(0).
export function get7DayWindow(): Date[] {
  return getWeekWindow(0);
}

export function formatDateHebrew(date: Date): string {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `יום ${dayName}, ${day}/${month}`;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return formatDateISO(d);
}
