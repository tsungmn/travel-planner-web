import type {
  Trip,
  TripDetail,
  TripPublic,
  Stop,
  Flight,
  Lodging,
  PlaceSearchOut,
  SearchMode,
} from "@/types";
import { ApiError, request } from "@/lib/http";
import { inclusiveDays } from "@/lib/date";

/* ───────── 사용자 ───────── */

export type UserInfo = {
  name: string;
  email: string;
};

type MeResponse = {
  id: string;
  email: string;
  name: string | null;
};

/** 현재 로그인한 사용자. 로그인 상태가 아니면 401이라 로그인 화면으로 이동합니다. */
export async function getUser(): Promise<UserInfo> {
  const me = await request<MeResponse>("/auth/me");
  return { name: me.name ?? "", email: me.email };
}

/* ───────── 여행 ───────── */

// 백엔드 응답에는 `num_days`가 없고 `stop_count`는 목록에만 있어서,
// 화면이 쓰는 `Trip` 모양으로 바꿔 주는 어댑터를 둡니다.
type TripResponse = Omit<Trip, "num_days" | "stop_count"> & {
  created_at: string;
};
type TripListResponse = TripResponse & { stop_count: number };
type TripDetailResponse = TripResponse & {
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
};
type SharedTripResponse = {
  trip: Omit<TripPublic, "num_days">;
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
};

function toTripFields(raw: TripResponse): Omit<Trip, "stop_count"> {
  return {
    id: raw.id,
    title: raw.title,
    destination: raw.destination,
    dest_lat: raw.dest_lat,
    dest_lng: raw.dest_lng,
    start_date: raw.start_date,
    end_date: raw.end_date,
    share_token: raw.share_token,
    num_days: inclusiveDays(raw.start_date, raw.end_date),
  };
}

function toTrip(raw: TripResponse, stopCount: number): Trip {
  return { ...toTripFields(raw), stop_count: stopCount };
}

/** 없는 여행이면 `null`로 바꿉니다. 다른 오류는 그대로 던집니다. */
function nullIfNotFound(error: unknown): null {
  // 404: 없거나 남의 여행 / 422: 주소의 id가 UUID 형식이 아님
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 422)
  ) {
    return null;
  }
  throw error;
}

export async function getTrips(): Promise<Trip[]> {
  const rows = await request<TripListResponse[]>("/trips");
  return rows.map((row) => toTrip(row, row.stop_count));
}

export async function getTrip(tripId: string): Promise<TripDetail | null> {
  try {
    const raw = await request<TripDetailResponse>(
      `/trips/${encodeURIComponent(tripId)}`,
    );
    return {
      trip: toTrip(raw, raw.stops.length),
      stops: raw.stops,
      flights: raw.flights,
      lodgings: raw.lodgings,
    };
  } catch (error) {
    return nullIfNotFound(error);
  }
}

export async function createTrip(input: {
  title: string;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  start_date: string;
  end_date: string;
}): Promise<Trip> {
  const raw = await request<TripResponse>("/trips", {
    method: "POST",
    body: input,
  });
  return toTrip(raw, 0);
}

type TripPatch = Partial<
  Pick<
    Trip,
    | "title"
    | "destination"
    | "dest_lat"
    | "dest_lng"
    | "start_date"
    | "end_date"
  >
>;

/** 여행 정보 수정. 줄어든 기간 밖에 장소가 남아 있으면 409 `stops_out_of_range`입니다. */
export async function updateTrip(
  tripId: string,
  patch: TripPatch,
): Promise<Omit<Trip, "stop_count">> {
  const raw = await request<TripResponse>(
    `/trips/${encodeURIComponent(tripId)}`,
    { method: "PATCH", body: patch },
  );
  return toTripFields(raw);
}

