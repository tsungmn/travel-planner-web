import type { Ref } from "react";
import { Box, Group, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import type {
  Flight,
  Lodging,
  ShareOptions,
  SharedStop,
  TripPublic,
} from "@/types";
import { addDays, formatPeriod } from "@/lib/date";
import {
  EMPTY_DAY_FLIGHT_STOPS,
  flightStopsOfDay,
  type FlightStop,
} from "@/lib/flightStops";
import { AllDaysList } from "@/components/common/AllDaysList";
import { DayTabs } from "@/components/common/DayTabs";
import { DayWeatherSlot } from "@/components/common/DayWeather/DayWeatherSlot";
import { WeatherAttribution } from "@/components/common/DayWeather/WeatherAttribution";
import type { TripWeatherState } from "@/hooks/useTripWeather";
import { FlightSection } from "@/components/common/FlightSection";
import { LodgingSection } from "@/components/common/LodgingSection";
import { ReadOnlyStopList } from "../ReadOnlyStopList";
import classes from "./SharePanel.module.css";

type SharePanelProps = {
  trip: TripPublic;
  /** 소유자가 공개한 항목. 공개하지 않은 항목은 "없음"이 아니라 아예 숨깁니다. */
  share: ShareOptions;
  stops: SharedStop[];
  lodgings: Lodging[];
  flights: Flight[];
  /** 항공편에서 만든 공항 항목 (전체 일차) */
  flightStops: FlightStop[];
  /** 일차별 날씨 */
  weather: TripWeatherState;
  selectedDay: number | null;
  expandedStopId: string | null;
  hoveredStopId: string | null;
  /** 장소 목록 영역. 지도 마커를 눌렀을 때 해당 카드로 스크롤하는 데 씁니다. */
  listRef: Ref<HTMLDivElement>;
  onSelectDay: (day: number | null) => void;
  onToggleStop: (id: string) => void;
  onHoverStop: (id: string | null) => void;
  onFocusLodging: (lodging: Lodging) => void;
  onFocusFlightStop: (stop: FlightStop) => void;
};

// 읽기 전용이라 추가·수정 콜백은 호출되지 않습니다.
const noop = () => {};

export function SharePanel({
  trip,
  share,
  stops,
  lodgings,
  flights,
  flightStops,
  weather,
  selectedDay,
  expandedStopId,
  hoveredStopId,
  listRef,
  onSelectDay,
  onToggleStop,
  onHoverStop,
  onFocusLodging,
  onFocusFlightStop,
}: SharePanelProps) {
  const dayStops =
    selectedDay === null
      ? []
      : stops
          .filter((stop) => stop.day_index === selectedDay)
          .sort((a, b) => a.sort_order - b.sort_order);
  const dayFlightStops =
    selectedDay === null
      ? EMPTY_DAY_FLIGHT_STOPS
      : flightStopsOfDay(flightStops, selectedDay);

  return (
    <ScrollArea className={classes.root} offsetScrollbars>
      <Stack gap="md" p="md">
        <Box>
          <Title order={1} size="h3" lineClamp={1}>
            {trip.title}
          </Title>
          <Text size="sm" c="dimmed">
            {trip.destination} · {formatPeriod(trip.start_date, trip.end_date)}
          </Text>
        </Box>

        {share.flights && (
          <FlightSection
            flights={flights}
            onAdd={noop}
            onEdit={noop}
            readOnly
          />
        )}
        {share.lodgings && (
          <LodgingSection
            lodgings={lodgings}
            onAdd={noop}
            onEdit={noop}
            onFocus={onFocusLodging}
            readOnly
          />
        )}

        <DayTabs
          numDays={trip.num_days}
          startDate={trip.start_date}
          selectedDay={selectedDay}
          onSelect={onSelectDay}
        />

        {selectedDay !== null && (
          <DayWeatherSlot
            readOnly
            weather={weather.byDate.get(addDays(trip.start_date, selectedDay))}
          />
        )}

        <Box ref={listRef}>
          {selectedDay === null ? (
            <AllDaysList
              weather={weather}
              trip={trip}
              stops={stops}
              lodgings={lodgings}
              flightStops={flightStops}
              hoveredStopId={hoveredStopId}
              onHoverStop={onHoverStop}
              onSelect={onSelectDay}
              readOnly
            />
          ) : (
            <ReadOnlyStopList
              stops={dayStops}
              lodgings={lodgings}
              flightStops={dayFlightStops}
              expandedStopId={expandedStopId}
              hoveredStopId={hoveredStopId}
              onToggle={onToggleStop}
              onHover={onHoverStop}
              onFocusFlightStop={onFocusFlightStop}
            />
          )}
        </Box>

        <WeatherAttribution attribution={weather.attribution} />

        <Group gap={6} wrap="nowrap" className={classes.notice}>
          <IconAlertCircle size={14} aria-hidden="true" />
          <Text size="xs" inherit>
            이 일정은 링크로 공유된 읽기 전용 화면이에요.
          </Text>
        </Group>
      </Stack>
    </ScrollArea>
  );
}
