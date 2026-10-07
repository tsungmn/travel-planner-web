import { Trip, Stop } from "@/types";
import { move } from "@dnd-kit/helpers";
import { DragEndEvent, DragDropProvider } from "@dnd-kit/react";
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
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import classes from "./DayStopList.module.css";
import { useSortable } from "@dnd-kit/react/sortable";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";

export function DayStopList({
  trip,
  stops,
  dayIndex,
  expandedStopId,
  onToggle,
  onMemo,
  onMove,
  onReorder,
  onDelete,
}: {
  trip: Trip;
  stops: Stop[];
  dayIndex: number;
  expandedStopId: string | null;
  onToggle: (id: string) => void;
  onMemo: (id: string, memo: string) => void;
  onMove: (id: string, day: number) => void;
  onReorder: (stops: Stop[]) => void;
  onDelete: (id: string) => void;
}) {
  const onDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const reordered = move(stops, event);
    if (reordered.every((stop, index) => stop.id === stops[index].id)) return;
    onReorder(reordered);
  };
  if (!stops.length)
    return (
      <Paper withBorder p="lg" radius="md">
        <Text size="sm" c="dimmed" ta="center">
          아직 장소가 없어요. 장소를 추가해 보세요.
        </Text>
      </Paper>
    );
  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      <Stack gap="xs">
        {stops.map((stop, index) => (
          <SortableStop
            key={stop.id}
            trip={trip}
            stop={stop}
            index={index}
            dayIndex={dayIndex}
            expanded={expandedStopId === stop.id}
            onToggle={() => onToggle(stop.id)}
            onMemo={(memo) => onMemo(stop.id, memo)}
            onMove={(day) => onMove(stop.id, day)}
            onDelete={() => onDelete(stop.id)}
          />
        ))}
      </Stack>
    </DragDropProvider>
  );
}

function SortableStop({
  trip,
  stop,
  index,
  dayIndex,
  expanded,
  onToggle,
  onMemo,
  onMove,
  onDelete,
}: {
  trip: Trip;
  stop: Stop;
  index: number;
  dayIndex: number;
  expanded: boolean;
  onToggle: () => void;
  onMemo: (memo: string) => void;
  onMove: (day: number) => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: stop.id, index });
  return (
    <Card
      ref={ref}
      style={{ opacity: isDragging ? 0.55 : 1 }}
      withBorder
      radius="md"
      p="sm"
      className={classes.stopCard}
    >
      <Group align="flex-start" wrap="nowrap">
        <ActionIcon
          ref={handleRef}
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="순서 변경"
        >
          <IconGripVertical size={18} />
        </ActionIcon>
        <ThemeIcon size="sm" radius="xl" color="teal">
          <Text size="xs" fw={700}>
            {index + 1}
          </Text>
        </ThemeIcon>
        <UnstyledButton className={classes.flexible} onClick={onToggle}>
          <Text fw={600} ta="left" truncate>
            {stop.name}
          </Text>
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
          <Textarea
            label="메모"
            value={stop.memo ?? ""}
            onChange={(event) =>
              onMemo(event.currentTarget.value.slice(0, 1000))
            }
            maxLength={1000}
            autosize
            minRows={3}
          />
          <Group justify="space-between">
            <Select
              size="xs"
              value={String(dayIndex)}
              onChange={(value) => value && onMove(Number(value))}
              data={Array.from({ length: trip.num_days }, (_, day) => ({
                value: String(day),
                label: `${day + 1}일차`,
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
  );
}
