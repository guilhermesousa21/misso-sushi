export const BRASILIA_TIMEZONE = "America/Sao_Paulo";

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRASILIA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRASILIA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BRASILIA_TIMEZONE,
  weekday: "short",
});

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseSupabaseDate(value: string) {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function getBrasiliaDayOfWeek(date: Date = new Date()) {
  const weekday = weekdayFormatter.format(date);
  return weekdayMap[weekday] ?? date.getUTCDay();
}

export function getBrasiliaDateParts(date: Date = new Date()) {
  const parts = dateTimePartsFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  const hour = pick("hour");
  const minute = pick("minute");

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour,
    minute,
    dayOfWeek: getBrasiliaDayOfWeek(date),
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function getBrasiliaMinutesSinceMidnight(date: Date = new Date()) {
  return getBrasiliaDateParts(date).minutesSinceMidnight;
}

export function toBrasiliaDateKey(value: string | Date = new Date()) {
  const date = typeof value === "string" ? parseSupabaseDate(value) : value;
  const parts = dateKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatBrasiliaDateTime(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {}
) {
  const date = typeof value === "string" ? parseSupabaseDate(value) : value;
  return date.toLocaleString("pt-BR", {
    timeZone: BRASILIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatBrasiliaDateTimeShort(value: string | Date) {
  return formatBrasiliaDateTime(value, { year: undefined });
}

export function toBrasiliaInputValue(date: Date) {
  const parts = getBrasiliaDateParts(date);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function parseBrasiliaInputValue(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (!match) return new Date(value);
  return new Date(`${match[1]}:00-03:00`);
}

export function addDaysInBrasilia(date: Date, days: number) {
  const dayKey = toBrasiliaDateKey(date);
  const anchor = parseBrasiliaInputValue(`${dayKey}T12:00`);
  return new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);
}

export function roundUpToBrasiliaSlot(date: Date, slotMinutes: number) {
  const dayKey = toBrasiliaDateKey(date);
  const elapsed = getBrasiliaMinutesSinceMidnight(date);
  const rounded = Math.ceil(elapsed / slotMinutes) * slotMinutes;
  const start = parseBrasiliaInputValue(`${dayKey}T00:00`);
  return new Date(start.getTime() + rounded * 60 * 1000);
}

export function endOfBrasiliaDay(date: Date) {
  const dayKey = toBrasiliaDateKey(date);
  return parseBrasiliaInputValue(`${dayKey}T23:59`);
}

/** @deprecated Use toBrasiliaInputValue */
export const toLocalInputValue = toBrasiliaInputValue;
