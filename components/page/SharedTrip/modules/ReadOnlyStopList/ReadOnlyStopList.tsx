import { Fragment } from "react";
import {
  Box,
  Card,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";

import { IconHome } from "@tabler/icons-react";

import type { Lodging, Stop } from "@/types";
import { getDayColor } from "@/lib/dayColor";
import { numberStops } from "@/lib/lodging";
import type { DayFlightStops, FlightStop } from "@/lib/flightStops";
import { AirportStopGroup } from "@/components/page/TripDetail/modules/AirportStopRow";
import { DistanceSeparator } from "@/components/page/TripDetail/modules/DistanceSeparator";
import classes from "./ReadOnlyStopList.module.css";

type ReadOnlyStopListProps = {
  stops: Stop[];
  lodgings: Lodging[];
  /** 항공편에서 만든 공항. 출국편은 맨 위, 귀국편은 맨 아래에 붙습니다. */
  flightStops: DayFlightStops;
  expandedStopId: string | null;
  hoveredStopId: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onFocusFlightStop: (stop: FlightStop) => void;
};

/** 한 일차의 장소 목록. 수정할 수 없고, 메모가 있는 카드만 펼쳐 볼 수 있습니다. */
export function ReadOnlyStopList({
  stops,
  lodgings,
  flightStops,
  expandedStopId,
  hoveredStopId,
  onToggle,
  onHover,
  onFocusFlightStop,
}: ReadOnlyStopListProps) {
  const numbers = numberStops(stops, lodgings);
  const airportGroup = (items: FlightStop[]) => (
    <AirportStopGroup
      stops={items}
      hoveredId={hoveredStopId}
      onHover={onHover}
      onSelect={onFocusFlightStop}
    />
  );

  return (
    <Stack gap="xs">
      {airportGroup(flightStops.start)}
      {stops.length ? (
        <Stack gap={0}>
          {stops.map((stop, index) => (
            <Fragment key={stop.id}>
              {index > 0 && (
                <DistanceSeparator from={stops[index - 1]} to={stop} />
              )}
              <ReadOnlyStop
                stop={stop}
                number={numbers[index]}
                expanded={expandedStopId === stop.id}
                hovered={hoveredStopId === stop.id}
                onToggle={() => onToggle(stop.id)}
                onHover={onHover}
              />
            </Fragment>
          ))}
        </Stack>
      ) : (
        <Paper withBorder p="lg" radius="md">
          <Text size="sm" c="dimmed" ta="center">
            아직 장소가 없어요.
          </Text>
        </Paper>
      )}
      {airportGroup(flightStops.end)}
    </Stack>
  );
}

function ReadOnlyStop({
  stop,
  number,
  expanded,
  hovered,
  onToggle,
  onHover,
}: {
  stop: Stop;
  /** 숙소는 null입니다. */
  number: number | null;
  expanded: boolean;
  hovered: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}) {
  const expandable = Boolean(stop.memo);

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      className={classes.stopCard}
      data-stop-id={stop.id}
      data-hovered={hovered || undefined}
      data-expanded={(expandable && expanded) || undefined}
      onMouseEnter={() => onHover(stop.id)}
      onMouseLeave={() => onHover(null)}
    >
      <UnstyledButton
        className={classes.trigger}
        data-expandable={expandable || undefined}
        aria-expanded={expandable ? expanded : undefined}
        onClick={expandable ? onToggle : undefined}
      >
        <Group align="flex-start" wrap="nowrap">
          <ThemeIcon
            size="sm"
            radius="xl"
            style={{ background: getDayColor(stop.day_index).hex }}
          >
            {number === null ? (
              <IconHome size={12} stroke={2.5} role="img" aria-label="숙소" />
            ) : (
              <Text size="xs" c="white" fw={700}>
                {number}
              </Text>
            )}
          </ThemeIcon>
          <Box className={classes.flexible}>
            <Text fw={600} truncate>
              {stop.alias ?? stop.name}
            </Text>
            {stop.alias && (
              <Text size="xs" c="dimmed" truncate>
                {stop.name}
              </Text>
            )}
            {stop.address_text && (
              <Text size="sm" c="dimmed" truncate>
                {stop.address_text}
              </Text>
            )}
            {stop.memo && !expanded && (
              <Text size="xs" c="dimmed" truncate>
                {stop.memo}
              </Text>
            )}
          </Box>
        </Group>
      </UnstyledButton>
      {stop.memo && (
        <Collapse expanded={expanded}>
          <Text size="xs" c="dimmed" className={classes.memo}>
            {stop.memo}
          </Text>
        </Collapse>
      )}
    </Card>
  );
}
