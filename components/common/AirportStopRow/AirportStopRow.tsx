import { Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconPlaneArrival, IconPlaneDeparture } from "@tabler/icons-react";

import type { FlightStop } from "@/lib/flightStops";
import { getDayColor } from "@/lib/dayColor";
import classes from "./AirportStopRow.module.css";

type AirportStopRowProps = {
  stop: FlightStop;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
};

/**
 * 항공편에서 만든 공항 항목. 장소가 아니라서 번호가 없고, 옮기거나 지울 수 없습니다.
 * 눌러서 할 일은 화면마다 다릅니다. (지도 이동 / 그 일차 열기)
 */
export function AirportStopRow({
  stop,
  hovered,
  onHover,
  onClick,
}: AirportStopRowProps) {
  const Icon = stop.role === "dep" ? IconPlaneDeparture : IconPlaneArrival;
  const roleLabel = stop.role === "dep" ? "출발" : "도착";

  return (
    <Card
      component="button"
      type="button"
      withBorder
      radius="md"
      p="sm"
      className={classes.card}
      data-hovered={hovered || undefined}
      aria-label={`${stop.name} ${roleLabel}`}
      onClick={onClick}
      onMouseEnter={() => onHover(stop.markerId)}
      onMouseLeave={() => onHover(null)}
    >
      <Group wrap="nowrap">
        <ThemeIcon
          size="sm"
          radius="xl"
          style={{ background: getDayColor(stop.dayIndex).hex }}
        >
          <Icon size={12} stroke={2.5} aria-hidden="true" />
        </ThemeIcon>
        <div className={classes.flexible}>
          <Text size="sm" fw={600} truncate>
            {stop.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {stop.iata} · {stop.flightNo} {roleLabel}
          </Text>
        </div>
      </Group>
    </Card>
  );
}

type AirportStopGroupProps = {
  stops: FlightStop[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (stop: FlightStop) => void;
};

/** 한 일차의 앞(또는 뒤)에 붙는 공항 항목들. 없으면 아무것도 그리지 않습니다. */
export function AirportStopGroup({
  stops,
  hoveredId,
  onHover,
  onSelect,
}: AirportStopGroupProps) {
  if (stops.length === 0) return null;
  return (
    <Stack gap={6}>
      {stops.map((stop) => (
        <AirportStopRow
          key={stop.key}
          stop={stop}
          hovered={hoveredId === stop.markerId}
          onHover={onHover}
          onClick={() => onSelect(stop)}
        />
      ))}
    </Stack>
  );
}
