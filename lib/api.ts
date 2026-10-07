import type {
  Trip,
  Stop,
  Flight,
  Lodging,
  PlaceResult,
  PlaceSearchOut,
  SearchMode,
} from "@/types";
import { mockTrips, mockStops, mockFlights, mockLodgings } from "@/mocks/data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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

export async function getTrips(): Promise<Trip[]> {
  await delay(rand(400, 700));
  return structuredClone(mockTrips);
}

export async function getTrip(tripId: string): Promise<{
  trip: Trip;
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
} | null> {
  await delay(rand(400, 700));
  const trip = mockTrips.find((t) => t.id === tripId);
  if (!trip) return null;
  return {
    trip: structuredClone(trip),
    stops: structuredClone(mockStops.filter((s) => s.trip_id === tripId)),
    flights: structuredClone(mockFlights.filter((f) => f.trip_id === tripId)),
    lodgings: structuredClone(mockLodgings.filter((l) => l.trip_id === tripId)),
  };
}

export async function createTrip(input: {
  title: string;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  start_date: string;
  end_date: string;
}): Promise<Trip> {
  await delay(rand(500, 800));
  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  const numDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  );
  const trip: Trip = {
    id: `trip-${Date.now()}`,
    title: input.title,
    destination: input.destination,
    dest_lat: input.dest_lat,
    dest_lng: input.dest_lng,
    start_date: input.start_date,
    end_date: input.end_date,
    share_token: null,
    num_days: numDays,
    stop_count: 0,
  };
  return trip;
}

