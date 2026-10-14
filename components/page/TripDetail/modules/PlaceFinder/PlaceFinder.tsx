import { useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ActionIcon,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconArrowsMaximize,
  IconMapPin,
  IconPin,
  IconPinFilled,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

import type { PlaceResult } from "@/types";
import { NEARBY_SEARCH_RADIUS_KM } from "@/constants/search";
import type { PlaceSearchError } from "../../hooks/usePlaceSearch";
import classes from "./PlaceFinder.module.css";

/** 지도에 마커로 보여 주는 결과 개수. 목록의 번호와 마커의 번호가 같습니다. */
export const FINDER_MAX_RESULTS = 8;
/** 고정해 둘 수 있는 장소 개수. */
export const FINDER_MAX_PINNED = 10;

const ERROR_TEXT: Record<PlaceSearchError, string> = {
  rate: "오늘 검색 한도를 모두 사용했어요. 내일 다시 시도해 주세요.",
  unavailable: "검색 기능이 아직 설정되지 않았어요.",
  network: "네트워크에 연결할 수 없어요. 연결을 확인해 주세요.",
  upstream: "검색 서비스에 문제가 있어요. 잠시 후 다시 시도해 주세요.",
};

type PlaceFinderProps = {
  query: string;
  /** 지도에 마커로 보이는 결과 (최대 `FINDER_MAX_RESULTS`개) */
  places: PlaceResult[];
  loading: boolean;
  error: PlaceSearchError | null;
  hasSearched: boolean;
  nearbyOnly: boolean;
  /** 자동완성을 쓸 수 없어 Enter로만 검색되는 서버인지 */
  needsSubmit: boolean;
  /** 결과에서 골라 고정해 둔 장소. 새로 검색해도 지도에 남습니다. */
  pinned: PlaceResult[];
  activeId: string | null;
  /** 영역을 만들면 마커를 자동으로 지울지 */
  autoClear: boolean;
  /** 모바일처럼 좁은 화면: 결과를 고르면 목록을 접어 지도를 보여 줍니다. */
  compact: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onToggleNearby: () => void;
  onSelect: (place: PlaceResult) => void;
  /** 고정 / 고정 해제 */
  onTogglePin: (place: PlaceResult) => void;
  /** 고정한 장소가 모두 보이도록 지도를 맞춥니다. */
  onFitPinned: () => void;
  onClearPinned: () => void;
  onAutoClearChange: (value: boolean) => void;
  /** 검색어와 검색 결과 마커를 지웁니다. (고정한 장소는 남깁니다) */
  onClear: () => void;
};

/**
 * 러프 모드의 「장소 찾기」: 영역을 그릴 때 지도에서 어디인지 모르는 동네를 찾아 보는 도구.
 * 저장하지 않고 장소 추가와도 이어지지 않습니다. 결과를 누르면 지도를 그 위치로 옮기고 표시만 합니다.
 */
export function PlaceFinder({
  query,
  places,
  loading,
  error,
  hasSearched,
  nearbyOnly,
  needsSubmit,
  pinned,
  activeId,
  autoClear,
  compact,
  onQueryChange,
  onSubmit,
  onToggleNearby,
  onSelect,
  onTogglePin,
  onFitPinned,
  onClearPinned,
  onAutoClearChange,
  onClear,
}: PlaceFinderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const trimmed = query.trim();
  const rateLimited = error === "rate";
  const hasMarkers = places.length > 0;
  const clearable = query.length > 0 || hasMarkers;
  const showCard = !collapsed && (trimmed.length >= 2 || hasMarkers);
  const hasPins = pinned.length > 0;
  const pinnedIds = new Set(pinned.map((place) => place.provider_place_id));
  const pinFull = pinned.length >= FINDER_MAX_PINNED;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      setCollapsed(false);
      onSubmit();
    } else if (event.key === "Escape" && clearable) {
      event.preventDefault();
      onClear();
    }
  }

  function handleChange(value: string) {
    setCollapsed(false);
    onQueryChange(value);
  }

  function handleSelect(place: PlaceResult) {
    onSelect(place);
    if (compact) setCollapsed(true);
  }

  return (
    <Paper className={classes.root} shadow="md" radius="md" withBorder>
      <TextInput
        value={query}
        onChange={(event) => handleChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={rateLimited}
        placeholder="지도에서 찾을 장소 (예: 하라주쿠)"
        aria-label="장소 찾기"
        variant="unstyled"
        classNames={{ input: classes.input }}
        leftSection={<IconSearch size={16} aria-hidden="true" />}
        rightSectionWidth={hasMarkers ? 64 : 34}
        rightSection={
          loading ? (
            <Loader size={14} />
          ) : (
            <Group gap={2} wrap="nowrap">
              {hasMarkers && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={collapsed ? "결과 목록 펼치기" : "결과 목록 접기"}
                  aria-expanded={!collapsed}
                  onClick={() => setCollapsed((value) => !value)}
                >
                  {collapsed ? (
                    <IconChevronDown size={16} />
                  ) : (
                    <IconChevronUp size={16} />
                  )}
                </ActionIcon>
              )}
              {clearable && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="검색 지우기"
                  onClick={onClear}
                >
                  <IconX size={16} />
                </ActionIcon>
              )}
            </Group>
          )
        }
      />

      {showCard && (
        <div className={classes.card}>
          <Group gap="xs" className={classes.scope}>
            <Button
              size="compact-xs"
              radius="xl"
              variant={nearbyOnly ? "light" : "default"}
              aria-pressed={nearbyOnly}
              leftSection={<IconMapPin size={12} aria-hidden="true" />}
              onClick={onToggleNearby}
            >
              여행지 주변만
            </Button>
            <Text size="xs" c="dimmed">
              {nearbyOnly
                ? `여행지 반경 약 ${NEARBY_SEARCH_RADIUS_KM}km`
                : "제한 없음"}
            </Text>
          </Group>

          <ScrollArea.Autosize mah="min(40dvh, 18rem)" aria-live="polite">
            {error ? (
              <Group gap="xs" className={classes.message} role="alert">
                <IconAlertCircle size={16} aria-hidden="true" />
                <Text size="sm" c="dimmed">
                  {ERROR_TEXT[error]}
                </Text>
              </Group>
            ) : hasMarkers ? (
              <ol className={classes.list}>
                {places.map((place, index) => (
                  <li
                    key={place.provider_place_id}
                    className={classes.row}
                    data-active={
                      place.provider_place_id === activeId || undefined
                    }
                  >
                    <UnstyledButton
                      className={classes.item}
                      onClick={() => handleSelect(place)}
                    >
                      <span className={classes.number} aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className={classes.text}>
                        <Text size="sm" fw={600} truncate>
                          {place.name}
                        </Text>
                        {place.address_text && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {place.address_text}
                          </Text>
                        )}
                      </span>
                    </UnstyledButton>
                    <ActionIcon
                      className={classes.pinButton}
                      variant={
                        pinnedIds.has(place.provider_place_id)
                          ? "light"
                          : "subtle"
                      }
                      color={
                        pinnedIds.has(place.provider_place_id)
                          ? "indigo"
                          : "gray"
                      }
                      aria-pressed={pinnedIds.has(place.provider_place_id)}
                      aria-label={
                        pinnedIds.has(place.provider_place_id)
                          ? `${place.name} 고정 해제`
                          : `${place.name} 고정`
                      }
                      disabled={
                        pinFull && !pinnedIds.has(place.provider_place_id)
                      }
                      title={
                        pinFull && !pinnedIds.has(place.provider_place_id)
                          ? `고정은 최대 ${FINDER_MAX_PINNED}개까지 할 수 있어요`
                          : undefined
                      }
                      onClick={() => onTogglePin(place)}
                    >
                      {pinnedIds.has(place.provider_place_id) ? (
                        <IconPinFilled size={16} />
                      ) : (
                        <IconPin size={16} />
                      )}
                    </ActionIcon>
                  </li>
                ))}
              </ol>
            ) : loading ? null : hasSearched ? (
              <Text size="sm" c="dimmed" className={classes.message}>
                검색 결과가 없어요
              </Text>
            ) : needsSubmit ? (
              <Text size="sm" c="dimmed" className={classes.message}>
                Enter 키를 눌러 검색해 주세요
              </Text>
            ) : null}
          </ScrollArea.Autosize>
        </div>
      )}

      {hasPins && (
        <div className={classes.pinsSection}>
          <div className={classes.pinsHeader}>
            <span className={classes.pinsCount}>
              고정한 장소 {pinned.length}
            </span>
            <Group gap={4} className={classes.pinActions}>
              {pinned.length >= 2 && (
                <Button
                  size="compact-xs"
                  variant="light"
                  leftSection={
                    <IconArrowsMaximize size={12} aria-hidden="true" />
                  }
                  onClick={onFitPinned}
                >
                  모두 보기
                </Button>
              )}
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                onClick={onClearPinned}
              >
                모두 지우기
              </Button>
            </Group>
          </div>
          <div className={classes.pins}>
            {pinned.map((place) => (
              <span
                key={place.provider_place_id}
                className={classes.chip}
                data-active={place.provider_place_id === activeId || undefined}
              >
                <IconPinFilled
                  size={10}
                  className={classes.chipIcon}
                  aria-hidden="true"
                />
                <UnstyledButton
                  className={classes.chipName}
                  onClick={() => handleSelect(place)}
                >
                  {place.name}
                </UnstyledButton>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  aria-label={`${place.name} 고정 해제`}
                  onClick={() => onTogglePin(place)}
                >
                  <IconX size={12} />
                </ActionIcon>
              </span>
            ))}
          </div>
        </div>
      )}

      {(showCard || hasPins) && (
        <div className={classes.switchRow}>
          <Switch
            size="xs"
            label="영역을 만들면 찾기 마커 자동 삭제"
            checked={autoClear}
            onChange={(event) => onAutoClearChange(event.currentTarget.checked)}
          />
        </div>
      )}
    </Paper>
  );
}