export async function deleteTrip(tripId: string): Promise<void> {
  await request(`/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
}

/** 공유를 켭니다. 이미 켜져 있으면 기존 토큰을 그대로 돌려줍니다. */
export async function enableShare(tripId: string): Promise<string> {
  const { token } = await request<{ token: string }>(
    `/trips/${encodeURIComponent(tripId)}/share`,
    { method: "POST" },
  );
  return token;
}

export async function disableShare(tripId: string): Promise<void> {
  await request(`/trips/${encodeURIComponent(tripId)}/share`, {
    method: "DELETE",
  });
}

/** 공유 링크로 보는 여행. 로그인 없이 열리는 화면이라 401이어도 로그인으로 보내지 않습니다. */
export async function getSharedTrip(token: string): Promise<{
  trip: TripPublic;
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
} | null> {
  try {
    const raw = await request<SharedTripResponse>(
      `/shared/${encodeURIComponent(token)}`,
      { redirectOnUnauthorized: false },
    );
    return {
      trip: {
        ...raw.trip,
        num_days: inclusiveDays(raw.trip.start_date, raw.trip.end_date),
      },
      stops: raw.stops,
      flights: raw.flights,
      lodgings: raw.lodgings,
    };
  } catch (error) {
    return nullIfNotFound(error);
  }
}

/* ───────── 장소 검색 ───────── */

export class SearchRateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded");
    this.name = "SearchRateLimitError";
  }
}

export class SearchServiceUnavailableError extends Error {
  constructor() {
    super("Service unavailable");
    this.name = "SearchServiceUnavailableError";
  }
}

export class SearchBadGatewayError extends Error {
  constructor() {
    super("Bad gateway");
    this.name = "SearchBadGatewayError";
  }
}

/**
 * 장소 검색. 두 글자 미만이면 요청하지 않고 빈 결과를 돌려줍니다.
 *
 * - `nearLat`/`nearLng`를 주면 그 지점 반경 안에서만 찾고, 없으면 전 세계에서 찾습니다.
 *   (반경은 백엔드가 50km로 고정합니다. constants/search.ts의 NEARBY_SEARCH_RADIUS_KM과 같아야 합니다.)
 * - 백엔드가 429/503/502를 주면 각각 전용 오류로 바꿔 던집니다.
 */
export async function searchPlaces(
  query: string,
  opts?: {
    mode?: SearchMode;
    nearLat?: number | null;
    nearLng?: number | null;
  },
): Promise<PlaceSearchOut> {
  const q = query.trim();
  if (q.length < 2) return { items: [], attribution: "" };

  const params = new URLSearchParams({
    q,
    mode: opts?.mode ?? "full",
    lang: "ko",
  });
  const { nearLat, nearLng } = opts ?? {};
  if (nearLat != null && nearLng != null) {
    params.set("lat", String(nearLat));
    params.set("lng", String(nearLng));
    params.set("nearby", "true");
  } else {
    params.set("nearby", "false");
  }

  try {
    return await request<PlaceSearchOut>(`/places/search?${params}`);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) throw new SearchRateLimitError();
      if (error.status === 503) throw new SearchServiceUnavailableError();
      if (error.status === 502) throw new SearchBadGatewayError();
    }
    throw error;
  }
}

/* ───────── 장소(stop) ───────── */

export type StopInput = Omit<Stop, "id" | "trip_id" | "sort_order">;

const tripPath = (tripId: string) => `/trips/${encodeURIComponent(tripId)}`;

/** 해당 일차의 맨 뒤에 추가됩니다. (순서는 서버가 정합니다) */
export function createStop(tripId: string, input: StopInput): Promise<Stop> {
  return request<Stop>(`${tripPath(tripId)}/stops`, {
    method: "POST",
    body: input,
  });
}

export function updateStop(
  tripId: string,
  stopId: string,
  patch: Partial<Pick<Stop, "name" | "alias" | "address_text" | "memo">>,
): Promise<Stop> {
  return request<Stop>(
    `${tripPath(tripId)}/stops/${encodeURIComponent(stopId)}`,
    { method: "PATCH", body: patch },
  );
}

export async function deleteStop(
  tripId: string,
  stopId: string,
): Promise<void> {
  await request(`${tripPath(tripId)}/stops/${encodeURIComponent(stopId)}`, {
    method: "DELETE",
  });
}

/** 일차 이동과 순서를 한 번에, 전부 성공하거나 전부 취소되게 저장합니다. */
export async function reorderStops(
  tripId: string,
  items: { id: string; day_index: number; sort_order: number }[],
): Promise<void> {
  await request(`${tripPath(tripId)}/stops/order`, {
    method: "PUT",
    body: items,
  });
}

/* ───────── 항공편 ───────── */

export type FlightInput = Omit<Flight, "id" | "trip_id">;

export function createFlight(
  tripId: string,
  input: FlightInput,
): Promise<Flight> {
  return request<Flight>(`${tripPath(tripId)}/flights`, {
    method: "POST",
    body: input,
  });
}

export function updateFlight(
  tripId: string,
  flightId: string,
  patch: Partial<FlightInput>,
): Promise<Flight> {
  return request<Flight>(
    `${tripPath(tripId)}/flights/${encodeURIComponent(flightId)}`,
    { method: "PATCH", body: patch },
  );
}

export async function deleteFlight(
  tripId: string,
  flightId: string,
): Promise<void> {
  await request(`${tripPath(tripId)}/flights/${encodeURIComponent(flightId)}`, {
    method: "DELETE",
  });
}

/* ───────── 숙소 ───────── */

export type LodgingInput = Omit<Lodging, "id" | "trip_id">;

export function createLodging(
  tripId: string,
  input: LodgingInput,
): Promise<Lodging> {
  return request<Lodging>(`${tripPath(tripId)}/lodgings`, {
    method: "POST",
    body: input,
  });
}

export function updateLodging(
  tripId: string,
  lodgingId: string,
  patch: Partial<LodgingInput>,
): Promise<Lodging> {
  return request<Lodging>(
    `${tripPath(tripId)}/lodgings/${encodeURIComponent(lodgingId)}`,
    { method: "PATCH", body: patch },
  );
}

export async function deleteLodging(
  tripId: string,
  lodgingId: string,
): Promise<void> {
  await request(
    `${tripPath(tripId)}/lodgings/${encodeURIComponent(lodgingId)}`,
    { method: "DELETE" },
  );
}
