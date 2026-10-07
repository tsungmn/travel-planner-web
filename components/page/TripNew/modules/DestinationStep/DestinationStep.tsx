import dynamic from "next/dynamic";
import {
  ActionIcon,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { Marker } from "react-map-gl/maplibre";
import { IconCheck, IconMapPin, IconSearch, IconX } from "@tabler/icons-react";

import type { PlaceResult } from "@/types";
import type { SearchStatus } from "../../hooks/useDestinationSearch";
import classes from "./DestinationStep.module.css";

const MapContainer = dynamic(() => import("@/components/common/MapContainer"), {
  ssr: false,
  loading: () => (
    <Center h="100%" role="status" aria-label="지도를 불러오는 중">
      <Loader size="sm" />
    </Center>
  ),
});

const STATUS_MESSAGES = {
  empty: {
    text: "검색 결과가 없어요. 다른 이름으로 검색해 보세요.",
    color: "dimmed",
  },
  "rate-limit": {
    text: "오늘 검색 한도를 모두 사용했어요. 내일 다시 시도해 주세요.",
    color: "red",
  },
  error: {
    text: "검색에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
    color: "red",
  },
} as const;

type DestinationStepProps = {
  query: string;
  results: PlaceResult[];
  attribution: string;
  status: SearchStatus;
  selected: PlaceResult | null;
  onQueryChange: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
};

export function DestinationStep({
  query,
  results,
  attribution,
  status,
  selected,
  onQueryChange,
  onSelect,
}: DestinationStepProps) {
  const message =
    status === "empty" || status === "rate-limit" || status === "error"
      ? STATUS_MESSAGES[status]
      : null;

  return (
    <Stack gap="md">
      <TextInput
        id="destination-search"
        label="어디로 떠나시나요?"
        description="도시나 장소를 검색해 보세요."
        placeholder="예: 칭다오, 오사카, 제주"
        autoComplete="off"
        size="md"
        radius="md"
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        leftSection={<IconSearch size={20} />}
        rightSectionWidth={48}
        rightSection={
          query ? (
            <ActionIcon
              type="button"
              variant="subtle"
              color="gray"
              size={44}
              onClick={() => onQueryChange("")}
              aria-label="검색어 지우기"
            >
              <IconX size={20} />
            </ActionIcon>
          ) : null
        }
      />

      <Box aria-live="polite" aria-atomic="true">
        {status === "loading" && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">
              검색 중...
            </Text>
          </Group>
        )}
        {message && (
          <Text size="sm" c={message.color}>
            {message.text}
          </Text>
        )}
      </Box>

      {status === "success" && !selected && (
        <Stack
          component="ul"
          gap="xs"
          className={classes.results}
          aria-label="여행지 검색 결과"
        >
          {results.map((place) => (
            <Box component="li" key={place.provider_place_id}>
              <UnstyledButton
                type="button"
                className={classes.result}
                onClick={() => onSelect(place)}
              >
                <Group align="flex-start" wrap="nowrap" gap="sm">
                  <IconMapPin
                    size={20}
                    className={classes.placeIcon}
                    aria-hidden="true"
                  />
                  <Box className={classes.flexible}>
                    <Text fw={500} truncate>
                      {place.name}
                    </Text>
                    {place.address_text && (
                      <Text size="sm" c="dimmed" truncate>
                        {place.address_text}
                      </Text>
                    )}
                  </Box>
                </Group>
              </UnstyledButton>
            </Box>
          ))}
        </Stack>
      )}

      {selected && (
        <Stack gap="sm">
          <Paper withBorder radius="md" p="sm" className={classes.selection}>
            <Group wrap="nowrap" gap="sm">
              <ThemeIcon size={40} radius="xl" color="teal">
                <IconCheck size={20} />
              </ThemeIcon>
              <Box className={classes.flexible}>
                <Text fw={600} truncate>
                  {selected.name}
                </Text>
                {selected.address_text && (
                  <Text size="sm" c="dimmed" truncate>
                    {selected.address_text}
                  </Text>
                )}
              </Box>
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                size={44}
                onClick={() => onQueryChange("")}
                aria-label="선택 취소"
              >
                <IconX size={20} />
              </ActionIcon>
            </Group>
          </Paper>
          <Paper withBorder radius="md" className={classes.mapFrame}>
            <MapContainer
              className={classes.map}
              initialViewState={{
                longitude: selected.lng,
                latitude: selected.lat,
                zoom: 11,
              }}
              mapProps={{ attributionControl: false }}
            >
              <Marker
                longitude={selected.lng}
                latitude={selected.lat}
                anchor="bottom"
              >
                <IconMapPin
                  size={30}
                  fill="var(--mantine-color-teal-6)"
                  color="white"
                  stroke={1.5}
                  aria-label={selected.name}
                />
              </Marker>
            </MapContainer>
          </Paper>
        </Stack>
      )}

      {attribution && (
        <Text size="xs" c="dimmed">
          {attribution}
        </Text>
      )}
    </Stack>
  );
}
