const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole calendar days from `today` to `eventDate` (YYYY-MM-DD).
// Positive = in the future, 0 = today, negative = in the past.
export function daysUntil(eventDate: string, today: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  if (!match) {
    throw new Error("Invalid date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const event = new Date(Date.UTC(year, month, day));
  // Date.UTC rolls over invalid dates (30 Feb becomes 2 Mar), so compare back.
  if (
    event.getUTCFullYear() !== year ||
    event.getUTCMonth() !== month ||
    event.getUTCDate() !== day
  ) {
    throw new Error("Invalid date");
  }

  // UTC midnight of both dates: no daylight saving, so every day is 24 h.
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((event.getTime() - todayUtc) / MS_PER_DAY);
}
