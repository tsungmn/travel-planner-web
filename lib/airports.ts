import { useSyncExternalStore } from "react";

/**
 * 공항 데이터는 `npm run build:airports` 가 만드는 `public/data/airports.json` 을
 * 브라우저에서 한 번만 불러와 씁니다. (앱 번들에 넣지 않습니다)
 * 한국어 이름(name_ko, city_ko)이 없는 공항이 많아서 영문 이름으로 대신 보여줍니다.
 */
export type Airport = {
  iata: string;
  name: string;
  name_ko?: string;
  city: string;
  city_ko?: string;
  country: string;
  tz: string;
  lat: number;
  lon: number;
  /** 정기편 규모. L > M > S */
  size?: "L" | "M" | "S";
  /** scripts/airport-overrides.json 의 별칭 */
  aliases?: string[];
};

export type AirportIndex = {
  airports: Airport[];
  byIata: Map<string, Airport>;
  /** airports 와 같은 순서의 검색용 문자열 */
  searchKeys: string[];
};

export type AirportsState =
  | { status: "idle" | "loading" | "error"; index: null }
  | { status: "ready"; index: AirportIndex };

const AIRPORTS_URL = "/data/airports.json";
const DEFAULT_LIMIT = 30;
const SIZE_RANK = { L: 0, M: 1, S: 2 } as const;

/* ───────── 표시 ───────── */

export const airportName = (a: Airport) => a.name_ko ?? a.name;
export const airportCity = (a: Airport) => a.city_ko ?? a.city;

export function formatAirportLabel(a: Airport): string {
  const city = airportCity(a);
  const name = airportName(a);
  return city && city !== name
    ? `${a.iata} · ${name} (${city})`
    : `${a.iata} · ${name}`;
}

/* ───────── 검색 ───────── */

// 공백과 기호를 없애고 소문자로 맞춥니다. ("칭다오 자오둥" → "칭다오자오둥")
const normalize = (text: string) =>
  text.toLowerCase().replace(/[\s·.,'()\-_/]+/g, "");

function searchKeyOf(a: Airport): string {
  return [
    a.iata,
    a.name_ko,
    // "인천공항" 처럼 "국제"를 빼고 쳐도 찾아지게 합니다.
    a.name_ko?.replace(/국제/g, ""),
    a.name,
    a.city_ko,
    a.city,
    ...(a.aliases ?? []),
  ]
    .filter((part): part is string => Boolean(part))
    .map(normalize)
    .join(" ");
}

export function buildIndex(airports: Airport[]): AirportIndex {
  return {
    airports,
    byIata: new Map(airports.map((a) => [a.iata, a])),
    searchKeys: airports.map(searchKeyOf),
  };
}

/**
 * IATA 코드 / 한글·영문 공항명 / 도시명 / 별칭으로 찾습니다.
 * 띄어쓰기로 나눈 단어가 모두 들어 있어야 하고, 코드가 정확히 맞는 공항을 맨 앞에 둡니다.
 */
export function searchAirports(
  index: AirportIndex,
  query: string,
  limit = DEFAULT_LIMIT,
): Airport[] {
  const tokens = query.split(/\s+/).map(normalize).filter(Boolean);

  // 검색어가 없으면 한국 공항을 먼저, 그다음 큰 공항 순으로 보여줍니다.
  if (tokens.length === 0) {
    return index.airports
      .filter((a) => a.size === "L" && a.name_ko)
      .sort(
        (a, b) =>
          Number(b.country === "KR") - Number(a.country === "KR") ||
          airportName(a).localeCompare(airportName(b), "ko"),
      )
      .slice(0, limit);
  }

  const first = tokens[0];
  const matches: { airport: Airport; rank: number }[] = [];

  index.airports.forEach((airport, i) => {
    const key = index.searchKeys[i];
    if (!tokens.every((token) => key.includes(token))) return;

    const iata = airport.iata.toLowerCase();
    const rank =
      iata === first
        ? 0
        : iata.startsWith(first)
          ? 1
          : normalize(airportName(airport)).startsWith(first) ||
              normalize(airportCity(airport)).startsWith(first)
            ? 2
            : 3;
    matches.push({ airport, rank });
  });

  matches.sort(
    (a, b) =>
      a.rank - b.rank ||
      SIZE_RANK[a.airport.size ?? "S"] - SIZE_RANK[b.airport.size ?? "S"] ||
      a.airport.iata.localeCompare(b.airport.iata),
  );
  return matches.slice(0, limit).map((m) => m.airport);
}

/* ───────── 불러오기 ───────── */

// useSyncExternalStore 용 저장소. 상태 객체는 바뀔 때만 새로 만듭니다.
const IDLE: AirportsState = { status: "idle", index: null };
let state: AirportsState = IDLE;
const listeners = new Set<() => void>();

function setState(next: AirportsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** 아직 불러오지 않았거나 실패했을 때만 요청합니다. */
export function loadAirports(): void {
  if (state.status === "loading" || state.status === "ready") return;
  setState({ status: "loading", index: null });
  fetch(AIRPORTS_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`airports: ${response.status}`);
      return response.json() as Promise<Airport[]>;
    })
    .then((airports) =>
      setState({ status: "ready", index: buildIndex(airports) }),
    )
    .catch(() => setState({ status: "error", index: null }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function subscribeAndLoad(listener: () => void) {
  const unsubscribe = subscribe(listener);
  queueMicrotask(loadAirports);
  return unsubscribe;
}

const getSnapshot = () => state;
const getServerSnapshot = () => IDLE;

/**
 * 공항 목록. `enabled` 가 true 일 때만 불러오기 시작합니다.
 * (항공편이 없는 여행에서 1.5MB 를 받지 않도록)
 */
export function useAirports({ enabled = true }: { enabled?: boolean } = {}) {
  const current = useSyncExternalStore(
    enabled ? subscribeAndLoad : subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { ...current, retry: loadAirports };
}
