"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconAlertCircle,
  IconCrosshair,
  IconMapPin,
  IconPencil,
  IconSearch,
} from "@tabler/icons-react";
import "dayjs/locale/ko";

import type { Lodging, PlaceResult, Trip } from "@/types";
import { diffDays } from "@/lib/date";
import { MEMO_MAX_LENGTH } from "@/constants/trip";
import { NEARBY_SEARCH_RADIUS_KM } from "@/constants/search";
import { usePlaceSearch } from "../../hooks/usePlaceSearch";
import { PanelSubScreen } from "../PanelSubScreen";
import classes from "./LodgingForm.module.css";

export type LodgingFormData = {
  name: string;
  address_text: string | null;
  lat: number;
  lng: number;
  provider: string;
  provider_place_id: string | null;
  check_in: string | null;
  check_out: string | null;
  memo: string | null;
};

type Coords = { lng: number; lat: number };
type StayRange = [string | null, string | null];

type Location = {
  lat: number;
  lng: number;
  provider: string;
  provider_place_id: string | null;
};

type LodgingFormProps = {
  trip: Trip;
  editingLodging: Lodging | null;
  /** 지도에서 위치를 직접 고르는 중인지 */
  pickMode: boolean;
  /** 지도 선택 모드를 켜고 끕니다. 켤 때 넘긴 콜백이 지도를 누른 좌표를 받습니다. */
  onPickModeChange: (
    active: boolean,
    onPick?: (coords: Coords) => void,
  ) => void;
  /** 선택한 위치를 지도에 미리보기 마커로 보여줍니다. */
  onPreview: (place: PlaceResult | null) => void;
  onSave: (data: LodgingFormData) => void;
  onDelete: (() => void) | null;
  onCancel: () => void;
};

