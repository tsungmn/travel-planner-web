import { PlaceResult } from "@/types";
import {
  Paper,
  Stack,
  TextInput,
  ActionIcon,
  Loader,
  Card,
  Group,
  UnstyledButton,
  Button,
  Select,
  Text,
} from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./PlaceSearch.module.css";

export function PlaceSearch({
  query,
  results,
  searching,
  error,
  dayIndex,
  numDays,
  onQuery,
  onPreview,
  onAdd,
}: {
  query: string;
  results: PlaceResult[];
  searching: boolean;
  error: string;
  dayIndex: number;
  numDays: number;
  onQuery: (value: string) => void;
  onPreview: (place: PlaceResult | null) => void;
  onAdd: (place: PlaceResult, dayIndex: number) => void;
}) {
  const [targetDay, setTargetDay] = useState(String(dayIndex));
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <TextInput
          value={query}
          onChange={(event) => onQuery(event.currentTarget.value)}
          placeholder="도시나 장소 검색"
          leftSection={<IconSearch size={17} />}
          rightSection={
            query ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => onQuery("")}
                aria-label="검색어 지우기"
              >
                <IconX size={16} />
              </ActionIcon>
            ) : null
          }
        />
        {searching && <Loader size="xs" />}
        {error && (
          <Text size="xs" c="red">
            {error}
          </Text>
        )}
        {results.map((place) => (
          <Card key={place.provider_place_id} withBorder p="sm" radius="md">
            <Group justify="space-between" wrap="nowrap">
              <UnstyledButton
                className={classes.flexible}
                onClick={() => onPreview(place)}
              >
                <Text fw={600} truncate>
                  {place.name}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {place.address_text}
                </Text>
              </UnstyledButton>
              <Button
                size="compact-sm"
                onClick={() => onAdd(place, Number(targetDay))}
              >
                추가
              </Button>
            </Group>
          </Card>
        ))}
        <Select
          label="추가할 일차"
          value={targetDay}
          onChange={(value) => value && setTargetDay(value)}
          data={Array.from({ length: numDays }, (_, day) => ({
            value: String(day),
            label: `${day + 1}일차`,
          }))}
        />
      </Stack>
    </Paper>
  );
}
