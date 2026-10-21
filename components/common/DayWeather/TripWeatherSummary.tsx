import { Box, Group, Text } from "@mantine/core";
import { IconBackpack, IconRefresh } from "@tabler/icons-react";

import type { TripWeatherSummary as Summary } from "./types";
import {
  basisGuide,
  freshnessText,
  getPackingHints,
  rainyDaysText,
  temperaturePair,
} from "./weatherText";
import classes from "./DayWeather.module.css";

type TripWeatherSummaryProps = {
  summary: Summary | null;
  fetchedAt: string | null;
  stale: boolean;
  loading: boolean;
  failed: boolean;
  hasDays: boolean;
  readOnly?: boolean;
  onRetry?: () => void;
  onPickCity?: () => void;
};

export function TripWeatherSummary({
  summary,
  fetchedAt,
  stale,
  loading,
  failed,
  hasDays,
  readOnly = false,
  onRetry,
  onPickCity,
}: TripWeatherSummaryProps) {
  if (loading)
    return <Box className={classes.summaryReserved} aria-hidden="true" />;
  if (failed)
    return (
      <Box className={classes.summaryState}>
        <Text size="sm">날씨를 불러오지 못했어요</Text>
        {onRetry && (
          <button
            type="button"
            className={classes.summaryAction}
            onClick={onRetry}
          >
            <IconRefresh size={14} /> 다시 시도
          </button>
        )}
      </Box>
    );
  if (!hasDays)
    return readOnly ? null : (
      <Box className={classes.summaryState}>
        <Text size="sm">도시를 정하면 날씨를 보여 드려요</Text>
        {onPickCity && (
          <button
            type="button"
            className={classes.summaryAction}
            onClick={onPickCity}
          >
            도시 정하기
          </button>
        )}
      </Box>
    );
  if (!summary) return null;

  const hints = getPackingHints(summary);
  const guide = basisGuide(summary);
  return (
    <Box
      className={classes.summary}
      aria-label={`여행 날씨 요약: ${temperaturePair(summary.tempMin, summary.tempMax)}`}
    >
      <Group gap={8} wrap="wrap" align="center">
        <Text fw={700} className={classes.summaryTemperature}>
          {temperaturePair(summary.tempMin, summary.tempMax)}
        </Text>
        <Text size="sm" c="dimmed">
          {rainyDaysText(summary)}
        </Text>
      </Group>
      {hints.length > 0 && (
        <Group gap={6} wrap="wrap" mt={8}>
          {hints.map((hint) => (
            <span className={classes.hintChip} key={hint}>
              <IconBackpack size={13} aria-hidden="true" />
              {hint}
            </span>
          ))}
        </Group>
      )}
      {guide && (
        <Text size="xs" c="dimmed" mt={8} className={classes.summaryGuide}>
          {guide}
        </Text>
      )}
      {/* 예보를 쓰지 않은 요약(전부 평년)에는 받은 시각이 의미가 없고, 서버도 fetchedAt을 null로 줍니다. */}
      {summary.basis !== "normal" && fetchedAt ? (
        <Text size="xs" c="dimmed" mt={4}>
          {freshnessText(fetchedAt, stale)}
        </Text>
      ) : null}
    </Box>
  );
}
