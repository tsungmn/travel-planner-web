import type { Ref } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react";

import type { Flight, Lodging, Stop, Trip } from "@/types";
import { formatPeriod } from "@/lib/date";
import {
  EMPTY_DAY_FLIGHT_STOPS,
  flightStopsOfDay,
  type FlightStop,
} from "@/lib/flightStops";
import { AllDaysList } from "../AllDaysList";
import { DayStopList } from "../DayStopList";
import { DayTabs } from "../DayTabs";
import { FlightSection } from "../FlightSection";
import { LodgingSection } from "../LodgingSection";
import { TripHeaderActions } from "../TripHeaderActions";
import classes from "./TripPanel.module.css";

export type SaveStatus = "saved" | "saving" | "error";

type TripPanelProps = {
  trip: Trip;
  stops: Stop[];
  lodgings: Lodging[];
  flights: Flight[];
  /** 항공편에서 만든 공항 항목 (전체 일차) */
  flightStops: FlightStop[];
  selectedDay: number | null;
  saveStatus: SaveStatus;
  expandedStopId: string | null;
  hoveredStopId: string | null;
  highlightedStopId: string | null;
  /** 장소 목록 영역. 지도 마커를 눌렀을 때 해당 카드로 스크롤하는 데 씁니다. */
  listRef: Ref<HTMLDivElement>;
  onSelectDay: (day: number | null) => void;
  onToggleStop: (id: string) => void;
  onHoverStop: (id: string | null) => void;
  onMemo: (id: string, memo: string) => void;
  onAlias: (id: string, alias: string) => void;
  onMoveStop: (id: string, day: number) => void;
  onReorder: (stops: Stop[]) => void;
  onDeleteStop: (id: string) => void;
  onShareEnable: () => Promise<boolean>;
  onShareDisable: () => Promise<boolean>;
  onTripDelete: () => void;
  onEditTrip: () => void;
  onAddFlight: (direction: Flight["direction"]) => void;
  onEditFlight: (flight: Flight) => void;
  onAddLodging: () => void;
  onEditLodging: (lodging: Lodging) => void;
  onFocusLodging: (lodging: Lodging) => void;
  onFocusFlightStop: (stop: FlightStop) => void;
  onOpenSearch: () => void;
};

export function TripPanel({
  trip,
  stops,
  lodgings,
  flights,
  flightStops,
  selectedDay,
  saveStatus,
  expandedStopId,
  hoveredStopId,
  highlightedStopId,
  listRef,
  onSelectDay,
  onToggleStop,
  onHoverStop,
  onMemo,
  onAlias,
  onMoveStop,
  onReorder,
  onDeleteStop,
  onShareEnable,
  onShareDisable,
  onTripDelete,
  onEditTrip,
  onAddFlight,
  onEditFlight,
  onAddLodging,
  onEditLodging,
  onFocusLodging,
  onFocusFlightStop,
  onOpenSearch,
}: TripPanelProps) {
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
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box className={classes.flexible}>
            <Button
              component={Link}
              href="/trips"
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              뒤로
            </Button>
            <Title order={1} size="h3" lineClamp={1}>
              {trip.title}
            </Title>
            <Text size="sm" c="dimmed">
              {formatPeriod(trip.start_date, trip.end_date)}
            </Text>
          </Box>
          <TripHeaderActions
            trip={trip}
            onShareEnable={onShareEnable}
            onShareDisable={onShareDisable}
            onTripDelete={onTripDelete}
            onEditTrip={onEditTrip}
          />
        </Group>

        <Group gap={6} c="dimmed" role="status" aria-live="polite">
          {saveStatus === "saving" && (
            <>
              <IconLoader2
                size={13}
                className={classes.spin}
                aria-hidden="true"
              />
              <Text size="xs" inherit>
                저장 중…
              </Text>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <IconCheck
                size={13}
                color="var(--mantine-color-green-6)"
                aria-hidden="true"
              />
              <Text size="xs" inherit>
                저장됨
              </Text>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <IconAlertCircle
                size={13}
                color="var(--mantine-color-red-6)"
                aria-hidden="true"
              />
              <Text size="xs" inherit>
                저장 실패
              </Text>
            </>
          )}
        </Group>

        <FlightSection
          flights={flights}
          onAdd={onAddFlight}
          onEdit={onEditFlight}
        />
        <LodgingSection
          lodgings={lodgings}
          onAdd={onAddLodging}
          onEdit={onEditLodging}
          onFocus={onFocusLodging}
        />

        <DayTabs
          numDays={trip.num_days}
          startDate={trip.start_date}
          selectedDay={selectedDay}
          onSelect={onSelectDay}
        />

        <Box ref={listRef}>
          {selectedDay === null ? (
            <AllDaysList
              trip={trip}
              stops={stops}
              lodgings={lodgings}
              flightStops={flightStops}
              hoveredStopId={hoveredStopId}
              onHoverStop={onHoverStop}
              onSelect={onSelectDay}
            />
          ) : (
            <DayStopList
              trip={trip}
              stops={dayStops}
              lodgings={lodgings}
              flightStops={dayFlightStops}
              dayIndex={selectedDay}
              expandedStopId={expandedStopId}
              hoveredStopId={hoveredStopId}
              highlightedStopId={highlightedStopId}
              onToggle={onToggleStop}
              onHover={onHoverStop}
              onFocusFlightStop={onFocusFlightStop}
              onMemo={onMemo}
              onAlias={onAlias}
              onMove={onMoveStop}
              onReorder={onReorder}
              onDelete={onDeleteStop}
            />
          )}
        </Box>

        <Button
          variant="default"
          className={classes.addPlace}
          leftSection={<IconPlus size={16} />}
          onClick={onOpenSearch}
        >
          장소 추가
        </Button>
      </Stack>
    </ScrollArea>
  );
}
