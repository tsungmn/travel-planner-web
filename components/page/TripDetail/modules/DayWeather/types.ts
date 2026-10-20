export type WeatherCondition =
  | "clear"
  | "mostly-clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "snow"
  | "thunderstorm";

export type DayWeather = {
  date: string;
  condition: WeatherCondition;
  label: string;
  tempMin: number;
  tempMax: number;
  precipProbability: number | null;
  uncertain: boolean;
  /** 이 일차의 날씨 기준 도시 이름. */
  placeName?: string;
  /** auto: 앱이 일정에서 추정한 도시. user: 사용자가 직접 정한 도시. */
  placeSource?: "auto" | "user";
  /**
   * 앞 일차와 도시가 달라진 경우 true. 도시 이름은 이 값이 true일 때만
   * 표시합니다(여행 전체가 한 도시면 아예 안 보임).
   */
  placeChangedFromPrev?: boolean;
  /**
   * 도시가 바뀐 이동일에만 있습니다. 앞 일차 도시의 같은 날 예보(출발 도시의 날씨).
   * 그 예보를 못 받았으면 없고, 그러면 도착 도시만 보여 줍니다.
   */
  transitFrom?: DayWeather | null;
};

/** 도시 검색 결과 한 건. lat/lng는 그 도시의 날씨를 받을 좌표입니다. */
export type CityCandidate = {
  id: string;
  name: string;
  country?: string;
  /** 같은 이름의 도시를 구분하는 행정구역(주, 도 등). */
  admin1?: string;
  lat: number;
  lng: number;
};

/** 도시를 적용할 일차 범위. 둘 다 1부터 시작하고 toDay도 포함합니다. */
export type CityApplyScope = { fromDay: number; toDay: number };
