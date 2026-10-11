import { useRef, useState } from "react";
import { Lodging, Trip, Stop } from "@/types";
import { move } from "@dnd-kit/helpers";
import { DragEndEvent, DragOverEvent, DragDropProvider } from "@dnd-kit/react";
import {
  ActionIcon,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import classes from "./DayStopList.module.css";
import { useSortable } from "@dnd-kit/react/sortable";
import { IconGripVertical, IconHome, IconTrash } from "@tabler/icons-react";
import { getDayColor } from "@/lib/dayColor";
import { numberStops } from "@/lib/lodging";
import { ALIAS_MAX_LENGTH, MEMO_MAX_LENGTH } from "@/constants/trip";
import { type DayFlightStops, type FlightStop } from "@/lib/flightStops";
import { AirportStopGroup } from "../AirportStopRow";
import { DistanceSeparator } from "../DistanceSeparator";

export function DayStopList({
  trip,
  stops,
  lodgings,
  flightStops,
  dayIndex,
  expandedStopId,
  hoveredStopId,
  highlightedStopId,
  onToggle,
  onHover,
  onFocusFlightStop,
  onMemo,
  onAlias,
  onMove,
  onReorder,
  onDelete,
}: {
  trip: Trip;
  stops: Stop[];
  /** 숙소에서 만든 장소는 번호 대신 집 아이콘으로 보여줍니다. */
  lodgings: Lodging[];
  /** 항공편에서 만든 공항. 출국편은 맨 위, 귀국편은 맨 아래에 붙고 번호·드래그 대상이 아닙니다. */
  flightStops: DayFlightStops;
  dayIndex: number;
  expandedStopId: string | null;
  hoveredStopId: string | null;
  /** 방금 추가한 장소. 잠깐 강조합니다. */
  highlightedStopId: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onFocusFlightStop: (stop: FlightStop) => void;
  onMemo: (id: string, memo: string) => void;
  onAlias: (id: string, alias: string) => void;
  onMove: (id: string, day: number) => void;
  onReorder: (stops: Stop[]) => void;
  onDelete: (id: string) => void;
}) {
  // 드래그하는 동안의 순서. 드래그 중이 아니면 null이고 stops를 그대로 씁니다.
  const [liveStops, setLiveStops] = useState<Stop[] | null>(null);
  const liveRef = useRef<Stop[] | null>(null);
  const items = liveStops ?? stops;

  const onDragOver = (event: DragOverEvent) => {
    const next = move(liveRef.current ?? stops, event);
    liveRef.current = next;
    setLiveStops(next);
  };
  const onDragEnd = (event: DragEndEvent) => {
    const reordered = liveRef.current;
    liveRef.current = null;
    setLiveStops(null);
    if (event.canceled || !reordered) return;
    if (reordered.every((stop, index) => stop.id === stops[index].id)) return;
    onReorder(reordered);
  };
  const numbers = numberStops(items, lodgings);

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
        <DragDropProvider onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <Stack gap={0}>
            {items.map((stop, index) => (
              <SortableStop
                key={stop.id}
                trip={trip}
                stop={stop}
                previous={index > 0 ? items[index - 1] : null}
                index={index}
                number={numbers[index]}
                dayIndex={dayIndex}
                expanded={expandedStopId === stop.id}
                hovered={hoveredStopId === stop.id}
                highlighted={highlightedStopId === stop.id}
                onToggle={() => onToggle(stop.id)}
                onHover={onHover}
                onMemo={(memo) => onMemo(stop.id, memo)}
                onAlias={(alias) => onAlias(stop.id, alias)}
                onMove={(day) => onMove(stop.id, day)}
                onDelete={() => onDelete(stop.id)}
              />
            ))}
          </Stack>
        </DragDropProvider>
      ) : (
        <Paper withBorder p="lg" radius="md">
          <Text size="sm" c="dimmed" ta="center">
            아직 장소가 없어요. 장소를 추가해 보세요.
          </Text>
        </Paper>
      )}
      {airportGroup(flightStops.end)}
    </Stack>
  );
}

