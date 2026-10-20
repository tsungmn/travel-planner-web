"use client";

import type { DayWeather } from "./types";
import { DayWeatherCard } from "./DayWeatherCard";
import { TransitWeather } from "./TransitWeather";

type DayWeatherSlotProps = {
  weather?: DayWeather | null;
  readOnly?: boolean;
  /** 이동일이면 도착 도시(그날 자기 도시)만 바꿀 수 있습니다. */
  onEditCity?: () => void;
};

/**
 * 일차 패널 위쪽의 날씨 자리. 이동일(출발 도시 예보가 있는 날)이면 두 도시를,
 * 아니면 한 장의 카드를 보여 줍니다.
 */
export function DayWeatherSlot({
  weather,
  readOnly = false,
  onEditCity,
}: DayWeatherSlotProps) {
  if (weather?.transitFrom) {
    return (
      <TransitWeather
        from={weather.transitFrom}
        to={weather}
        readOnly={readOnly}
        onEditCity={onEditCity}
      />
    );
  }
  return (
    <DayWeatherCard
      weather={weather}
      readOnly={readOnly}
      onEditCity={onEditCity}
    />
  );
}
