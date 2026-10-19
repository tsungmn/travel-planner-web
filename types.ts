export type Trip = {
  id: string;
  title: string;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  start_date: string;
  end_date: string;
  share_token: string | null;
  /** 공유 링크로 공개할 항목. 새 링크는 모두 비공개로 시작합니다. */
  share_flights: boolean;
  share_lodgings: boolean;
  share_memos: boolean;
  num_days: number;
  stop_count: number;
};

/** 공유 링크로 내려오는 여행. 소유자 전용 필드(id, share_token)는 없습니다. */
export type TripPublic = Pick<
  Trip,
  | "title"
  | "destination"
  | "dest_lat"
  | "dest_lng"
  | "start_date"
  | "end_date"
  | "num_days"
>;

/** 공유 링크에서 공개되는 항목 */
export type ShareOptions = {
  flights: boolean;
  lodgings: boolean;
  memos: boolean;
};

export type Stop = {
  id: string;
  trip_id: string;
  day_index: number;
  sort_order: number;
  name: string;
  /** 사용자가 정한 표시 이름. 있으면 `name` 대신 보여주고 `name`은 작게 덧붙입니다. */
  alias: string | null;
  address_text: string | null;
  lat: number;
  lng: number;
  provider: string;
  provider_place_id: string | null;
  memo: string | null;
};

/**
 * 숙소를 비공개로 둔 공유 링크에서 숙소 장소 자리에 내려오는 자리표시.
 * 이름·주소·좌표·메모는 없고 일정 속 순서만 있어서, 지도에는 못 그리고 목록에는 "숙소"로만 보입니다.
 */
export type HiddenStop = Pick<
  Stop,
  "id" | "trip_id" | "day_index" | "sort_order"
> & { hidden: true };

/** 공유 화면의 장소: 일반 장소이거나 숨겨진 숙소 자리표시 */
export type SharedStop = Stop | HiddenStop;

/**
 * 러프 계획 영역: "이 날은 이 동네를 돌아다니자"를 원(중심 + 반경)으로 표시한 것.
 * 장소(Stop)와는 연결 키가 없고, 좌표로 영역 안에 있는지 계산합니다.
 */
export type TripArea = {
  id: string;
  trip_id: string;
  /** 0부터. null이면 일차 미지정 */
  day_index: number | null;
  /** 비어 있을 수 있습니다. 화면에서는 "이름 없음"으로 보여줍니다. */
  label: string;
  lat: number;
  lng: number;
  radius_m: number;
  memo: string | null;
};

/** 여행 화면의 작업 모드. 러프: 영역으로 큰 그림 잡기 / 계획: 장소·항공·숙소 */
export type TripMode = "rough" | "plan";

export type Flight = {
  id: string;
  trip_id: string;
  direction: "outbound" | "inbound";
  flight_no: string;
  dep_airport: string | null;
  arr_airport: string | null;
  dep_local: string | null;
  arr_local: string | null;
  dep_tz: string | null;
  arr_tz: string | null;
};

export type Lodging = {
  id: string;
  trip_id: string;
  name: string;
  address_text: string | null;
  lat: number;
  lng: number;
  provider: string;
  provider_place_id: string | null;
  check_in: string | null;
  check_out: string | null;
  memo: string | null;
};

export type PlaceResult = {
  provider: string;
  provider_place_id: string;
  name: string;
  address_text: string | null;
  lat: number;
  lng: number;
};

export type SearchMode = "suggest" | "full";

/** 지도에 보이는 범위. (경도·위도 순서가 아니라 이름으로 구분합니다) */
export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type PlaceSearchOut = {
  items: PlaceResult[];
  attribution: string;
};

export type TripDetail = {
  trip: Trip;
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
  areas: TripArea[];
};
