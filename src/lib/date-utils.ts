import { format, parseISO, isValid } from 'date-fns';

export const STORAGE_DATE_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_DATE_FORMAT = 'dd MMM yyyy';
export const DISPLAY_TIME_FORMAT = 'h:mm a';
export const DISPLAY_DATETIME_FORMAT = 'dd MMM yyyy, h:mm a';

/**
 * Formats a date or string into a display date.
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!isValid(d)) return 'Invalid Date';
  return format(d as Date, DISPLAY_DATE_FORMAT);
}

/**
 * Formats a date or string into a display time.
 */
export function formatDisplayTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!isValid(d)) return 'Invalid Time';
  return format(d as Date, DISPLAY_TIME_FORMAT);
}

/**
 * Formats a date or string into a display datetime.
 */
export function formatDisplayDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!isValid(d)) return 'Invalid Date/Time';
  return format(d as Date, DISPLAY_DATETIME_FORMAT);
}

/**
 * Parses various string formats into a Date object.
 * Robust enough to handle ISO, YYYY-MM-DD HH:mm:ss, and DD/MM/YYYY.
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  
  // Try ISO first
  const isoDate = parseISO(dateStr);
  if (isValid(isoDate)) return isoDate;

  // Try YYYY-MM-DD HH:mm:ss
  if (dateStr.includes('-') && dateStr.includes(' ')) {
      return new Date(dateStr.replace(' ', 'T'));
  }

  // Try DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }

  return new Date(dateStr);
}

/**
 * Returns the current IST date string in YYYY-MM-DD format.
 */
export function getISTDateString(): string {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return format(now, STORAGE_DATE_FORMAT);
}

/**
 * Returns the current IST time string in HH:mm:ss format.
 */
export function getISTTimeString(): string {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return now.toLocaleTimeString("en-US", { hour12: false });
}

/**
 * Checks if a date string is within the last 30 days.
 */
export function isWithinLast30Days(dateStr: string): boolean {
    if (!dateStr || dateStr === '—') return false;
    try {
        const d = parseDate(dateStr);
        if (!isValid(d)) return false;
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    } catch (e) {
        return false;
    }
}
