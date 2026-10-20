"use client";

import { Box, Group, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangleFilled,
  IconDropletFilled,
  IconMapPin,
  IconPencil,
  IconUmbrellaFilled,
} from "@tabler/icons-react";

import type { DayWeather } from "./types";
import classes from "./DayWeather.module.css";
import { getConditionMeta, isPrecipHigh } from "./weatherMeta";

type DayWeatherCardProps = {
  weather?: DayWeather | null;
  /** 공유(읽기 전용) 화면에서는 도시 변경 진입점을 숨깁니다. */
  readOnly?: boolean;
  /**
   * 도시 변경 진입점 클릭 시 호출. readOnly이거나 미제공이면 숨김.
   * 넘기면 같은 도시가 이어지는 날에도 도시 이름과 "도시 바꾸기"를 항상 보여 줍니다.
   * (자동 추정이 틀린 날을 바로 고칠 수 있어야 하기 때문입니다)
   */
  onEditCity?: () => void;
  /** 이동일의 두 도시 카드 중 하나. 두 도시를 구분해야 하니 도시 이름을 항상 보여 줍니다. */
  isTransit?: boolean;
};

/**
 * 일차별 패널 위쪽에 카드로 들어가는 날씨 표시. 전체 탭의 인라인 요약보다
 * 정보가 살짝 더 많습니다(도시 이름, 바뀔 수 있음 안내 등).
 */
export function DayWeatherCard({
  weather,
  readOnly = false,
  onEditCity,
  isTransit = false,
}: DayWeatherCardProps) {
  if (!weather) return null;

  const meta = getConditionMeta(weather.condition);

  const editable = !readOnly && Boolean(onEditCity);
  const showName =
    Boolean(weather.placeName) &&
    (weather.placeChangedFromPrev || isTransit || editable);
  // 도시 이름 조회가 실패해 이름이 없는 일차도, 고칠 수 있으면 버튼은 보여 줍니다.
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

  return (
    <Box
      className={`${classes.card} ${isTransit ? classes.cardTransit : ""}`}
      role="group"
      aria-label={`${weather.placeName ? `${weather.placeName} ` : ""}${weather.label}, 최저 ${weather.tempMin}도, 최고 ${weather.tempMax}도${
        typeof weather.precipProbability === "number"
          ? `, 강수 확률 ${weather.precipProbability}퍼센트`
          : ""
      }${weather.uncertain ? ", 바뀔 수 있는 예보" : ""}`}
    >
      <Group gap={10} wrap="nowrap" align="flex-start">
        <span className={classes.cardIcon} aria-hidden="true">
          <meta.icon size={26} stroke={1.6} />
        </span>

        <Box className={classes.cardBody}>
          <Group gap={8} wrap="nowrap" align="baseline">
            <Text size="sm" fw={600} className={classes.cardLabel}>
              {weather.label}
            </Text>
            {weather.uncertain && (
              <Tooltip
                label="먼 날짜 예보라 바뀔 수 있어요"
                position="top"
                withArrow
              >
                <span className={classes.uncertainPill}>
                  <IconAlertTriangleFilled size={10} aria-hidden="true" />
                  <span>변동 가능</span>
                </span>
              </Tooltip>
            )}
          </Group>

          <Group gap={8} wrap="nowrap" align="center" mt={2}>
            <Group gap={2} wrap="nowrap" align="baseline">
              <span className={classes.cardTempMin}>{weather.tempMin}°</span>
              <span className={classes.cardTempSep} aria-hidden="true">
                /
              </span>
              <span className={classes.cardTempMax}>{weather.tempMax}°</span>
            </Group>
            <Text size="xs" c="dimmed" className={classes.cardTempUnit}>
              ℃
            </Text>

            {typeof weather.precipProbability === "number" &&
              weather.precipProbability > 0 && (
                <Group
                  gap={3}
                  wrap="nowrap"
                  align="center"
                  className={
                    isPrecipHigh(weather.precipProbability)
                      ? classes.cardPrecipHigh
                      : classes.cardPrecipLow
                  }
                >
                  {isPrecipHigh(weather.precipProbability) ? (
                    <IconUmbrellaFilled size={13} aria-hidden="true" />
                  ) : (
                    <IconDropletFilled size={11} aria-hidden="true" />
                  )}
                  <Text size="xs" fw={500} component="span">
                    강수 {weather.precipProbability}%
                  </Text>
                </Group>
              )}
          </Group>

          {cityNode && (
            <Box mt={6} className={classes.cardCityRow}>
              {cityNode}
            </Box>
          )}
        </Box>
      </Group>
    </Box>
  );
}
