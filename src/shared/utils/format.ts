/**
 * Shared formatting utilities.
 *
 * NEVER duplicate these helpers in screen/component files.
 * Import from "@/shared/utils/format".
 */

const TIMEZONE = "America/Santiago";
const LOCALE = "es-CL";

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Format a number as currency with the correct prefix.
 *
 * @param amount  Numeric value to format.
 * @param currency  "USD" → US$, anything else → $ (CLP).
 */
export const formatCurrency = (
  amount: number,
  currency: string = "CLP",
): string => {
  const prefix = currency === "USD" ? "US$" : "$";
  return `${prefix}${amount.toLocaleString(LOCALE)}`;
};

/**
 * Format a number as CLP-only (no currency param needed).
 */
export const formatCLP = (amount: number): string => {
  return `$${amount.toLocaleString(LOCALE)}`;
};

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * Full date: "02 mar. 2026"
 */
export const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(LOCALE, {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

/**
 * Short date without year: "02 mar."
 */
export const formatShortDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(LOCALE, {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
};

/**
 * Format a Date object as DD/MM/YYYY (used in form inputs).
 */
export const formatDateInput = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Day grouping key: "lunes 2 de marzo"
 */
export const getDayKey = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(LOCALE, {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
};

/**
 * Get the 1-based month number of a date in Chile timezone.
 */
export const getMonthIndex = (dateStr: string): number => {
  try {
    const date = new Date(dateStr);
    const monthStr = date.toLocaleDateString(LOCALE, {
      timeZone: TIMEZONE,
      month: "numeric",
    });
    return parseInt(monthStr, 10);
  } catch {
    return 0;
  }
};

/**
 * Format a Date object as "yyyy-MM-dd" for API payloads.
 * This format avoids timezone conversion issues when sent to the backend.
 */
export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};
