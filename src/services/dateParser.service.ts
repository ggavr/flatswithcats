/**
 * Simplified date range parser using chrono-node library
 * Replaces 270-line custom parser with robust, tested library
 */

import * as chrono from 'chrono-node';
import { ValidationError } from '../core/errors';

const pad = (value: number) => value.toString().padStart(2, '0');

/**
 * Parse a date range string and return normalized format: DD.MM.YYYY - DD.MM.YYYY
 * 
 * Supports various formats:
 * - "15.01.2024 - 20.01.2024"
 * - "15 января - 20 января 2024"
 * - "15-20 января"
 * - "January 15 - January 20, 2024"
 * - Mixed Russian/English month names
 */
export const normalizeDateRange = (value: string): string => {
  const input = value?.trim();
  if (!input) {
    throw new ValidationError('Укажи даты поиска опекуна.');
  }

  // Try to parse with Russian locale first (supports Cyrillic month names)
  const ruParser = new chrono.Chrono(chrono.ru.createCasualConfiguration());
  const enParser = chrono.en; // English parser as fallback

  // Try Russian parser first
  let results = ruParser.parse(input, new Date(), { forwardDate: true });
  
  // If no results, try English parser
  if (!results || results.length < 1) {
    results = enParser.parse(input, new Date(), { forwardDate: true });
  }

  // We need at least one result for a date range
  if (!results || results.length < 1) {
    throw new ValidationError('Не удалось распознать диапазон дат. Укажи начало и конец периода.');
  }

  let startDate: Date;
  let endDate: Date;

  if (results.length === 1 && results[0].start && results[0].end) {
    // Single result with both start and end (e.g., "15-20 января")
    startDate = results[0].start.date();
    endDate = results[0].end.date();
  } else if (results.length >= 2) {
    // Two separate dates parsed
    startDate = results[0].start.date();
    endDate = results[1].start.date();
  } else if (results.length === 1 && results[0].start) {
    // Only one date found - this is not a valid range
    throw new ValidationError('Не удалось распознать диапазон дат. Укажи начало и конец периода.');
  } else {
    throw new ValidationError('Не удалось распознать диапазон дат. Укажи начало и конец периода.');
  }

  // Validate dates
  if (!startDate || isNaN(startDate.getTime())) {
    throw new ValidationError('Дата начала указана некорректно.');
  }
  if (!endDate || isNaN(endDate.getTime())) {
    throw new ValidationError('Дата окончания указана некорректно.');
  }

  // If end date is before start date, assume end date is next year
  // (This is common for date ranges like "15 декабря - 5 января")
  if (endDate < startDate) {
    // Simple heuristic: if the difference is more than 180 days, it's probably an error
    const daysDiff = (startDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 180) {
      throw new ValidationError('Дата окончания раньше даты начала. Проверь, пожалуйста, период.');
    }
    // Add one year to end date
    endDate = new Date(endDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // Format as DD.MM.YYYY - DD.MM.YYYY
  const formattedStart = `${pad(startDate.getDate())}.${pad(startDate.getMonth() + 1)}.${startDate.getFullYear()}`;
  const formattedEnd = `${pad(endDate.getDate())}.${pad(endDate.getMonth() + 1)}.${endDate.getFullYear()}`;

  return `${formattedStart} - ${formattedEnd}`;
};

/**
 * Parse a single date string and return a Date object
 * Used for internal validation and testing
 */
export const parseDate = (value: string): Date => {
  const input = value?.trim();
  if (!input) {
    throw new ValidationError('Дата не может быть пустой.');
  }

  const ruParser = new chrono.Chrono(chrono.ru.createCasualConfiguration());
  const results = ruParser.parse(input, new Date(), { forwardDate: true });

  if (!results || results.length === 0 || !results[0].start) {
    // Try English parser as fallback
    const enResults = chrono.en.parse(input, new Date(), { forwardDate: true });
    if (!enResults || enResults.length === 0 || !enResults[0].start) {
      throw new ValidationError(`Не удалось распознать дату «${input}».`);
    }
    return enResults[0].start.date();
  }

  return results[0].start.date();
};

