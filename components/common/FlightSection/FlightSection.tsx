import {
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconClock,
  IconPlane,
  IconPlus,
} from "@tabler/icons-react";

import type { Flight } from "@/types";
import { formatDateShort, formatTime } from "@/lib/date";
import { airportCity, useAirports } from "@/lib/airports";
import {
  flightDurationLabel,
  formatDuration,
  isLongLayover,
  isNextDayArrival,
  layoverMs,
  routeSummary,
  sortFlightsByDirection,
  totalTravelMs,
} from "@/lib/flightTime";
import { InfoSection } from "@/components/common/InfoSection";
import classes from "./FlightSection.module.css";

type FlightSectionProps = {
  flights: Flight[];
  onAdd: (direction: Flight["direction"]) => void;
  onEdit: (flight: Flight) => void;
  /** 공유 보기처럼 수정할 수 없는 화면에서 켭니다. */
  readOnly?: boolean;
};

export function FlightSection({
  flights,
  onAdd,
  onEdit,
  readOnly = false,
}: FlightSectionProps) {
  const outbound = sortFlightsByDirection(flights, "outbound");
  const inbound = sortFlightsByDirection(flights, "inbound");
  const hasAny = outbound.length > 0 || inbound.length > 0;

  return (
    <InfoSection title="항공편" icon={<IconPlane size={17} />}>
      <Stack gap="sm">
        {!hasAny && (
          <Paper withBorder radius="md" p="md" className={classes.empty}>
            <Text size="xs" c="dimmed" ta="center">
              {readOnly
                ? "등록된 항공편이 없어요."
                : "항공편을 추가하면 일정과 함께 볼 수 있어요"}
            </Text>
          </Paper>
        )}
        <DirectionBlock
          direction="outbound"
          flights={outbound}
          readOnly={readOnly}
          onAdd={() => onAdd("outbound")}
          onEdit={onEdit}
        />
        <DirectionBlock
          direction="inbound"
          flights={inbound}
          readOnly={readOnly}
          onAdd={() => onAdd("inbound")}
          onEdit={onEdit}
        />
      </Stack>
    </InfoSection>
  );
}

function DirectionBlock({
  direction,
  flights,
  readOnly,
  onAdd,
  onEdit,
}: {
  direction: Flight["direction"];
  flights: Flight[];
  readOnly: boolean;
  onAdd: () => void;
  onEdit: (flight: Flight) => void;
}) {
  const label = direction === "outbound" ? "출국" : "귀국";

  if (flights.length === 0) {
    if (readOnly) return null;
    return (
      <UnstyledButton className={classes.addEmpty} onClick={onAdd}>
        <IconPlus size={16} aria-hidden="true" />
        {label} 항공편 추가
      </UnstyledButton>
    );
  }

  const totalMs = totalTravelMs(flights);
  const layovers = flights.length - 1;
  const stopLabel = layovers === 0 ? "직항" : `경유 ${layovers}회`;
  const summary =
    totalMs !== null ? `${formatDuration(totalMs)} · ${stopLabel}` : stopLabel;

  return (
    <Paper withBorder radius="md">
      <Group
        gap="xs"
        wrap="nowrap"
        px="sm"
        py="xs"
        className={classes.blockHeader}
      >
        <Badge
          size="xs"
          variant={direction === "outbound" ? "filled" : "light"}
          color="teal"
        >
          {label}
        </Badge>
        <Text size="sm" fw={600}>
          {routeSummary(flights)}
        </Text>
        <Text size="xs" c="dimmed" ml="auto">
          {summary}
        </Text>
      </Group>

      <Box px="sm" py="xs">
        {flights.map((flight, index) => (
          <Box key={flight.id}>
            {index > 0 && (
              <LayoverNote prev={flights[index - 1]} curr={flight} />
            )}
            <Segment
              flight={flight}
              readOnly={readOnly}
              onClick={() => onEdit(flight)}
            />
          </Box>
        ))}
      </Box>

      {!readOnly && (
        <Box px="sm" py={6} className={classes.blockFooter}>
          <UnstyledButton className={classes.addSegment} onClick={onAdd}>
            <IconPlus size={12} aria-hidden="true" />
            경유 구간 추가
          </UnstyledButton>
        </Box>
      )}
    </Paper>
  );
}

function LayoverNote({ prev, curr }: { prev: Flight; curr: Flight }) {
  const { index } = useAirports();

  if (prev.arr_airport !== curr.dep_airport) {
    return (
      <Group gap={6} wrap="nowrap" px="xs" py={4} c="orange.8">
        <IconAlertTriangle size={12} aria-hidden="true" />
        <Text size="xs" inherit>
          공항이 달라요 ({prev.arr_airport} → {curr.dep_airport})
        </Text>
      </Group>
    );
  }

  const waitMs = layoverMs(prev, curr);
  const wait = waitMs !== null ? formatDuration(waitMs) : "";
  const long = isLongLayover(prev, curr);
  const airport = curr.dep_airport ? index?.byIata.get(curr.dep_airport) : null;
  const city = airport ? airportCity(airport) : (curr.dep_airport ?? "");

  return (
    <Group
      gap={6}
      wrap="nowrap"
      px="xs"
      py={4}
      c={long ? "orange.8" : "dimmed"}
    >
      <IconClock size={12} aria-hidden="true" />
      <Text size="xs" inherit>
        경유 · {city}({curr.dep_airport}){wait && ` · 대기 ${wait}`}
        {long && " · 장시간 경유"}
      </Text>
    </Group>
  );
}

function Segment({
  flight,
  readOnly,
  onClick,
}: {
  flight: Flight;
  readOnly: boolean;
  onClick: () => void;
}) {
  const duration = flightDurationLabel(flight);
  const nextDay = isNextDayArrival(flight);

  const content = (
    <>
      <span className={classes.dot} aria-hidden="true" />
      <Box className={classes.segmentBody}>
        <Group gap="xs">
          <Text size="xs" fw={500} c="dimmed">
            {flight.flight_no}
          </Text>
          {flight.dep_local && (
            <Text size="xs" c="dimmed">
              {formatDateShort(flight.dep_local.slice(0, 10))}
            </Text>
          )}
        </Group>
        <Group gap={6} wrap="nowrap" mt={4}>
          <Text size="sm" fw={600}>
            {flight.dep_airport ?? "—"}
          </Text>
          <Text size="sm" fw={600} c="dimmed">
            {formatTime(flight.dep_local)}
          </Text>
          <IconArrowRight size={12} aria-hidden="true" />
          <Text size="sm" fw={600}>
            {flight.arr_airport ?? "—"}
          </Text>
          <Text size="sm" fw={600} c="dimmed">
            {formatTime(flight.arr_local)}
            {nextDay && (
              <Text component="span" size="xs" c="teal" ml={2}>
                +1일
              </Text>
            )}
          </Text>
        </Group>
        {duration && (
          <Text size="xs" c="dimmed" mt={2}>
            비행 {duration}
          </Text>
        )}
      </Box>
    </>
  );

  if (readOnly) return <Box className={classes.segment}>{content}</Box>;

  return (
    <UnstyledButton
      className={classes.segment}
      data-interactive
      aria-label={`${flight.flight_no} 항공편 수정`}
      onClick={onClick}
    >
      {content}
    </UnstyledButton>
  );
}
