import type { DayWeather, TripWeatherSummary } from "./types";
import {
  FEELS_DIFFERENCE_THRESHOLD,
  RAIN_PROBABILITY_HIGH_THRESHOLD,
  RAIN_PROBABILITY_THRESHOLD,
} from "./weatherDisplay";

const CONDITION_LABELS: Record<NonNullable<DayWeather["condition"]>, string> = {
  clear: "맑음",
  "mostly-clear": "대체로 맑음",
  "partly-cloudy": "구름 조금",
  cloudy: "흐림",
  fog: "안개",
  drizzle: "이슬비",
  rain: "비",
  showers: "소나기",
  snow: "눈",
  thunderstorm: "뇌우",
};

export function conditionLabel(condition: DayWeather["condition"]): string {
  return condition ? CONDITION_LABELS[condition] : "날씨";
}

export function temperaturePair(min: number, max: number): string {
  return `${min}° ~ ${max}°`;
}

export function feelsText(weather: DayWeather): string | null {
  if (
    weather.source !== "forecast" ||
    weather.feelsMin == null ||
    weather.feelsMax == null
  )
    return null;
  const minDiff = Math.abs(weather.feelsMin - weather.tempMin);
  const maxDiff = Math.abs(weather.feelsMax - weather.tempMax);
  return minDiff >= FEELS_DIFFERENCE_THRESHOLD ||
    maxDiff >= FEELS_DIFFERENCE_THRESHOLD
    ? `체감 ${temperaturePair(weather.feelsMin, weather.feelsMax)}`
    : null;
}

export function rainPeriodLabel(period: DayWeather["rainPeriod"]): string {
  if (period === "morning") return "오전 비";
  if (period === "afternoon") return "오후 비";
  if (period === "both") return "하루 종일 비";
  // 서버가 시간대를 모르면 null이에요. 모르는 걸 "하루 종일"이라고 하지 않습니다.
  return "비";
}

export function rainLikelihoodLabel(probability: number): string {
  if (probability >= RAIN_PROBABILITY_HIGH_THRESHOLD) return "높음(≥60)";
  if (probability >= RAIN_PROBABILITY_THRESHOLD) return "보통(30~59)";
  return "낮음(<30)";
}

export function normalRainText(ratio: number): string {
  return `이맘때 10일 중 ${Math.round(ratio * 10)}일은 비`;
}

export function getPackingHints(summary: TripWeatherSummary): string[] {
  const hints: string[] = [];
  if (summary.tempMin <= 0) hints.push("두꺼운 겉옷·장갑");
  else if (summary.tempMin <= 10) hints.push("따뜻한 겉옷");
  if (summary.tempMax >= 28) hints.push("선크림·시원한 옷");
  if (summary.maxDiurnalRange >= 10) hints.push("겹쳐 입기");
  if (summary.rainyDays >= 1) hints.push("우산");
  if (summary.snowDays >= 1) hints.push("방수 신발");
  return hints.slice(0, 3);
}

/** 요약의 "비 오는 날" 문구. 평년이 섞이면 날 수가 추정이라 "약"을 붙입니다. */
export function rainyDaysText(summary: TripWeatherSummary): string {
  const estimated = summary.basis !== "forecast";
  if (summary.rainyDays === 0)
    return estimated ? "비 오는 날 거의 없음" : "비 오는 날 없음";
  return `비 오는 날 ${estimated ? "약 " : ""}${summary.rainyDays}일`;
}

export function basisGuide(summary: TripWeatherSummary): string | null {
  if (summary.basis === "normal")
    return "아직 예보 기간 밖이라 평년(과거 10년 평균) 기준이에요. 출발 15일 전부터 실제 예보로 바뀌어요.";
  if (summary.basis === "mixed" && summary.firstNormalDay != null)
    return `${summary.firstNormalDay}일차부터는 평년 기준이에요.`;
  if (summary.basis === "forecast" && summary.lowConfidenceFromDay != null)
    return `${summary.lowConfidenceFromDay}일차부터는 예보가 바뀔 수 있어요.`;
  return null;
}

export function freshnessText(
  fetchedAt: string | null,
  stale: boolean,
): string | null {
  if (!fetchedAt) return null;
  const elapsed = Math.max(0, Date.now() - Date.parse(fetchedAt));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1 && !stale) return "방금 받은 예보예요";
  const age =
    minutes < 60
      ? `${minutes}분`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}시간`
        : `${Math.floor(minutes / 1440)}일`;
  return stale
    ? `최신 예보를 받지 못했어요 · ${age} 전 기준`
    : `${age} 전 기준`;
}
