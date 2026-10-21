import { Fragment } from "react";
import type { Lodging, TripPublic, SharedStop } from "@/types";
import {
  Stack,
  Box,
  UnstyledButton,
  Paper,
  Card,
  Group,
  ThemeIcon,
  Text,
} from "@mantine/core";
import classes from "./AllDaysList.module.css";
import { addDays, formatDayDate } from "@/lib/date";
import { IconHome } from "@tabler/icons-react";
import { getDayColor } from "@/lib/dayColor";
import { isHiddenStop, numberStops } from "@/lib/lodging";
import { flightStopsOfDay, type FlightStop } from "@/lib/flightStops";
import { AirportStopGroup } from "@/components/common/AirportStopRow";
import { DistanceSeparator } from "@/components/common/DistanceSeparator";
import type { TripWeatherState } from "@/hooks/useTripWeather";
import { isTripEnded } from "@/lib/weather";
import { DayWeatherInline } from "@/components/common/DayWeather/DayWeatherInline";
import { TripWeatherSummary } from "@/components/common/DayWeather/TripWeatherSummary";

export function AllDaysList({
  trip,
  stops,
  lodgings,
  flightStops,
  hoveredStopId,
  onHoverStop,
  onSelect,
  weather,
  readOnly = false,
  onPickCity,
}: {
  trip: TripPublic;
  stops: SharedStop[];
  lodgings: Lodging[];
  /** 항공편에서 만든 공항. 개수에는 들어가지 않습니다. */
  flightStops: FlightStop[];
  hoveredStopId: string | null;
  onHoverStop: (id: string | null) => void;
  onSelect: (day: number) => void;
  /** 일차별 날씨. 없으면 날씨를 그리지 않습니다. */
  weather?: TripWeatherState;
  readOnly?: boolean;
  onPickCity?: () => void;
}) {
  return (
    <Stack gap="md">
      {weather && !isTripEnded(trip.end_date) && (
        <TripWeatherSummary
          summary={weather.summary}
          fetchedAt={weather.fetchedAt}
          stale={weather.stale}
          loading={weather.loading}
          failed={weather.failed}
          hasDays={weather.byDate.size > 0}
          readOnly={readOnly}
          onRetry={weather.retry}
          onPickCity={onPickCity}
        />
      )}
      {Array.from({ length: trip.num_days }, (_, day) => {
        const dayStops = stops
          .filter((stop) => stop.day_index === day)
          .sort((a, b) => a.sort_order - b.sort_order);
        const color = getDayColor(day).hex;
        // 숙소는 번호도, "n곳" 개수도 차지하지 않습니다.
        const numbers = numberStops(dayStops, lodgings);
        const placeCount = numbers.filter((value) => value !== null).length;
        const airports = flightStopsOfDay(flightStops, day);
        const airportGroup = (items: FlightStop[]) => (
          <AirportStopGroup
            stops={items}
            hoveredId={hoveredStopId}
            onHover={onHoverStop}
            onSelect={() => onSelect(day)}
          />
        );
        return (
          <Box key={day}>
            <UnstyledButton
              className={classes.dayHeading}
              onClick={() => onSelect(day)}
            >
              <Box className={classes.dayDot} style={{ background: color }} />
              <Text fw={600}>{day + 1}일차</Text>
              <Text size="sm" c="dimmed">
                · {formatDayDate(trip.start_date, day)} · {placeCount}곳
              </Text>
              {weather && (
                <Box ml="auto">
                  <DayWeatherInline
                    weather={weather.byDate.get(addDays(trip.start_date, day))}
                    reserveHeight={weather.loading}
                  />
                </Box>
              )}
            </UnstyledButton>
            <Stack gap="xs">
              {airportGroup(airports.start)}
              {dayStops.length ? (
                <Stack gap={0}>
                  {dayStops.map((stop, index) => {
                    const prev = index > 0 ? dayStops[index - 1] : undefined;
                    return (
                      <Fragment key={stop.id}>
                        {prev && <DistanceSeparator from={prev} to={stop} />}
                        <StopPreview
                          stop={stop}
                          number={numbers[index]}
                          color={color}
                          onClick={() => onSelect(day)}
                        />
                      </Fragment>
                    );
                  })}
                </Stack>
              ) : (
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed" ta="center">
                    아직 장소가 없어요.
                  </Text>
                </Paper>
              )}
              {airportGroup(airports.end)}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function StopPreview({
  stop,
  number,
  color,
  onClick,
}: {
  stop: SharedStop;
  /** 숙소는 null입니다. */
  number: number | null;
  color: string;
  onClick: () => void;
}) {
  // 숙소를 비공개로 둔 공유 링크: 이름·주소·메모 없이 "숙소"로만 보여줍니다.
  if (isHiddenStop(stop)) {
    return (
      <Card
        component="button"
        type="button"
        withBorder
        p="sm"
        radius="md"
        className={classes.stopCard}
        onClick={onClick}
      >
        <Group wrap="nowrap">
          <ThemeIcon size="sm" radius="xl" style={{ background: color }}>
            <IconHome size={12} stroke={2.5} aria-hidden="true" />
          </ThemeIcon>
          <Text size="sm" fw={600}>
            숙소
          </Text>
        </Group>
      </Card>
    );
  }
  return (
    <Card
      component="button"
      type="button"
      withBorder
      p="sm"
      radius="md"
      className={classes.stopCard}
      onClick={onClick}
    >
      <Group wrap="nowrap">
        <ThemeIcon size="sm" radius="xl" style={{ background: color }}>
          {number === null ? (
            <IconHome size={12} stroke={2.5} role="img" aria-label="숙소" />
          ) : (
            <Text size="xs" c="white" fw={700}>
              {number}
            </Text>
          )}
        </ThemeIcon>
        <Box className={classes.flexible}>
          <Text size="sm" fw={600} truncate>
            {stop.alias ?? stop.name}
          </Text>
          {stop.alias && (
            <Text size="xs" c="dimmed" truncate>
              {stop.name}
            </Text>
          )}
          {stop.address_text && (
            <Text size="xs" c="dimmed" truncate>
              {stop.address_text}
            </Text>
          )}
          {stop.memo && (
            <Text size="xs" c="dimmed" truncate>
              {stop.memo}
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  );
}
