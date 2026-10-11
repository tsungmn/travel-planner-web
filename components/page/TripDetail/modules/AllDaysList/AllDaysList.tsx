import { Fragment } from "react";
import type { Lodging, TripPublic, Stop } from "@/types";
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
import { formatDayDate } from "@/lib/date";
import { IconHome } from "@tabler/icons-react";
import { getDayColor } from "@/lib/dayColor";
import { numberStops } from "@/lib/lodging";
import { flightStopsOfDay, type FlightStop } from "@/lib/flightStops";
import { AirportStopGroup } from "../AirportStopRow";
import { DistanceSeparator } from "../DistanceSeparator";

export function AllDaysList({
  trip,
  stops,
  lodgings,
  flightStops,
  hoveredStopId,
  onHoverStop,
  onSelect,
}: {
  trip: TripPublic;
  stops: Stop[];
  lodgings: Lodging[];
  /** 항공편에서 만든 공항. 개수에는 들어가지 않습니다. */
  flightStops: FlightStop[];
  hoveredStopId: string | null;
  onHoverStop: (id: string | null) => void;
  onSelect: (day: number) => void;
}) {
  return (
    <Stack gap="md">
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
            </UnstyledButton>
            <Stack gap="xs">
              {airportGroup(airports.start)}
              {dayStops.length ? (
                <Stack gap={0}>
                  {dayStops.map((stop, index) => (
                    <Fragment key={stop.id}>
                      {index > 0 && (
                        <DistanceSeparator
                          from={dayStops[index - 1]}
                          to={stop}
                        />
                      )}
                      <StopPreview
                        stop={stop}
                        number={numbers[index]}
                        color={color}
                        onClick={() => onSelect(day)}
                      />
                    </Fragment>
                  ))}
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
  stop: Stop;
  /** 숙소는 null입니다. */
  number: number | null;
  color: string;
  onClick: () => void;
}) {
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