export async function searchPlaces(
  query: string,
  opts?: {
    mode?: SearchMode;
    nearLat?: number | null;
    nearLng?: number | null;
    nearRadiusKm?: number;
  },
): Promise<PlaceSearchOut> {
  const mode: SearchMode = opts?.mode ?? "full";
  await delay(mode === "suggest" ? rand(200, 400) : rand(400, 600));

  const q = query.trim();
  if (!q) {
    return { items: [], attribution: "" };
  }

  const lower = q.toLowerCase();

  // Error simulation triggers
  if (lower.includes("error429") || lower.includes("rate429")) {
    throw new SearchRateLimitError();
  }
  if (lower.includes("error503")) {
    throw new SearchServiceUnavailableError();
  }
  if (lower.includes("error502")) {
    throw new SearchBadGatewayError();
  }

  const items: PlaceResult[] = [];

  // City / destination searches
  if (lower.includes("칭다오") || lower.includes("qingdao")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-c1",
        name: "칭다오 (Qingdao)",
        address_text: "山东省中国",
        lat: 36.0671,
        lng: 120.3826,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-c2",
        name: "칭다오 맥주 박물관",
        address_text: "山东省青岛市市北区登州路56号",
        lat: 36.0748,
        lng: 120.3729,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-c3",
        name: "5·4 광장",
        address_text: "山东省青岛市市南区太平路",
        lat: 36.0593,
        lng: 120.3763,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-c4",
        name: "팔대관 (八大关)",
        address_text: "山东省青岛市市南区武胜关路",
        lat: 36.0531,
        lng: 120.3578,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-c5",
        name: "라오산 (崂山)",
        address_text: "山东省青岛市崂山区",
        lat: 36.1572,
        lng: 120.6245,
      },
    );
  } else if (lower.includes("오사카") || lower.includes("osaka")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-o1",
        name: "오사카 (Osaka)",
        address_text: "大阪府日本",
        lat: 34.6937,
        lng: 135.5023,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-o2",
        name: "도톤보리",
        address_text: "大阪市中央区",
        lat: 34.6687,
        lng: 135.5013,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-o3",
        name: "오사카성",
        address_text: "大阪市中央区大阪城",
        lat: 34.6873,
        lng: 135.526,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-o4",
        name: "신사이바시",
        address_text: "大阪市中央区心斎橋筋",
        lat: 34.6736,
        lng: 135.5008,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-o5",
        name: "우메다 스카이 빌딩",
        address_text: "大阪市北区梅田",
        lat: 34.7053,
        lng: 135.4901,
      },
    );
  } else if (lower.includes("도쿄") || lower.includes("tokyo")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-t1",
        name: "도쿄 (Tokyo)",
        address_text: "東京都日本",
        lat: 35.6762,
        lng: 139.6503,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-t2",
        name: "시부야",
        address_text: "東京都渋谷区",
        lat: 35.6595,
        lng: 139.7004,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-t3",
        name: "아사쿠사",
        address_text: "東京都台東区",
        lat: 35.7148,
        lng: 139.7967,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-t4",
        name: "신주쿠",
        address_text: "東京都新宿区",
        lat: 35.6938,
        lng: 139.7036,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-t5",
        name: "하라주쿠",
        address_text: "東京都渋谷区神宮前",
        lat: 35.67,
        lng: 139.7034,
      },
    );
  } else if (lower.includes("제주") || lower.includes("jeju")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-j1",
        name: "제주시",
        address_text: "제주특별자치도 제주시",
        lat: 33.4996,
        lng: 126.5312,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-j2",
        name: "서귀포시",
        address_text: "제주특별자치도 서귀포시",
        lat: 33.258,
        lng: 126.563,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-j3",
        name: "한라산",
        address_text: "제주특별자치도 제주시",
        lat: 33.3617,
        lng: 126.533,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-j4",
        name: "성산일출봉",
        address_text: "제주특별자치도 서귀포시",
        lat: 33.4608,
        lng: 126.9408,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-j5",
        name: "우도",
        address_text: "제주특별자치도 제주시",
        lat: 33.4933,
        lng: 126.952,
      },
    );
  } else if (lower.includes("광장")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-1",
        name: "5·4 광장",
        address_text: "山东省青岛市市南区太平路",
        lat: 36.0593,
        lng: 120.3763,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-2",
        name: "천안문 광장",
        address_text: "北京市东城区",
        lat: 39.9054,
        lng: 116.3976,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-3",
        name: "세인트 피터 광장",
        address_text: "Vatican City",
        lat: 41.9022,
        lng: 12.4539,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-4",
        name: "트라팔가 광장",
        address_text: "London, UK",
        lat: 51.508,
        lng: -0.1281,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-5",
        name: "광장 시장",
        address_text: "荷兰阿姆斯特丹",
        lat: 52.3676,
        lng: 4.9041,
      },
    );
  } else if (lower.includes("대성당")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-6",
        name: "성 가족 대성당",
        address_text: "巴塞罗那, 西班牙",
        lat: 41.4036,
        lng: 2.1744,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-7",
        name: "쾰른 대성당",
        address_text: "Köln, Germany",
        lat: 50.9413,
        lng: 6.9583,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-8",
        name: "밀라노 두오모",
        address_text: "Milano, Italy",
        lat: 45.4642,
        lng: 9.19,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-9",
        name: "노트르담 대성당",
        address_text: "Paris, France",
        lat: 48.853,
        lng: 2.3499,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-10",
        name: "성 비투스 대성당",
        address_text: "Prague, Czech",
        lat: 50.0906,
        lng: 14.4003,
      },
    );
  } else if (lower.includes("맥주")) {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-11",
        name: "칭다오 맥주 박물관",
        address_text: "山东省青岛市市北区登州路56号",
        lat: 36.0748,
        lng: 120.3729,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-12",
        name: "慕尼黑啤酒节",
        address_text: "München, Germany",
        lat: 48.1314,
        lng: 11.5493,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-13",
        name: "기네스 맥주 공장",
        address_text: "Dublin, Ireland",
        lat: 53.3419,
        lng: -6.2867,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-14",
        name: "필즈너 우켈리체 양조장",
        address_text: "Plzeň, Czech",
        lat: 49.7384,
        lng: 13.3736,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-15",
        name: "삿포로 맥주 박물관",
        address_text: "北海道札幌市",
        lat: 43.0687,
        lng: 141.3508,
      },
    );
  } else {
    items.push(
      {
        provider: "geoapify",
        provider_place_id: "sr-16",
        name: `${q} 관광지`,
        address_text: "주소 정보 없음",
        lat: 36.05 + Math.random() * 0.1,
        lng: 120.35 + Math.random() * 0.1,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-17",
        name: `${q} 랜드마크`,
        address_text: null,
        lat: 36.06 + Math.random() * 0.1,
        lng: 120.38 + Math.random() * 0.1,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-18",
        name: `${q} 맛집 거리`,
        address_text: null,
        lat: 36.07 + Math.random() * 0.1,
        lng: 120.4 + Math.random() * 0.1,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-19",
        name: `${q} 전망대`,
        address_text: null,
        lat: 36.04 + Math.random() * 0.1,
        lng: 120.36 + Math.random() * 0.1,
      },
      {
        provider: "geoapify",
        provider_place_id: "sr-20",
        name: `${q} 공원`,
        address_text: null,
        lat: 36.08 + Math.random() * 0.1,
        lng: 120.42 + Math.random() * 0.1,
      },
    );
  }

  // Proximity filter: if near lat/lng provided, filter to within radius
  const nearLat = opts?.nearLat ?? null;
  const nearLng = opts?.nearLng ?? null;
  const radius = opts?.nearRadiusKm ?? 50;
  let filtered = items;
  if (nearLat !== null && nearLng !== null) {
    filtered = items.filter((item) => {
      const d = haversineKm(nearLat, nearLng, item.lat, item.lng);
      return d <= radius;
    });
  }

  return {
    items: filtered,
    attribution: "Powered by Geoapify · © OpenStreetMap contributors",
  };
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getSharedTrip(token: string): Promise<{
  trip: Trip;
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
} | null> {
  await delay(rand(400, 700));
  const trip = mockTrips.find((t) => t.share_token === token);
  if (!trip) return null;
  return {
    trip: structuredClone(trip),
    stops: structuredClone(mockStops.filter((s) => s.trip_id === trip.id)),
    flights: structuredClone(mockFlights.filter((f) => f.trip_id === trip.id)),
    lodgings: structuredClone(
      mockLodgings.filter((l) => l.trip_id === trip.id),
    ),
  };
}
