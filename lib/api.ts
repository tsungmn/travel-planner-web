import type {
  Trip,
  TripDetail,
  TripPublic,
  Stop,
  Flight,
  Lodging,
  TripArea,
  ShareOptions,
  SharedStop,
  PlaceSearchOut,
  SearchMode,
  MapBounds,
} from "@/types";
import { ApiError, request } from "@/lib/http";
import type {
  CityCandidate,
  DayWeather,
} from "@/components/common/DayWeather/types";
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
  areas: TripArea[];
};
type SharedTripResponse = {
  trip: Omit<TripPublic, "num_days">;
  /** 이 링크에서 공개된 항목. 비공개 항목은 빈 목록으로 내려옵니다. */
  share: ShareOptions;
  stops: SharedStop[];
  flights: Flight[];
  lodgings: Lodging[];
  areas: TripArea[];
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
    share_flights: raw.share_flights,
    share_lodgings: raw.share_lodgings,
    share_memos: raw.share_memos,
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
      areas: raw.areas,
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

export type ShareInfo = ShareOptions & { token: string };

/**
 * 공유를 켜거나 공개 항목을 바꿉니다. 이미 켜져 있으면 기존 토큰을 그대로 쓰고,
 * 보낸 항목만 바꿉니다. (생략한 항목은 현재 값 유지, 새 링크의 기본값은 모두 비공개)
 */
export function enableShare(
  tripId: string,
  options: Partial<ShareOptions> = {},
): Promise<ShareInfo> {
  return request<ShareInfo>(`/trips/${encodeURIComponent(tripId)}/share`, {
    method: "POST",
    body: options,
  });
}

export async function disableShare(tripId: string): Promise<void> {
  await request(`/trips/${encodeURIComponent(tripId)}/share`, {
    method: "DELETE",
  });
}

/** 공유 링크로 보는 여행. 로그인 없이 열리는 화면이라 401이어도 로그인으로 보내지 않습니다. */
export async function getSharedTrip(token: string): Promise<{
  trip: TripPublic;
  share: ShareOptions;
  stops: SharedStop[];
  flights: Flight[];
  lodgings: Lodging[];
  areas: TripArea[];
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
      share: raw.share,
      stops: raw.stops,
      flights: raw.flights,
      lodgings: raw.lodgings,
      areas: raw.areas,
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
    /** 있으면 이 범위 안에서만 검색합니다. (여행지 주변 설정보다 우선) */
    bbox?: MapBounds;
  },
): Promise<PlaceSearchOut> {
  const q = query.trim();
  if (q.length < 2) return { items: [], attribution: "" };

  const params = new URLSearchParams({
    q,
    mode: opts?.mode ?? "full",
    lang: "ko",
  });
  const { nearLat, nearLng, bbox } = opts ?? {};
  if (bbox) {
    const { west, south, east, north } = bbox;
    params.set(
      "bbox",
      [west, south, east, north].map((value) => value.toFixed(6)).join(","),
    );
  } else if (nearLat != null && nearLng != null) {
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

/* ───────── 영역(러프 계획) ───────── */

export type AreaInput = Omit<TripArea, "id" | "trip_id">;

export function createArea(
  tripId: string,
  input: AreaInput,
): Promise<TripArea> {
  return request<TripArea>(`${tripPath(tripId)}/areas`, {
    method: "POST",
    body: input,
  });
}

/** `day_index`와 `memo`는 null을 보내 지울 수 있습니다. */
export function updateArea(
  tripId: string,
  areaId: string,
  patch: Partial<AreaInput>,
): Promise<TripArea> {
  return request<TripArea>(
    `${tripPath(tripId)}/areas/${encodeURIComponent(areaId)}`,
    { method: "PATCH", body: patch },
  );
}

export async function deleteArea(
  tripId: string,
  areaId: string,
): Promise<void> {
  await request(`${tripPath(tripId)}/areas/${encodeURIComponent(areaId)}`, {
    method: "DELETE",
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

/* ───────── 날씨 ───────── */

export type TripWeather = {
  days: DayWeather[];
  summary:
    import("@/components/common/DayWeather/types").TripWeatherSummary | null;
  fetchedAt: string | null;
  stale: boolean;
  attribution: string;
};

/** 내 여행의 일차별 날씨. 예보 서버가 응답하지 못하면 `days`가 빈 채로 옵니다. */
export function getTripWeather(
  tripId: string,
  signal?: AbortSignal,
): Promise<TripWeather> {
  return request<TripWeather>(`/trips/${encodeURIComponent(tripId)}/weather`, {
    signal,
  });
}

/** 공유 링크로 본 여행의 일차별 날씨. 공개하지 않은 숙소는 위치 추정에 쓰이지 않습니다. */
export function getSharedTripWeather(
  token: string,
  signal?: AbortSignal,
): Promise<TripWeather> {
  return request<TripWeather>(`/shared/${encodeURIComponent(token)}/weather`, {
    signal,
    redirectOnUnauthorized: false,
  });
}

/* ───────── 일차별 날씨 도시 (사용자 지정) ───────── */

type CitySearchResponse = {
  items: {
    id: string;
    name: string;
    country: string | null;
    admin1: string | null;
    lat: number;
    lng: number;
  }[];
  attribution: string;
};

export type CitySearchResult = {
  items: CityCandidate[];
  /** 검색 결과를 보여 주는 화면에 표기해야 하는 데이터 출처. */
  attribution: string;
};

/**
 * 도시 검색. 한 글자 도시("빈")도 있어서 글자 수로 막지 않고, 공백뿐이면 요청하지 않습니다.
 * 이름은 한국어로 받고, 한국어 이름이 없는 도시는 현지어로 옵니다.
 */
export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResult> {
  const q = query.trim();
  if (!q) return { items: [], attribution: "" };
  const params = new URLSearchParams({ q, lang: "ko" });
  const raw = await request<CitySearchResponse>(`/cities/search?${params}`, {
    signal,
  });
  return {
    items: raw.items.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country ?? undefined,
      admin1: c.admin1 ?? undefined,
      lat: c.lat,
      lng: c.lng,
    })),
    attribution: raw.attribution,
  };
}

/** 일차 범위(0부터, toDay 포함)의 날씨 도시를 정합니다. 이미 정한 일차는 바뀝니다. */
export async function setDayCities(
  tripId: string,
  input: {
    fromDay: number;
    toDay: number;
    city: Pick<CityCandidate, "name" | "lat" | "lng">;
  },
): Promise<void> {
  await request(`${tripPath(tripId)}/day-cities`, {
    method: "PUT",
    body: {
      from_day: input.fromDay,
      to_day: input.toDay,
      name: input.city.name,
      lat: input.city.lat,
      lng: input.city.lng,
    },
  });
}

/** 일차 범위(0부터, toDay 포함)의 지정을 지우고 자동 추정으로 되돌립니다. */
export async function clearDayCities(
  tripId: string,
  fromDay: number,
  toDay: number,
): Promise<void> {
  const params = new URLSearchParams({
    from_day: String(fromDay),
    to_day: String(toDay),
  });
  await request(`${tripPath(tripId)}/day-cities?${params}`, {
    method: "DELETE",
  });
}
