"use client";

import { Box } from "@mantine/core";
import { IconArrowDown } from "@tabler/icons-react";

import type { DayWeather } from "./types";
import { DayWeatherCard } from "./DayWeatherCard";
import classes from "./DayWeather.module.css";

type TransitWeatherProps = {
  from?: DayWeather | null;
  to?: DayWeather | null;
  readOnly?: boolean;
  /** 도착 도시(to)만 바꿀 수 있습니다. 출발 도시는 전날의 도시이니 전날에서 바꿉니다. */
  onEditCity?: () => void;
};

/**
 * 하루에 도시가 둘인 이동일(예: "프라하 → 빈")의 날씨 표시.
 * 두 도시의 날씨를 세로로 쌓고 사이에 아래 화살표를 둡니다.
 */
export function TransitWeather({
  from,
  to,
  readOnly = false,
  onEditCity,
}: TransitWeatherProps) {
  if (!from && !to) return null;

  return (
    <Box className={classes.transitPair} role="group" aria-label="이동일 날씨">
      {from && <DayWeatherCard weather={from} readOnly isTransit />}
      {from && to && (
        <span className={classes.transitArrow} aria-hidden="true">
          <IconArrowDown size={16} />
        </span>
      )}
      {to && (
        <DayWeatherCard
          weather={to}
          readOnly={readOnly}
          isTransit
          onEditCity={onEditCity}
        />
      )}
    </Box>
  );
}
