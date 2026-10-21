import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBed,
  IconCrosshair,
  IconMapPin,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

import type {
  Lodging,
  MapBounds,
  PlaceResult,
  Stop,
  Trip,
  TripArea,
} from "@/types";
import type { PlaceSearchError } from "@/hooks/usePlaceSearch";
import { areaBounds, areaTitle, isInArea } from "@/lib/areas";
import { formatDayDate } from "@/lib/date";
import { formatDistance } from "@/lib/geo";
import { getDayColor } from "@/lib/dayColor";
import { findLodgingFor } from "@/lib/lodging";
import { NEARBY_SEARCH_RADIUS_KM } from "@/constants/search";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import classes from "./PlaceSearch.module.css";

/** "현 지도에서 검색" 버튼이 지도와 주고받는 정보. */
export type MapSearchControl = {
  /** 지도 위에 버튼을 띄울 층. 아직 없으면 null. */
  overlay: HTMLElement | null;
  /** 검색 뒤 사용자가 지도를 움직였을 때 보이는 범위. 움직이지 않았으면 null. */
  movedBounds: MapBounds | null;
  /** 그 범위로 검색을 시작했으니 버튼을 숨겨도 된다고 알립니다. */
  onConsume: () => void;
};

type PlaceSearchProps = {
  trip: Trip;
  stops: Stop[];
  lodgings: Lodging[];
  /** 일차 탭에서 열었다면 그 일차, "전체" 탭이면 null (직접 고르게 합니다). */
  selectedDay: number | null;
  /** 영역에서 열었다면 그 영역. 처음에 그 영역 안에서만 찾습니다. */
  area?: TripArea | null;
  /** 저장에 성공하면 true, 실패하면 false를 돌려줍니다. (실패 안내는 호출한 쪽이 띄웁니다) */
  onAddPlace: (place: PlaceResult, dayIndex: number) => Promise<boolean>;
  /** 결과에 마우스를 올렸을 때: 지도에 점선 원만 띄웁니다. (지도는 움직이지 않음) */
  onPreview: (place: PlaceResult | null) => void;
  /** 결과를 눌렀을 때: 그 위치로 지도를 옮기고 점선 원을 띄웁니다. */
  onFocusPlace: (place: PlaceResult) => void;
  onViewAdded: () => void;
  /** 지도에서 위치를 고르는 중인지. */
  pickMode: boolean;
  /** 켤 때 넘긴 콜백이 지도 클릭 좌표를 받습니다. */
  onPickModeChange: (
    active: boolean,
    onPick?: (coords: { lng: number; lat: number }) => void,
  ) => void;
  mapSearch: MapSearchControl;
};

/** 숙소를 장소로 추가할 때 쓰는 값으로 바꿉니다. */
function lodgingToPlace(lodging: Lodging): PlaceResult {
  return {
    provider: lodging.provider,
    // 직접 찍어 등록한 숙소는 장소 id가 없어 임시 id를 씁니다. (manual이면 서버가 버립니다)
    provider_place_id: lodging.provider_place_id ?? `lodging-${lodging.id}`,
    name: lodging.name,
    address_text: lodging.address_text,
    lat: lodging.lat,
    lng: lodging.lng,
  };
}

/** 지도에서 직접 찍어 추가한 장소의 기본 이름. 추가한 뒤 별칭으로 바꿀 수 있습니다. */
const PICKED_PLACE_NAME = "지도에서 선택한 위치";

