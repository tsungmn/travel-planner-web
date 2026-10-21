"use client";

import { Box, Group, Text } from "@mantine/core";
import {
  IconDropletFilled,
  IconMapPin,
  IconPencil,
  IconUmbrellaFilled,
} from "@tabler/icons-react";

import type { DayWeather } from "./types";
import { getConditionMeta } from "./weatherMeta";
import {
  conditionLabel,
  feelsText,
  normalRainText,
  rainLikelihoodLabel,
  rainPeriodLabel,
  temperaturePair,
} from "./weatherText";
import {
  RAIN_PROBABILITY_THRESHOLD,
  STRONG_WIND_THRESHOLD,
} from "./weatherDisplay";
import classes from "./DayWeather.module.css";

type DayWeatherCardProps = {
  weather?: DayWeather | null;
  readOnly?: boolean;
  onEditCity?: () => void;
  isTransit?: boolean;
};

export function DayWeatherCard({
  weather,
  readOnly = false,
  onEditCity,
  isTransit = false,
}: DayWeatherCardProps) {
  if (!weather) return null;

  const editable = !readOnly && Boolean(onEditCity);
  const showName =
    Boolean(weather.placeName) &&
    (weather.placeChangedFromPrev || isTransit || editable);
  const showCity = showName || editable;
  const cityNode = showCity ? (
    <Group gap={4} wrap="nowrap" align="center">
      {showName && (
        <>
          <IconMapPin size={13} aria-hidden="true" />
          <Text size="xs" fw={500} className={classes.cardCity}>
            {weather.placeName}
          </Text>
          {weather.placeSource === "user" && (
            <span className={classes.cityBadge}>내가 정함</span>
          )}
        </>
      )}
      {editable && (
        <button
          type="button"
          className={classes.cityEditBtn}
          onClick={onEditCity}
          aria-label={
            weather.placeName
              ? `이 일차의 도시 바꾸기: ${weather.placeName}`
              : "이 일차의 도시 정하기"
          }
        >
          <IconPencil size={12} aria-hidden="true" />
          <span>도시 바꾸기</span>
        </button>
      )}
    </Group>
  ) : null;

  const forecast = weather.source === "forecast";
  const feels = feelsText(weather);
  const rainText =
    forecast && weather.rainy
      ? `${rainPeriodLabel(weather.rainPeriod)}${weather.precipMm != null ? ` · ${weather.precipMm}mm` : ""}`
      : forecast &&
          weather.confidence === "low" &&
          weather.precipProbability != null
        ? `비 올 가능성: ${rainLikelihoodLabel(weather.precipProbability)}`
        : forecast &&
            weather.precipProbability != null &&
            weather.precipProbability >= RAIN_PROBABILITY_THRESHOLD
          ? `강수확률 ${weather.precipProbability}%`
          : null;
  const accessibility =
    weather.source === "normal"
      ? `${weather.placeName ?? ""} 평년 기준, 보통 ${temperaturePair(weather.tempMin, weather.tempMax)}`
      : `${weather.placeName ?? ""} ${conditionLabel(weather.condition)}, ${temperaturePair(weather.tempMin, weather.tempMax)}${weather.rainy ? ", 비 오는 날" : ""}`;

  return (
    <Box
      className={`${classes.card} ${isTransit ? classes.cardTransit : ""}`}
      role="group"
      aria-label={accessibility}
    >
      <Group gap={10} wrap="nowrap" align="flex-start">
        {forecast ? (
          <span className={classes.cardIcon} aria-hidden="true">
            {(() => {
              const Icon = getConditionMeta(weather.condition).icon;
              return <Icon size={26} stroke={1.6} />;
            })()}
          </span>
        ) : (
          <span className={classes.cardNormalIcon} aria-hidden="true">
            평년
          </span>
        )}
        <Box className={classes.cardBody}>
          {forecast ? (
            <>
              <Group gap={8} wrap="nowrap" align="baseline">
                <Text size="sm" fw={600} className={classes.cardLabel}>
                  {conditionLabel(weather.condition)}
                </Text>
                {weather.confidence === "low" && (
                  <Text size="xs" c="dimmed">
                    먼 날짜라 바뀔 수 있어요
                  </Text>
                )}
              </Group>
              <Group gap={8} wrap="nowrap" align="baseline" mt={4}>
                <span className={classes.cardTempMin}>{weather.tempMin}°</span>
                <span className={classes.cardTempSep}>/</span>
                <span className={classes.cardTempMax}>{weather.tempMax}°</span>
                <Text size="xs" c="dimmed">
                  ℃
                </Text>
              </Group>
              <div className={classes.cardDetails}>
                {feels && (
                  <Text size="xs" c="dimmed">
                    {feels}
                  </Text>
                )}
                {weather.windMax != null &&
                  weather.windMax >= STRONG_WIND_THRESHOLD && (
                    <Text size="xs" c="dimmed">
                      바람 강함 · 최대 {weather.windMax}m/s
                    </Text>
                  )}
                {rainText && (
                  <Group gap={4} wrap="nowrap" className={classes.rainDetail}>
                    <IconUmbrellaFilled size={13} aria-hidden="true" />
                    <Text size="xs">{rainText}</Text>
                  </Group>
                )}
                {weather.sunrise && weather.sunset && (
                  <Text size="xs" c="dimmed">
                    일출 {weather.sunrise} · 일몰 {weather.sunset}
                  </Text>
                )}
              </div>
            </>
          ) : (
            <>
              <Group gap={6} wrap="nowrap" align="center">
                <span className={classes.normalBadge}>평년 기준</span>
                <Text size="sm" fw={600}>
                  보통 {temperaturePair(weather.tempMin, weather.tempMax)}
                </Text>
              </Group>
              {weather.normal && (
                <div className={classes.cardDetails}>
                  <Text size="xs" c="dimmed">
                    추운 날 {weather.normal.coldTemp}° · 따뜻한 날{" "}
                    {weather.normal.hotTemp}°
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <IconDropletFilled
                      size={13}
                      className={classes.normalRain}
                      aria-hidden="true"
                    />
                    <Text size="xs" c="dimmed">
                      {normalRainText(weather.normal.rainyRatio)}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    과거 10년 같은 시기 평균이에요.
                  </Text>
                  {weather.normal.fallbackReason === "forecast_failed" && (
                    <Text size="xs" c="dimmed">
                      예보를 받지 못해 평년 기준으로 보여 드려요.
                    </Text>
                  )}
                </div>
              )}
            </>
          )}
          {cityNode && (
            <Box mt={8} className={classes.cardCityRow}>
              {cityNode}
            </Box>
          )}
        </Box>
      </Group>
    </Box>
  );
}
