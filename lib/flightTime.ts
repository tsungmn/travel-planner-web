import type { Flight } from "@/types";

type FlightTimes = Pick<
  Flight,
  "dep_local" | "arr_local" | "dep_tz" | "arr_tz"
>;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const LOCAL_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function parseWallTime(localIso: string): number | null {
  const match = LOCAL_ISO_PATTERN.exec(localIso);
  if (!match) return null;

  const date = new Date(0);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);

  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  return date.getTime();
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
}

function offsetAt(instant: number, formatter: Intl.DateTimeFormat): number {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .map(({ type, value }) => [type, value]),
  );

  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return wall - instant;
}

export function toInstant(localIso: string, timeZone: string): number | null {
  const wallTime = parseWallTime(localIso);
  if (wallTime === null) return null;

  try {
    const formatter = getFormatter(timeZone);
    const offsets = new Set<number>();

    for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
      offsets.add(offsetAt(wallTime + hours * HOUR_MS, formatter));
    }

    const candidates = [...offsets]
      .map((offset) => wallTime - offset)
      .filter((candidate) => {
        return candidate + offsetAt(candidate, formatter) === wallTime;
      });

    return candidates.length === 1 ? candidates[0] : null;
  } catch {
    return null;
  }
}

function departureInstant(flight: FlightTimes): number | null {
  if (!flight.dep_local || !flight.dep_tz) return null;
  return toInstant(flight.dep_local, flight.dep_tz);
}

function arrivalInstant(flight: FlightTimes): number | null {
  if (!flight.arr_local || !flight.arr_tz) return null;
  return toInstant(flight.arr_local, flight.arr_tz);
}

export function flightDurationMs(flight: FlightTimes): number | null {
  const departure = departureInstant(flight);
  const arrival = arrivalInstant(flight);

  if (departure === null || arrival === null) return null;
  return arrival - departure;
}

export function layoverMs(prev: Flight, curr: Flight): number | null {
  const arrival = arrivalInstant(prev);
  const departure = departureInstant(curr);

  if (arrival === null || departure === null) return null;
  return departure - arrival;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";

  const minutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

export function flightDurationLabel(flight: FlightTimes): string | null {
  const duration = flightDurationMs(flight);
  if (duration === null) return null;
  return formatDuration(duration) || null;
}

export function layoverLabel(prev: Flight, curr: Flight): string | null {
  const duration = layoverMs(prev, curr);
  if (duration === null) return null;
  return formatDuration(duration) || null;
}

export function isLongLayover(prev: Flight, curr: Flight): boolean {
  const duration = layoverMs(prev, curr);
  return duration !== null && duration >= 12 * HOUR_MS;
}

export function isNextDayArrival(flight: FlightTimes): boolean {
  if (!flight.dep_local || !flight.arr_local) return false;

  const departureDay = Date.parse(`${flight.dep_local.slice(0, 10)}T00:00:00Z`);
  const arrivalDay = Date.parse(`${flight.arr_local.slice(0, 10)}T00:00:00Z`);

  return (
    Number.isFinite(departureDay) &&
    Number.isFinite(arrivalDay) &&
    arrivalDay > departureDay
  );
}

export function sortFlightsByDirection(
  flights: Flight[],
  direction: Flight["direction"],
): Flight[] {
  return flights
    .filter((flight) => flight.direction === direction)
    .sort((a, b) => {
      const aTime = departureInstant(a);
      const bTime = departureInstant(b);

      if (aTime !== null && bTime !== null) return aTime - bTime;
      if (aTime !== null) return -1;
      if (bTime !== null) return 1;

      return (a.dep_local ?? "").localeCompare(b.dep_local ?? "");
    });
}

export function routeSummary(flights: Flight[]): string {
  if (flights.length === 0) return "";

  const parts = [flights[0].dep_airport ?? "?"];

  for (const flight of flights) {
    const arrival = flight.arr_airport ?? "?";

    if (parts[parts.length - 1] !== arrival) {
      parts.push(arrival);
    }
  }

  return parts.join(" → ");
}

export function totalTravelMs(flights: Flight[]): number | null {
  if (flights.length === 0) return null;

  let total = 0;

  for (let index = 0; index < flights.length; index += 1) {
    const duration = flightDurationMs(flights[index]);

    if (duration === null || duration < 0) return null;

    total += duration;

    if (index > 0) {
      const wait = layoverMs(flights[index - 1], flights[index]);

      if (wait === null || wait < 0) return null;

      total += wait;
    }
  }

  return total;
}

export function isArrivalBeforeDeparture(flight: FlightTimes): boolean {
  const duration = flightDurationMs(flight);
  return duration !== null && duration < 0;
}

export function isDepartureBeforePrevArrival(
  prev: Flight,
  curr: Flight,
): boolean {
  const duration = layoverMs(prev, curr);
  return duration !== null && duration < 0;
}

export function tzOffsetLabel(timeZone: string, localIso: string): string {
  const instant = toInstant(localIso, timeZone);
  const wallTime = parseWallTime(localIso);

  if (instant === null || wallTime === null) return "";

  const offsetMinutes = Math.round((wallTime - instant) / MINUTE_MS);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `UTC${sign}${hours}${
    minutes ? `:${String(minutes).padStart(2, "0")}` : ""
  }`;
}
