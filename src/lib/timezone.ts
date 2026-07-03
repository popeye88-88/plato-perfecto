// Timezone helpers. All display and per-day bucketing must go through the
// business's configured timezone (default America/Mexico_City), independent
// of the operator's browser locale.

export const DEFAULT_TZ = 'America/Mexico_City';

/**
 * Returns a Date whose UTC fields encode the wall-clock time of `date` in `tz`.
 * Useful to reuse date-fns helpers (startOfDay, format, etc.) as if the date
 * were local, then convert back with `fromZonedWallClock`.
 */
export function toZonedWallClock(date: Date, tz: string = DEFAULT_TZ): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value);
  const hour = get('hour') % 24; // Intl may return 24 for midnight
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second')));
}

/**
 * Converts a "wall clock" Date (UTC fields = local time in `tz`) back to
 * the real UTC instant.
 */
export function fromZonedWallClock(wall: Date, tz: string = DEFAULT_TZ): Date {
  const offset = toZonedWallClock(wall, tz).getTime() - wall.getTime();
  return new Date(wall.getTime() - offset);
}

/** Start-of-day UTC instant for the day that contains `date` in `tz`. */
export function startOfDayInTz(date: Date, tz: string = DEFAULT_TZ): Date {
  const wall = toZonedWallClock(date, tz);
  wall.setUTCHours(0, 0, 0, 0);
  return fromZonedWallClock(wall, tz);
}

/** End-of-day UTC instant (23:59:59.999) for the day of `date` in `tz`. */
export function endOfDayInTz(date: Date, tz: string = DEFAULT_TZ): Date {
  const wall = toZonedWallClock(date, tz);
  wall.setUTCHours(23, 59, 59, 999);
  return fromZonedWallClock(wall, tz);
}

/** Parses a YYYY-MM-DD string as the start of that day in `tz`. */
export function parseDateStrInTz(dateStr: string, tz: string = DEFAULT_TZ): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wall = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0));
  return fromZonedWallClock(wall, tz);
}

/** Formats a date in the given TZ. `locale` defaults to es-MX. */
export function formatInTz(
  date: Date,
  tz: string = DEFAULT_TZ,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  locale: string = 'es-MX',
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: tz }).format(date);
}

/** YYYY-MM-DD of `date` in `tz` (for CSV filenames, day keys, etc.). */
export function ymdInTz(date: Date, tz: string = DEFAULT_TZ): string {
  return formatInTz(date, tz, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
}
