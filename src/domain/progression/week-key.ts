import { z } from "zod";

export const weekStartOptions = ["monday", "sunday"] as const;

export type WeekStartsOn = (typeof weekStartOptions)[number];

export const defaultWeekTimeZone = "America/Sao_Paulo";
export const defaultWeekStartsOn: WeekStartsOn = "monday";

export const weekConfigurationSchema = z.object({
  timeZone: z.string().trim().min(1).max(64).default(defaultWeekTimeZone),
  weekStartsOn: z.enum(weekStartOptions).default(defaultWeekStartsOn),
});

export type WeekConfiguration = z.infer<typeof weekConfigurationSchema>;

export type WeekWindow = Readonly<{
  endsAt: string;
  key: string;
  startsAt: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}>;

const dayMs = 24 * 60 * 60 * 1000;

type LocalDateParts = Readonly<{
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
}>;

function readLocalParts(instant: Date, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    day: Number(parts.day),
    // `hour12: false` yields 24 for midnight in some engines.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  };
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = readLocalParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - instant.getTime();
}

/**
 * Resolves the UTC instant of local midnight for a calendar date in `timeZone`.
 * The offset is measured twice so that days crossing a DST change still land on
 * the real local midnight.
 */
function localMidnightToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
  const firstGuess = new Date(naive - timeZoneOffsetMs(new Date(naive), timeZone));
  return new Date(naive - timeZoneOffsetMs(firstGuess, timeZone));
}

function localWeekdayIndex(instant: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Calculates the week a moment belongs to from the person's own timezone and
 * week-start preference — never from the server clock. The key is the local
 * date of the first day of the week (`YYYY-MM-DD`), which sorts naturally and
 * stays stable across DST transitions.
 */
export function resolveWeekWindow(
  instant: Date,
  configuration: Partial<WeekConfiguration> = {},
): WeekWindow {
  const { timeZone, weekStartsOn } = weekConfigurationSchema.parse(configuration);
  const local = readLocalParts(instant, timeZone);
  const weekdayIndex = localWeekdayIndex(instant, timeZone);
  const startIndex = weekStartsOn === "monday" ? 1 : 0;
  const daysSinceStart = (weekdayIndex - startIndex + 7) % 7;

  const localMidnight = localMidnightToUtc(local.year, local.month, local.day, timeZone);
  const startProbe = new Date(localMidnight.getTime() - daysSinceStart * dayMs);
  const startParts = readLocalParts(startProbe, timeZone);
  const startsAt = localMidnightToUtc(startParts.year, startParts.month, startParts.day, timeZone);

  const endProbe = new Date(startsAt.getTime() + 7 * dayMs);
  const endParts = readLocalParts(endProbe, timeZone);
  const endsAt = localMidnightToUtc(endParts.year, endParts.month, endParts.day, timeZone);

  return {
    endsAt: endsAt.toISOString(),
    key: formatDateKey(startParts.year, startParts.month, startParts.day),
    startsAt: startsAt.toISOString(),
    timeZone,
    weekStartsOn,
  };
}

export function resolveWeekKey(
  instant: Date,
  configuration: Partial<WeekConfiguration> = {},
): string {
  return resolveWeekWindow(instant, configuration).key;
}

/** Returns the `count` week keys ending at the week of `instant`, newest first. */
export function listRecentWeekKeys(
  instant: Date,
  count: number,
  configuration: Partial<WeekConfiguration> = {},
): string[] {
  const keys: string[] = [];
  let cursor = resolveWeekWindow(instant, configuration);

  for (let index = 0; index < Math.max(0, count); index += 1) {
    keys.push(cursor.key);
    cursor = resolveWeekWindow(
      new Date(new Date(cursor.startsAt).getTime() - dayMs),
      configuration,
    );
  }

  return keys;
}

export function isWeekKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
