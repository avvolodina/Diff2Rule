import { DateTime } from 'luxon';

/**
 * Formats a date as ISO string (YYYY-MM-DD HH:mm:ss).
 * If the date is falsy, returns an empty string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string or an empty string.
 */
export function formatDateIso(date) {
  if (!date) return '';

  return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss');
}

/**
 * Formats a date string (ISO like "2024-12-19T09:42:54.440Z") as an ISO string
 * (YYYY-MM-DD HH:mm:ss format).
 * @param {*} dateString
 * @returns {string} The formatted date string, or null if the input is invalid,
 * or an empty string if the input is null or undefined.
 */
export function formatStringDateIso(dateString) {
  if (dateString == null) return '';

  const date = DateTime.fromISO(dateString);
  if (date.isValid) {
    return date.toFormat('yyyy-MM-dd HH:mm:ss');
  }

  return null;
}

/**
 * Regular expression to match the IDO date format (YYYY-MM-DD HH:mm:ss).
 */
export const rxDateFormatIso = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
