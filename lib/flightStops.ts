import type { Flight, TripPublic } from "@/types";
import { airportName, type Airport } from "@/lib/airports";
import { diffDays } from "@/lib/date";
import { sortFlightsByDirection } from "@/lib/flightTime";

/**
 * 항공편의 출발·도착 공항을 일정에 보여주기 위한 항목입니다.
 * DB에 저장하지 않고 항공편에서 매번 계산하므로, 항공편을 고치거나 지우면 그대로 따라갑니다.
 * 장소 번호·개수·경로선에는 들어가지 않습니다.
 */
export type FlightStop = {
  /** 목록 key */
  key: string;
  /** 지도 마커 id. 같은 공항은 같은 id 를 씁니다. */
  markerId: string;
  iata: string;
  name: string;
  lat: number;
  lng: number;
  dayIndex: number;
  /** 출국편은 그날 목록의 맨 위, 귀국편은 맨 아래에 놓습니다. */
  zone: "start" | "end";
  role: "dep" | "arr";
  flightNo: string;
};

export type DayFlightStops = { start: FlightStop[]; end: FlightStop[] };

export const EMPTY_DAY_FLIGHT_STOPS: DayFlightStops = { start: [], end: [] };

export const isAirportMarkerId = (id: string) => id.startsWith("airport-");

export function buildFlightStops(
  trip: Pick<TripPublic, "start_date" | "num_days">,
  flights: Flight[],
  airports: ReadonlyMap<string, Airport>,
): FlightStop[] {
  const result: FlightStop[] = [];

  for (const direction of ["outbound", "inbound"] as const) {
    const zone = direction === "outbound" ? "start" : "end";
    let last: FlightStop | undefined;

    for (const flight of sortFlightsByDirection(flights, direction)) {
      for (const role of ["dep", "arr"] as const) {
        const iata = role === "dep" ? flight.dep_airport : flight.arr_airport;
        const local = role === "dep" ? flight.dep_local : flight.arr_local;
        const airport = iata ? airports.get(iata) : undefined;
        if (!iata || !local || !airport) continue;

        const dayIndex = diffDays(trip.start_date, local.slice(0, 10));
        if (!Number.isInteger(dayIndex)) continue;
        if (dayIndex < 0 || dayIndex >= trip.num_days) continue;

        // 경유지는 도착·출발이 같은 공항·같은 날이라 한 번만 보여줍니다.
        if (last && last.iata === iata && last.dayIndex === dayIndex) continue;

        last = {
          key: `${flight.id}-${role}`,
          markerId: `airport-${iata}`,
          iata,
          name: airportName(airport),
          lat: airport.lat,
          lng: airport.lon,
          dayIndex,
          zone,
          role,
          flightNo: flight.flight_no,
        };
        result.push(last);
      }
    }
  }

  return result;
}

export function flightStopsOfDay(
  stops: FlightStop[],
  dayIndex: number,
): DayFlightStops {
  const ofDay = stops.filter((stop) => stop.dayIndex === dayIndex);
  return {
    start: ofDay.filter((stop) => stop.zone === "start"),
    end: ofDay.filter((stop) => stop.zone === "end"),
  };
}

/** 지도에는 같은 공항을 한 번만 찍습니다. */
export function uniqueAirportStops(stops: FlightStop[]): FlightStop[] {
  const seen = new Set<string>();
  return stops.filter((stop) => {
    if (seen.has(stop.markerId)) return false;
    seen.add(stop.markerId);
    return true;
  });
}