function SortableStop({
  trip,
  stop,
  previous,
  index,
  number,
  dayIndex,
  expanded,
  hovered,
  highlighted,
  onToggle,
  onHover,
  onMemo,
  onAlias,
  onMove,
  onDelete,
}: {
  trip: Trip;
  stop: Stop;
  previous: Stop | null;
  /** 목록 안 위치. (드래그 정렬용) */
  index: number;
  /** 화면에 보이는 번호. 숙소는 null입니다. */
  number: number | null;
  dayIndex: number;
  expanded: boolean;
  hovered: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  onMemo: (memo: string) => void;
  onAlias: (alias: string) => void;
  onMove: (day: number) => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: stop.id, index });
  const memo = stop.memo ?? "";

  return (
    <div ref={ref}>
      {previous && (
        <div style={{ visibility: isDragging ? "hidden" : undefined }}>
          <DistanceSeparator from={previous} to={stop} />
        </div>
      )}
      <Card
        style={{ opacity: isDragging ? 0.55 : 1 }}
        withBorder
        radius="md"
        p="sm"
        className={classes.stopCard}
        data-stop-id={stop.id}
        data-hovered={hovered || undefined}
        data-expanded={expanded || undefined}
        data-highlighted={highlighted || undefined}
        onMouseEnter={() => onHover(stop.id)}
        onMouseLeave={() => onHover(null)}
      >
        <Group align="flex-start" wrap="nowrap">
          <ActionIcon
            ref={handleRef}
            variant="subtle"
            color="gray"
            size="sm"
            aria-label="순서 변경"
            className={classes.handle}
          >
            <IconGripVertical size={18} />
          </ActionIcon>
          <ThemeIcon
            size="sm"
            radius="xl"
            style={{ background: getDayColor(stop.day_index).hex }}
          >
            {number === null ? (
              <IconHome size={12} stroke={2.5} role="img" aria-label="숙소" />
            ) : (
              <Text size="xs" fw={700}>
                {number}
              </Text>
            )}
          </ThemeIcon>
          <UnstyledButton
            className={classes.flexible}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <Text fw={600} ta="left" truncate>
              {stop.alias ?? stop.name}
            </Text>
            {stop.alias && (
              <Text size="xs" c="dimmed" ta="left" truncate>
                {stop.name}
              </Text>
            )}
            {stop.address_text && (
              <Text size="sm" c="dimmed" ta="left" truncate>
                {stop.address_text}
              </Text>
            )}
            {stop.memo && !expanded && (
              <Text size="xs" c="dimmed" ta="left" truncate>
                {stop.memo}
              </Text>
            )}
          </UnstyledButton>
        </Group>
        <Collapse expanded={expanded}>
          <Divider my="sm" />
          <Stack gap="xs">
            <TextInput
              label="별칭 (선택)"
              description="별칭을 설정하면 원래 이름은 아래에 작게 표시돼요."
              placeholder="원하는 이름으로 표시할 수 있어요"
              value={stop.alias ?? ""}
              onChange={(event) =>
                onAlias(event.currentTarget.value.slice(0, ALIAS_MAX_LENGTH))
              }
              maxLength={ALIAS_MAX_LENGTH}
            />
            <Textarea
              label="메모"
              placeholder="이 장소에 대한 메모를 남겨보세요."
              value={memo}
              onChange={(event) =>
                onMemo(event.currentTarget.value.slice(0, MEMO_MAX_LENGTH))
              }
              maxLength={MEMO_MAX_LENGTH}
              autosize
              minRows={3}
            />
            <Text size="xs" c="dimmed" ta="right">
              {memo.length}/{MEMO_MAX_LENGTH}
            </Text>
            <Group justify="space-between" align="flex-end" wrap="nowrap">
              <Select
                size="xs"
                label="다른 일차로 이동"
                allowDeselect={false}
                value={String(dayIndex)}
                onChange={(value) => value && onMove(Number(value))}
                data={Array.from({ length: trip.num_days }, (_, day) => ({
                  value: String(day),
                  label: `${day + 1}일차`,
                  disabled: day === dayIndex,
                }))}
              />
              <Button
                size="compact-sm"
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={15} />}
                onClick={onDelete}
              >
                삭제
              </Button>
            </Group>
          </Stack>
        </Collapse>
      </Card>
    </div>
  );
}