export function PlaceSearch({
  trip,
  stops,
  lodgings,
  selectedDay,
  area = null,
  onAddPlace,
  onPreview,
  onFocusPlace,
  onViewAdded,
  pickMode,
  onPickModeChange,
  mapSearch,
}: PlaceSearchProps) {
  const search = usePlaceSearch(
    { lat: trip.dest_lat, lng: trip.dest_lng },
    area ? areaBounds(area) : null,
  );
  // 검색 업체는 사각형 범위로만 찾아 주니, 원 밖(모서리)의 결과는 걸러냅니다.
  const results =
    area && search.inArea
      ? search.results.filter((place) => isInArea(place, area))
      : search.results;
  const [pickedDay, setPickedDay] = useState(0);
  // 이 화면을 연 뒤로 추가한 개수. 화면이 닫히면 함께 사라집니다.
  const [addedCount, setAddedCount] = useState(0);
  // 저장 중인 장소. 빠르게 두 번 눌러도 한 번만 보내고, 버튼에 진행 상태를 보여줍니다.
  // 같은 장소를 다른 일차에 넣는 건 막지 않도록 일차까지 키에 넣습니다.
  const adding = useRef(new Set<string>());
  const [addingKeys, setAddingKeys] = useState<ReadonlySet<string>>(new Set());

  const targetDay = selectedDay ?? pickedDay;
  const color = getDayColor(targetDay).hex;

  // 지도를 누르는 시점의 일차와 추가 함수를 쓰도록 최신 값을 따로 들고 있습니다.
  const latest = useRef({ targetDay, onAddPlace });
  useEffect(() => {
    latest.current = { targetDay, onAddPlace };
  });

  const cleanup = useEffectEvent(() => onPickModeChange(false));
  useEffect(() => () => cleanup(), []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    search.submit();
  }

  async function handleAdd(place: PlaceResult) {
    const key = `${targetDay}:${place.provider_place_id}`;
    if (adding.current.has(key)) return;
    adding.current.add(key);
    setAddingKeys(new Set(adding.current));
    try {
      // 저장에 실패하면 "추가한 장소" 개수를 올리지 않습니다.
      if (await onAddPlace(place, targetDay)) {
        setAddedCount((count) => count + 1);
      }
    } finally {
      adding.current.delete(key);
      setAddingKeys(new Set(adding.current));
    }
  }

  function handlePicked(coords: { lng: number; lat: number }) {
    const { targetDay: day, onAddPlace: add } = latest.current;
    void add(
      {
        provider: "manual",
        provider_place_id: `manual-${Date.now()}`,
        name: PICKED_PLACE_NAME,
        address_text: null,
        lat: coords.lat,
        lng: coords.lng,
      },
      day,
    ).then((added) => {
      if (added) setAddedCount((count) => count + 1);
    });
    onPickModeChange(false);
  }

  const rateLimited = search.error === "rate";
  // 검색어가 있고, 검색 뒤 지도를 움직였을 때만 "현 지도에서 검색"을 보여줍니다.
  const showViewSearch =
    mapSearch.overlay !== null &&
    mapSearch.movedBounds !== null &&
    search.query.trim().length >= 2 &&
    !rateLimited &&
    !search.loading;

  function handleSearchInView() {
    if (!mapSearch.movedBounds) return;
    search.searchInView(mapSearch.movedBounds);
    mapSearch.onConsume();
  }
  // 자동완성을 쓸 수 없는 서버라면, 입력만으로는 결과가 안 나온다고 미리 알려줍니다.
  const needsSubmit =
    search.suggestUnavailable && search.query.trim().length >= 2;

  return (
    <Stack gap="sm">
      {pickMode && (
        <Alert
          color="teal"
          variant="light"
          icon={<IconCrosshair size={16} />}
          withCloseButton
          closeButtonLabel="위치 선택 취소"
          onClose={() => onPickModeChange(false)}
        >
          지도를 눌러 위치를 선택하세요
        </Alert>
      )}

      {selectedDay === null && (
        <Select
          label="추가할 일차"
          allowDeselect={false}
          value={String(pickedDay)}
          onChange={(value) => value && setPickedDay(Number(value))}
          data={Array.from({ length: trip.num_days }, (_, day) => ({
            value: String(day),
            label: `${day + 1}일차 · ${formatDayDate(trip.start_date, day)}`,
          }))}
        />
      )}

      {lodgings.length > 0 && (
        <Stack gap={6}>
          <Text size="xs" fw={500} c="dimmed">
            숙소에서 바로 추가
          </Text>
          <Group gap="xs">
            {lodgings.map((lodging) => {
              const place = lodgingToPlace(lodging);
              // 숙소는 하루에 여러 번 들를 수 있어서, 이미 있어도 또 추가할 수 있습니다.
              return (
                <Button
                  key={lodging.id}
                  size="compact-sm"
                  variant="default"
                  classNames={{ label: classes.chipLabel }}
                  loading={addingKeys.has(
                    `${targetDay}:${place.provider_place_id}`,
                  )}
                  leftSection={
                    <IconBed size={14} color={color} aria-hidden="true" />
                  }
                  onMouseEnter={() => onPreview(place)}
                  onMouseLeave={() => onPreview(null)}
                  onClick={() => void handleAdd(place)}
                >
                  {lodging.name}
                </Button>
              );
            })}
          </Group>
        </Stack>
      )}

      <Group gap="xs" wrap="nowrap">
        <TextInput
          className={classes.flexible}
          value={search.query}
          onChange={(event) => search.changeQuery(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          disabled={rateLimited}
          placeholder="장소를 검색하세요"
          aria-label="장소 검색"
          leftSection={<IconSearch size={16} aria-hidden="true" />}
        />
        <Button
          onClick={search.submit}
          disabled={rateLimited || search.query.trim().length < 2}
        >
          검색
        </Button>
      </Group>

      <Group gap="xs">
        <Button
          size="compact-xs"
          radius="xl"
          variant={search.nearbyOnly ? "light" : "default"}
          aria-pressed={search.nearbyOnly}
          leftSection={<IconMapPin size={12} aria-hidden="true" />}
          onClick={search.toggleNearby}
        >
          여행지 주변만
        </Button>
        <Text size="xs" c="dimmed">
          {area && search.inArea
            ? `「${areaTitle(area)}」 반경 ${formatDistance(area.radius_m / 1000)} 안에서 검색 중`
            : search.searchScope === "view"
              ? "현재 지도 범위에서 검색 중"
              : `여행지 반경 약 ${NEARBY_SEARCH_RADIUS_KM}km`}
        </Text>
      </Group>

      {!pickMode && (
        <UnstyledButton
          className={classes.pickButton}
          onClick={() => onPickModeChange(true, handlePicked)}
        >
          <IconMapPin size={16} aria-hidden="true" />
          지도에서 직접 찍기
        </UnstyledButton>
      )}

      <Stack gap="xs" aria-live="polite">
        {search.loading ? (
          <>
            <Skeleton height={64} radius="md" />
            <Skeleton height={64} radius="md" />
            <Skeleton height={64} radius="md" />
          </>
        ) : search.error ? (
          <SearchError error={search.error} onRetry={search.submit} />
        ) : search.hasSearched && results.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            검색 결과가 없어요
          </Text>
        ) : results.length > 0 ? (
          <>
            {results.map((place) => {
              // 숙소는 중복해서 넣을 수 있으니 "추가됨"으로 막지 않습니다.
              const existing = findLodgingFor(place, lodgings)
                ? undefined
                : stops.find(
                    (stop) =>
                      stop.provider_place_id !== null &&
                      stop.provider_place_id === place.provider_place_id,
                  );
              const inTargetDay = existing?.day_index === targetDay;
              const isAdding = addingKeys.has(
                `${targetDay}:${place.provider_place_id}`,
              );
              return (
                <Card
                  key={place.provider_place_id}
                  withBorder
                  p="sm"
                  radius="md"
                  className={classes.result}
                  onMouseEnter={() => onPreview(place)}
                  onMouseLeave={() => onPreview(null)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <UnstyledButton
                      className={classes.flexible}
                      onClick={() => onFocusPlace(place)}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={600} truncate>
                          {place.name}
                        </Text>
                        {existing && !inTargetDay && (
                          <Badge variant="light" color="gray" size="xs">
                            {existing.day_index + 1}일차에 포함됨
                          </Badge>
                        )}
                      </Group>
                      {place.address_text && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {place.address_text}
                        </Text>
                      )}
                    </UnstyledButton>
                    <Button
                      size="compact-sm"
                      color={inTargetDay ? "gray" : color}
                      variant={inTargetDay ? "light" : "filled"}
                      disabled={inTargetDay}
                      loading={isAdding}
                      onClick={() => void handleAdd(place)}
                    >
                      {inTargetDay ? "추가됨" : "추가"}
                    </Button>
                  </Group>
                </Card>
              );
            })}
            {search.attribution && (
              <Text size="xs" c="dimmed" pt="xs">
                {search.attribution}
              </Text>
            )}
          </>
        ) : (
          <Box py="xl" ta="center">
            <IconMapPin
              size={32}
              className={classes.hintIcon}
              aria-hidden="true"
            />
            <Text size="sm" c="dimmed">
              {needsSubmit
                ? "Enter 키나 검색 버튼을 눌러 검색해 주세요"
                : "가고 싶은 장소를 검색해 보세요"}
            </Text>
          </Box>
        )}
      </Stack>

      {addedCount > 0 && (
        <Group justify="center" mt="xs">
          <Button
            variant="light"
            radius="xl"
            rightSection={<IconArrowRight size={14} aria-hidden="true" />}
            onClick={onViewAdded}
          >
            추가한 장소 보기 ({addedCount})
          </Button>
        </Group>
      )}

      {showViewSearch &&
        mapSearch.overlay &&
        createPortal(
          <Button
            radius="xl"
            color="teal"
            classNames={{ root: classes.viewSearchButton }}
            leftSection={<IconRefresh size={16} aria-hidden="true" />}
            onClick={handleSearchInView}
          >
            현 지도에서 검색
          </Button>,
          mapSearch.overlay,
        )}
    </Stack>
  );
}

function SearchError({
  error,
  onRetry,
}: {
  error: PlaceSearchError;
  onRetry: () => void;
}) {
  const content: Record<PlaceSearchError, { text: string; retry: boolean }> = {
    rate: {
      text: "오늘 검색 한도를 모두 사용했어요. 내일 다시 시도해 주세요.",
      retry: false,
    },
    unavailable: { text: "검색 기능이 아직 설정되지 않았어요.", retry: false },
    network: {
      text: "네트워크에 연결할 수 없어요. 연결을 확인한 뒤 다시 시도해 주세요.",
      retry: true,
    },
    upstream: {
      text: "검색 서비스에 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      retry: true,
    },
  };
  const { text, retry } = content[error];

  return (
    <Stack align="center" gap="xs" py="xl" role="alert">
      <IconAlertCircle
        size={32}
        color={
          error === "unavailable"
            ? "var(--mantine-color-dimmed)"
            : "var(--mantine-color-red-6)"
        }
        aria-hidden="true"
      />
      <Text size="sm" c="dimmed" ta="center">
        {text}
      </Text>
      {retry && (
        <Button variant="default" size="compact-sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </Stack>
  );
}
