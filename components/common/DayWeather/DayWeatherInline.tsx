"use client";

import { Box, Group, Text } from "@mantine/core";
import { IconDropletFilled, IconUmbrellaFilled } from "@tabler/icons-react";

import type { DayWeather } from "./types";
import { getConditionMeta } from "./weatherMeta";
import { conditionLabel, rainPeriodLabel } from "./weatherText";
import classes from "./DayWeather.module.css";

type DayWeatherInlineProps = {
  weather?: DayWeather | null;
  reserveHeight?: boolean;
  showCity?: boolean;
};

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

  const fromName = weather.transitFrom?.placeName;
  const city =
    weather.placeName && (showCity || weather.placeChangedFromPrev)
      ? fromName
        ? `${fromName} → ${weather.placeName}`
        : weather.placeName
      : null;
  const label = conditionLabel(weather.condition);
  const summary = [
    city,
    weather.source === "forecast" ? label : "평년 기준",
    `최저 ${weather.tempMin}도`,
    `최고 ${weather.tempMax}도`,
    weather.rainy
      ? weather.rainPeriod
        ? rainPeriodLabel(weather.rainPeriod)
        : "비 오는 날"
      : weather.normal?.rainLikely
        ? "비가 올 수 있음"
        : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Group
      gap={8}
      wrap="nowrap"
      align="center"
      className={classes.inline}
      aria-label={summary}
    >
      {city && (
        <Text size="xs" c="dimmed" className={classes.inlineCity}>
          {city}
        </Text>
      )}
      <Group gap={6} wrap="nowrap" align="center">
        {weather.source === "forecast" ? (
          <span className={classes.iconWrap} aria-hidden="true">
            {(() => {
              const Icon = getConditionMeta(weather.condition).icon;
              return <Icon size={16} stroke={1.75} />;
            })()}
          </span>
        ) : null}
        <Text
          size="xs"
          fw={500}
          component="span"
          className={
            weather.source === "normal" ? classes.normalInline : undefined
          }
        >
          <span className={classes.tempMin}>{weather.tempMin}°</span>
          <span className={classes.tempSep}> / </span>
          <span className={classes.tempMax}>{weather.tempMax}°</span>
        </Text>
        {weather.source === "normal" && (
          <span className={classes.normalBadge}>평년</span>
        )}
        {weather.source === "forecast" && weather.rainy && (
          <IconUmbrellaFilled
            size={13}
            className={classes.precip}
            aria-label={
              weather.rainPeriod ? rainPeriodLabel(weather.rainPeriod) : "비"
            }
          />
        )}
        {weather.source === "normal" && weather.normal?.rainLikely && (
          <IconDropletFilled
            size={13}
            className={classes.precip}
            aria-label="비 가능성 있음"
          />
        )}
      </Group>
      <span className={classes.srOnly}>{summary}</span>
    </Group>
  );
}
