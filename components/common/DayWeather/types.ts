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
  source: "forecast" | "normal";
  confidence: "high" | "medium" | "low";
  tempMin: number;
  tempMax: number;
  // 서버는 값이 없으면 키를 빼지 않고 null로 내려줍니다.
  condition?: WeatherCondition | null;
  feelsMin?: number | null;
  feelsMax?: number | null;
  /** 일 최대 풍속, m/s */
  windMax?: number | null;
  rainy?: boolean | null;
  /** 비 온 날의 시간대(오전 0~11시 / 오후 12~23시). 먼 날이거나 모르면 null이고, 그러면 "비"로만 표시합니다. */
  rainPeriod?: "morning" | "afternoon" | "both" | null;
  precipMm?: number | null;
  precipProbability?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
  normal?: {
    coldTemp: number;
    hotTemp: number;
    rainyRatio: number;
    rainLikely: boolean;
    fallbackReason: "out_of_range" | "forecast_failed";
  } | null;
  placeName?: string | null;
  placeSource?: "auto" | "user";
  placeChangedFromPrev?: boolean;
  transitFrom?: DayWeather | null;
};

export type TripWeatherSummary = {
  basis: "forecast" | "mixed" | "normal";
  tempMin: number;
  tempMax: number;
  rainyDays: number;
  snowDays: number;
  maxDiurnalRange: number;
  firstNormalDay: number | null;
  lowConfidenceFromDay: number | null;
};

export type CityCandidate = {
  id: string;
  name: string;
  country?: string;
  admin1?: string;
  lat: number;
  lng: number;
};

export type CityApplyScope = { fromDay: number; toDay: number };
