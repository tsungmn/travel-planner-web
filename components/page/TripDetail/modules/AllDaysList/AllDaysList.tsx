import { Trip, Stop } from "@/types";
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
import { getDayColor } from "@/lib/dayColor";

export function AllDaysList({
  trip,
  stops,
  onSelect,
}: {
  trip: Trip;
  stops: Stop[];
  onSelect: (day: number) => void;
}) {
  return (
    <Stack gap="md">
      {Array.from({ length: trip.num_days }, (_, day) => {
        const dayStops = stops
          .filter((stop) => stop.day_index === day)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <Box key={day}>
            <UnstyledButton
              className={classes.dayHeading}
              onClick={() => onSelect(day)}
            >
              <Box
                className={classes.dayDot}
                style={{ background: getDayColor(day).hex }}
              />
              <Text fw={600}>{day + 1}일차</Text>
              <Text size="sm" c="dimmed">
                · {formatDayDate(trip.start_date, day)} · {dayStops.length}곳
              </Text>
            </UnstyledButton>
            {dayStops.length ? (
              <Stack gap="xs">
                {dayStops.map((stop, index) => (
                  <StopPreview
                    key={stop.id}
                    stop={stop}
                    index={index}
                    color={getDayColor(day).hex}
                  />
                ))}
              </Stack>
            ) : (
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed" ta="center">
                  아직 장소가 없어요.
                </Text>
              </Paper>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

function StopPreview({
  stop,
  index,
  color,
}: {
  stop: Stop;
  index: number;
  color: string;
}) {
  return (
    <Card withBorder p="sm" radius="md">
      <Group wrap="nowrap">
        <ThemeIcon
          size="sm"
          radius="xl"
          color="teal"
          style={{ background: color }}
        >
          <Text size="xs" c="white" fw={700}>
            {index + 1}
          </Text>
        </ThemeIcon>
        <Box className={classes.flexible}>
          <Text size="sm" fw={600} truncate>
            {stop.name}
          </Text>
          {stop.address_text && (
            <Text size="xs" c="dimmed" truncate>
              {stop.address_text}
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  );
}