export function LodgingForm({
  trip,
  editingLodging,
  pickMode,
  onPickModeChange,
  onPreview,
  onSave,
  onDelete,
  onCancel,
}: LodgingFormProps) {
  const isEdit = !!editingLodging;
  const search = usePlaceSearch({ lat: trip.dest_lat, lng: trip.dest_lng });

  const [initial] = useState(() => ({
    name: editingLodging?.name ?? "",
    address: editingLodging?.address_text ?? "",
    checkIn: editingLodging?.check_in ?? null,
    checkOut: editingLodging?.check_out ?? null,
    memo: editingLodging?.memo ?? "",
    lat: editingLodging?.lat ?? null,
    lng: editingLodging?.lng ?? null,
  }));

  const [location, setLocation] = useState<Location | null>(
    editingLodging
      ? {
          lat: editingLodging.lat,
          lng: editingLodging.lng,
          provider: editingLodging.provider,
          provider_place_id: editingLodging.provider_place_id,
        }
      : null,
  );
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [stay, setStay] = useState<StayRange>([
    initial.checkIn,
    initial.checkOut,
  ]);
  const [memo, setMemo] = useState(initial.memo);
  const [showSearch, setShowSearch] = useState(!isEdit);

  // 선택한 위치를 지도 미리보기에 반영하고, 화면을 떠날 때 미리보기/선택 모드를 정리합니다.
  const emitPreview = useEffectEvent((next: Location | null) => {
    onPreview(
      next
        ? {
            provider: next.provider,
            provider_place_id: next.provider_place_id ?? "lodging-preview",
            name,
            address_text: address || null,
            lat: next.lat,
            lng: next.lng,
          }
        : null,
    );
  });
  const cleanup = useEffectEvent(() => {
    onPickModeChange(false);
    onPreview(null);
  });

  useEffect(() => {
    emitPreview(location);
  }, [location]);

  useEffect(() => () => cleanup(), []);

  function selectResult(place: PlaceResult) {
    setLocation({
      lat: place.lat,
      lng: place.lng,
      provider: place.provider,
      provider_place_id: place.provider_place_id,
    });
    setName(place.name);
    setAddress(place.address_text ?? "");
    setShowSearch(false);
    search.clearResults();
  }

  function handlePicked(coords: Coords) {
    setLocation({
      lat: coords.lat,
      lng: coords.lng,
      provider: "manual",
      provider_place_id: null,
    });
    setName("");
    setAddress("");
    onPickModeChange(false);
  }

  function startPick() {
    setShowSearch(false);
    onPickModeChange(true, handlePicked);
  }

  function clearLocation() {
    setLocation(null);
    setName("");
    setAddress("");
    setShowSearch(true);
  }

  const [checkIn, checkOut] = stay;
  const nameValid = name.trim().length > 0;
  const errors: string[] = [];
  if (!location) errors.push("위치를 먼저 선택해 주세요.");
  else if (!nameValid) errors.push("숙소 이름을 입력해 주세요.");

  const isDirty =
    name.trim() !== initial.name ||
    address.trim() !== initial.address ||
    checkIn !== initial.checkIn ||
    checkOut !== initial.checkOut ||
    memo !== initial.memo ||
    (location?.lat ?? null) !== initial.lat ||
    (location?.lng ?? null) !== initial.lng;

  function handleSave() {
    if (!location || !nameValid) return;
    onSave({
      name: name.trim(),
      address_text: address.trim() || null,
      lat: location.lat,
      lng: location.lng,
      provider: location.provider,
      provider_place_id: location.provider_place_id,
      check_in: checkIn,
      check_out: checkOut,
      memo: memo.trim() || null,
    });
  }

  const showLocationCard = !!location && !showSearch && !pickMode;
  const rateLimited = search.error === "rate";

  return (
    <PanelSubScreen
      title={isEdit ? "숙소 수정" : "숙소 추가"}
      dirty={isDirty}
      saveDisabled={errors.length > 0}
      onBack={onCancel}
      onSave={handleSave}
      onDelete={isEdit && onDelete ? onDelete : undefined}
    >
      <Stack gap="md">
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

        {showLocationCard ? (
          <Paper withBorder radius="md" p="sm">
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <IconMapPin
                size={16}
                className={classes.pin}
                aria-hidden="true"
              />
              <div className={classes.flexible}>
                <Text size="sm" fw={600} truncate>
                  {name || "이름 미입력"}
                </Text>
                {address && (
                  <Text size="xs" c="dimmed" truncate>
                    {address}
                  </Text>
                )}
              </div>
              <Button
                variant="subtle"
                size="compact-xs"
                leftSection={<IconPencil size={12} />}
                onClick={clearLocation}
              >
                변경
              </Button>
            </Group>
          </Paper>
        ) : (
          <Stack gap="xs">
            <Group gap="xs" wrap="nowrap">
              <TextInput
                className={classes.flexible}
                value={search.query}
                disabled={rateLimited}
                placeholder="장소를 검색하세요"
                aria-label="숙소 위치 검색"
                leftSection={<IconSearch size={16} aria-hidden="true" />}
                onChange={(event) =>
                  search.changeQuery(event.currentTarget.value)
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  search.submit();
                }}
              />
              <Button
                disabled={rateLimited || search.query.trim().length < 2}
                onClick={search.submit}
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
                여행지 반경 약 {NEARBY_SEARCH_RADIUS_KM}km
              </Text>
            </Group>

            <UnstyledButton className={classes.pickButton} onClick={startPick}>
              <IconMapPin size={16} aria-hidden="true" />
              지도에서 직접 찍기
            </UnstyledButton>

            {search.loading ? (
              <Stack gap="xs">
                <Skeleton height={64} radius="md" />
                <Skeleton height={64} radius="md" />
              </Stack>
            ) : search.error ? (
              <Group gap="xs" wrap="nowrap" py="sm" role="alert">
                <IconAlertCircle
                  size={20}
                  color="var(--mantine-color-red-6)"
                  aria-hidden="true"
                />
                <Text size="sm" c="dimmed" className={classes.flexible}>
                  {search.error === "rate"
                    ? "오늘 검색 한도를 모두 사용했어요. 내일 다시 시도해 주세요."
                    : search.error === "unavailable"
                      ? "검색 기능이 아직 설정되지 않았어요."
                      : search.error === "network"
                        ? "네트워크에 연결할 수 없어요. 연결을 확인한 뒤 다시 시도해 주세요."
                        : "검색 서비스에 문제가 있어요. 잠시 후 다시 시도해 주세요."}
                </Text>
                {(search.error === "network" ||
                  search.error === "upstream") && (
                  <Button
                    variant="default"
                    size="compact-sm"
                    onClick={search.submit}
                  >
                    다시 시도
                  </Button>
                )}
              </Group>
            ) : search.hasSearched && search.results.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                검색 결과가 없어요
              </Text>
            ) : search.suggestUnavailable &&
              search.query.trim().length >= 2 &&
              search.results.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Enter 키나 검색 버튼을 눌러 검색해 주세요
              </Text>
            ) : (
              search.results.length > 0 && (
                <Stack gap="xs">
                  {search.results.map((place) => (
                    <UnstyledButton
                      key={place.provider_place_id}
                      className={classes.result}
                      onClick={() => selectResult(place)}
                    >
                      <Text size="sm" fw={600} truncate>
                        {place.name}
                      </Text>
                      {place.address_text && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {place.address_text}
                        </Text>
                      )}
                    </UnstyledButton>
                  ))}
                  {search.attribution && (
                    <Text size="xs" c="dimmed">
                      {search.attribution}
                    </Text>
                  )}
                </Stack>
              )
            )}
          </Stack>
        )}

        <TextInput
          label="숙소 이름"
          placeholder="숙소 이름"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <TextInput
          label="주소 (선택)"
          placeholder="주소"
          value={address}
          onChange={(event) => setAddress(event.currentTarget.value)}
        />

        <Stack gap={4}>
          <DatePickerInput
            type="range"
            label="체크인 · 체크아웃"
            locale="ko"
            valueFormat="MM.DD (dd)"
            placeholder="날짜 선택"
            allowSingleDateInRange
            clearable
            minDate={trip.start_date}
            maxDate={trip.end_date}
            defaultDate={checkIn ?? trip.start_date}
            value={stay}
            onChange={setStay}
          />
          {checkIn && checkOut && (
            <Text size="xs" c="dimmed">
              {Math.max(0, diffDays(checkIn, checkOut))}박
            </Text>
          )}
        </Stack>

        <Stack gap={4}>
          <Textarea
            label="메모 (선택)"
            placeholder="메모"
            rows={3}
            value={memo}
            onChange={(event) =>
              setMemo(event.currentTarget.value.slice(0, MEMO_MAX_LENGTH))
            }
          />
          <Text size="xs" c="dimmed" ta="right">
            {memo.length}/{MEMO_MAX_LENGTH}
          </Text>
        </Stack>

        {isDirty && errors.length > 0 && (
          <Stack gap={4} role="alert">
            {errors.map((message) => (
              <Group key={message} gap={6} wrap="nowrap" c="red">
                <IconAlertCircle size={16} aria-hidden="true" />
                <Text size="sm" inherit>
                  {message}
                </Text>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </PanelSubScreen>
  );
}
