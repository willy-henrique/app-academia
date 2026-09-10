/**
 * Week resolution for server-side projections. Mirrors
 * `src/domain/progression/week-key.ts`; keep both in sync.
 * The week always comes from the person's timezone, never from the server clock.
 */

export const defaultWeekTimeZone = "America/Sao_Paulo";
export const defaultWeekStartsOn = "monday";

const dayMs = 24 * 60 * 60 * 1000;

function readLocalParts(instant, timeZone) {
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
  );

  return {
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  };
}

function timeZoneOffsetMs(instant, timeZone) {
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

function localMidnightToUtc(year, month, day, timeZone) {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
  const firstGuess = new Date(naive - timeZoneOffsetMs(new Date(naive), timeZone));
  return new Date(naive - timeZoneOffsetMs(firstGuess, timeZone));
}

function localWeekdayIndex(instant, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function formatDateKey(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function resolveWeekWindow(instant, configuration = {}) {
  const timeZone = configuration.timeZone || defaultWeekTimeZone;
  const weekStartsOn = configuration.weekStartsOn === "sunday" ? "sunday" : defaultWeekStartsOn;
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

export function resolveWeekKey(instant, configuration = {}) {
  return resolveWeekWindow(instant, configuration).key;
}

/** Rebuilds the window of an already known week key (local midnight to midnight). */
export function resolveWeekWindowFromKey(weekKey, configuration = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return null;
  }

  const [year, month, day] = weekKey.split("-").map(Number);
  const timeZone = configuration.timeZone || defaultWeekTimeZone;
  const startsAt = localMidnightToUtc(year, month, day, timeZone);
  const window = resolveWeekWindow(startsAt, configuration);

  return window.key === weekKey ? window : null;
}
