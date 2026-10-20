"use client";

import { Box, Group, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangleFilled,
  IconUmbrellaFilled,
} from "@tabler/icons-react";

import type { DayWeather } from "./types";
import { getConditionMeta, isPrecipHigh } from "./weatherMeta";
import classes from "./DayWeather.module.css";

type DayWeatherInlineProps = {
  weather?: DayWeather | null;
  /** 렌더 자리를 미리 잡아, 날씨가 나중에 도착해도 주변이 밀리지 않게 합니다. */
  reserveHeight?: boolean;
  /** 도시 이름을 항상 보여 줍니다. (이동일 "프라하 → 빈"처럼 둘을 구분해야 할 때) */
  showCity?: boolean;
};

/**
 * 일차 헤더("● 1일차 · 11.21 (토) · 5곳") 옆에 한 줄로 들어가는 날씨 요약.
 * - 예보가 없으면 아무것도 그리지 않습니다(예약 공간만).
 * - 날씨 상태 아이콘 + 최저/최고 기온 + (높을 때만) 강수확률.
 * - 도시가 바뀐 일차라면 도시 이름이 같이 나옵니다. (이동일이면 "출발 → 도착")
 */
export function DayWeatherInline({
  weather,
  reserveHeight = true,
  showCity = false,
}: DayWeatherInlineProps) {
  if (!weather) {
    return reserveHeight ? (
      <Box className={classes.inlineReserved} aria-hidden="true" />
    ) : null;
  }

  const meta = getConditionMeta(weather.condition);
  // 이동일(출발 도시 예보가 있는 날)은 "프라하 → 빈"으로 적습니다. 날씨는 도착 도시 것입니다.
  const fromName = weather.transitFrom?.placeName;
  const city =
    weather.placeName && (showCity || weather.placeChangedFromPrev)
      ? fromName
        ? `${fromName} → ${weather.placeName}`
        : weather.placeName
      : null;
  const hasPrecip = typeof weather.precipProbability === "number";

  // 스크린 리더에는 이 한 문장만 읽히고, 아래 시각 표시는 숨깁니다. (같은 말이 두 번 읽히지 않게)
  const summary = [
    city,
    weather.label,
    `최저 ${weather.tempMin}도`,
    `최고 ${weather.tempMax}도`,
    hasPrecip ? `강수 확률 ${weather.precipProbability}퍼센트` : null,
    weather.uncertain ? "바뀔 수 있는 예보" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Group gap={8} wrap="nowrap" align="center" className={classes.inline}>
      <Group gap={8} wrap="nowrap" align="center" aria-hidden="true">
        {city && (
          <Text size="xs" c="dimmed" className={classes.inlineCity}>
            {city}
          </Text>
        )}

        <Group gap={6} wrap="nowrap" align="center">
          <Tooltip label={weather.label} position="top" withArrow>
            <span className={classes.iconWrap}>
              <meta.icon size={16} stroke={1.75} />
            </span>
          </Tooltip>

          <Text size="xs" c="dimmed" fw={500} component="span">
            <span className={classes.tempMin}>{weather.tempMin}°</span>
            <span className={classes.tempSep}> / </span>
            <span className={classes.tempMax}>{weather.tempMax}°</span>
          </Text>

          {isPrecipHigh(weather.precipProbability) && (
            <Group
              gap={3}
              wrap="nowrap"
              align="center"
              className={classes.precip}
            >
              <IconUmbrellaFilled size={13} />
              <Text size="xs" fw={500} component="span">
                {weather.precipProbability}%
              </Text>
            </Group>
          )}

          {weather.uncertain && (
            <Tooltip
              label="먼 날짜 예보라 바뀔 수 있어요"
              position="top"
              withArrow
            >
              <span className={classes.uncertainDot}>
                <IconAlertTriangleFilled size={11} />
              </span>
            </Tooltip>
          )}
        </Group>
      </Group>

      <span className={classes.srOnly}>{summary}</span>
    </Group>
  );
}
