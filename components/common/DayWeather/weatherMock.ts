import { addDays } from "@/lib/date";
import type { TripWeather } from "@/lib/api";
import type { DayWeather } from "./types";
import type { WeatherScenario } from "./WeatherScenarioPicker";

/** 서버의 평년 기준과 같습니다(비 온 날 비율 0.4 이상이면 비 올 가능성 높음). */
const RAIN_LIKELY_RATIO = 0.4;

function makeDay(
  date: string,
  day: number,
  source: "forecast" | "normal",
  low = false,
): DayWeather {
  if (source === "normal") {
    const rainyRatio = day % 2 === 0 ? 0.5 : 0.3;
    return {
      date,
      source,
      confidence: "low",
      tempMin: 1 + (day % 3),
      tempMax: 9 + (day % 4),
      normal: {
        coldTemp: -3,
        hotTemp: 12,
        rainyRatio,
        rainLikely: rainyRatio >= RAIN_LIKELY_RATIO,
        fallbackReason: "out_of_range",
      },
      placeName: "서울",
    };
  }
  return {
    date,
    source,
    confidence: low ? "low" : "high",
    tempMin: -2 + day,
    tempMax: 10 + day,
    condition: day % 3 === 0 ? "rain" : "partly-cloudy",
    feelsMin: -4 + day,
    feelsMax: 8 + day,
    windMax: day % 2 ? 9 : 4,
    rainy: day % 3 === 0,
    rainPeriod: day % 3 === 0 ? "afternoon" : null,
    precipMm: day % 3 === 0 ? 6 : 0,
    precipProbability: day % 3 === 0 ? 70 : 10,
    sunrise: "07:05",
    sunset: "17:12",
    placeName: "서울",
  };
}

export function createMockWeather(
  startDate: string,
  days: number,
  scenario: Exclude<WeatherScenario, "live">,
): TripWeather | null {
  if (scenario === "failed") return null;
  if (scenario === "empty")
    return {
      days: [],
      summary: null,
      fetchedAt: null,
      stale: false,
      attribution: "",
    };
  const normalFrom =
    scenario === "normal"
      ? 0
      : scenario === "mixed"
        ? 3
        : days > 8 && scenario === "low"
          ? 8
          : days;
  const items = Array.from({ length: days }, (_, day) =>
    makeDay(
      addDays(startDate, day),
      day,
      day >= normalFrom ? "normal" : "forecast",
      scenario === "low" && day >= 7,
    ),
  );
  if (scenario === "transit" && items[1])
    items[1] = {
      ...items[1],
      transitFrom: {
        ...items[1],
        placeName: "인천",
        source: "forecast",
        confidence: "high",
      },
    };
  // 서버와 같은 방식: 예보의 비 온 날 + 평년 날의 비 온 날 비율 합(반올림)
  const rainyDays =
    items.filter((day) => day.rainy).length +
    Math.floor(
      items.reduce((sum, day) => sum + (day.normal?.rainyRatio ?? 0), 0) + 0.5,
    );
  const firstLow = items.findIndex(
    (day) => day.source === "forecast" && day.confidence === "low",
  );
  const summary = {
    basis:
      normalFrom === 0 ? "normal" : normalFrom < days ? "mixed" : "forecast",
    tempMin: Math.min(...items.map((day) => day.tempMin)),
    tempMax: Math.max(...items.map((day) => day.tempMax)),
    rainyDays,
    snowDays: 0,
    maxDiurnalRange: Math.max(...items.map((day) => day.tempMax - day.tempMin)),
    firstNormalDay: normalFrom < days ? normalFrom + 1 : null,
    lowConfidenceFromDay: firstLow >= 0 ? firstLow + 1 : null,
  } as TripWeather["summary"];
  return {
    days: items,
    summary,
    // 서버처럼 예보를 하나도 안 썼으면 null
    fetchedAt:
      normalFrom === 0
        ? null
        : scenario === "stale"
          ? new Date(Date.now() - 8 * 3600000).toISOString()
          : new Date().toISOString(),
    stale: scenario === "stale",
    attribution: "날씨 데이터",
  };
}
