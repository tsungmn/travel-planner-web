"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Flex } from "@mantine/core";

import {
  WeatherScenarioPicker,
  type WeatherScenario,
} from "@/components/common/DayWeather/WeatherScenarioPicker";
import { createMockWeather } from "@/components/common/DayWeather/weatherMock";
import type { TripWeather } from "@/lib/api";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * 개발 전용: 날씨 화면 상태(낡은 예보, 실패 등)를 눈으로 확인하기 위한 도구입니다.
 * 운영 빌드에서는 mock도, 선택 UI도 만들지 않습니다(`mock`은 undefined, `picker`는 null).
 * 선택 UI를 감싸는 여백까지 이 훅이 소유하므로, 호출하는 쪽은 `{picker}`만 렌더하면 됩니다.
 */
export function useDevWeatherScenario(
  trip: { start_date: string; num_days: number } | null | undefined,
): { mock: TripWeather | null | undefined; picker: ReactNode } {
  const [scenario, setScenario] = useState<WeatherScenario>("live");
  const mock = useMemo(
    () =>
      IS_DEV && trip && scenario !== "live"
        ? createMockWeather(trip.start_date, trip.num_days, scenario)
        : undefined,
    [trip, scenario],
  );
  const picker = IS_DEV ? (
    <Flex justify="flex-end" px={16} pt={8}>
      <WeatherScenarioPicker value={scenario} onChange={setScenario} />
    </Flex>
  ) : null;
  return { mock, picker };
}
