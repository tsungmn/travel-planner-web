import { useEffect, useRef } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCirclePlus,
  IconMapPinPlus,
  IconX,
} from "@tabler/icons-react";

import type { Stop, Trip, TripArea } from "@/types";
import { AREA_SPREAD_WARN_KM, MAX_AREAS_PER_TRIP } from "@/constants/area";
import {
  areaColor,
  areaTitle,
  daySpreadKm,
  overlapsOtherDay,
  stopsInArea,
  stopsOfOtherDays,
} from "@/lib/areas";
import { formatDayDate } from "@/lib/date";
import { formatDistance } from "@/lib/geo";
import { AreaEditor, type AreaPatch } from "./AreaEditor";
import classes from "./AreaSection.module.css";

type AreaSectionProps = {
  trip: Trip;
  areas: TripArea[];
  stops: Stop[];
  /** 일차 탭. null이면 전체 */
  selectedDay: number | null;
  selectedAreaId: string | null;
  /** 방금 만든 영역. 라벨 입력에 바로 포커스를 줍니다. */
  newAreaId: string | null;
  addMode: boolean;
  onSelect: (id: string | null) => void;
  onToggleAdd: () => void;
  onChange: (id: string, patch: AreaPatch) => void;
  onDelete: (id: string) => void;
  onSearchInArea: (area: TripArea) => void;
};

type Group = {
  key: string;
  dayIndex: number | null;
  title: string;
  areas: TripArea[];
};

export function AreaSection({
  trip,
  areas,
  stops,
  selectedDay,
  selectedAreaId,
  newAreaId,
  addMode,
  onSelect,
  onToggleAdd,
  onChange,
  onDelete,
  onSearchInArea,
}: AreaSectionProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 지도에서 영역을 눌러 선택하면 목록에서도 그 카드가 보이도록 스크롤합니다.
  useEffect(() => {
    if (!selectedAreaId) return;
    listRef.current
      ?.querySelector(`[data-area-id="${selectedAreaId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedAreaId]);

  // 일차 탭을 고르면 그 일차와 미지정 영역만 보여줍니다. (다른 일차는 지도에서 흐리게 남아 있어요)
  const visible = areas.filter(
    (area) =>
      selectedDay === null ||
      area.day_index === selectedDay ||
      area.day_index === null,
  );
  const groups: Group[] = [];
  for (let day = 0; day < trip.num_days; day++) {
    const dayAreas = visible.filter((area) => area.day_index === day);
    if (dayAreas.length > 0) {
      groups.push({
        key: `day-${day}`,
        dayIndex: day,
        title: `${day + 1}일차 · ${formatDayDate(trip.start_date, day)}`,
        areas: dayAreas,
      });
    }
  }
  const unassigned = visible.filter((area) => area.day_index === null);
  if (unassigned.length > 0) {
    groups.push({
      key: "unassigned",
      dayIndex: null,
      title: "일차 미지정",
      areas: unassigned,
    });
  }

  const full = areas.length >= MAX_AREAS_PER_TRIP;

  return (
    <Stack gap="md">
      {addMode ? (
        <Button
          variant="light"
          color="gray"
          leftSection={<IconX size={16} />}
          onClick={onToggleAdd}
        >
          영역 그리기 취소
        </Button>
      ) : (
        <Button
          variant="default"
          leftSection={<IconCirclePlus size={16} />}
          disabled={full}
          onClick={onToggleAdd}
        >
          영역 추가
        </Button>
      )}
      {addMode && (
        <Text size="sm" c="dimmed">
          지도에서 중심점을 누른 뒤, 반경이 될 지점을 한 번 더 눌러 주세요.
        </Text>
      )}

      {areas.length === 0 ? (
        <Box className={classes.empty}>
          <IconMapPinPlus size={32} color="var(--mantine-color-gray-4)" />
          <Text fw={600} mt="xs">
            아직 영역이 없어요
          </Text>
          <Text size="sm" c="dimmed">
            「영역 추가」를 누르고 일차별로 돌아다닐 동네를
            <br />
            원으로 표시해 보세요
          </Text>
        </Box>
      ) : (
        <Stack gap="md" ref={listRef}>
          {groups.map((group) => {
            const spread =
              group.dayIndex === null ? 0 : daySpreadKm(group.areas);
            return (
              <Box key={group.key}>
                <Group gap="xs" className={classes.dayHeading}>
                  <Box
                    className={classes.dayDot}
                    style={{ background: areaColor(group.dayIndex) }}
                  />
                  <Text fw={600} className={classes.flexible}>
                    {group.title}
                  </Text>
                  {spread > 0 && (
                    <Badge
                      variant="light"
                      color={spread > AREA_SPREAD_WARN_KM ? "orange" : "gray"}
                      leftSection={
                        spread > AREA_SPREAD_WARN_KM ? (
                          <IconAlertTriangle size={12} aria-hidden="true" />
                        ) : undefined
                      }
                    >
                      이동 폭 {formatDistance(spread)}
                    </Badge>
                  )}
                </Group>
                <Stack gap="xs">
                  {group.areas.map((area) => (
                    <AreaItem
                      key={area.id}
                      area={area}
                      areas={areas}
                      stops={stops}
                      numDays={trip.num_days}
                      startDate={trip.start_date}
                      selected={area.id === selectedAreaId}
                      focusLabel={area.id === newAreaId}
                      onSelect={onSelect}
                      onChange={onChange}
                      onDelete={onDelete}
                      onSearchInArea={onSearchInArea}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

function AreaItem({
  area,
  areas,
  stops,
  numDays,
  startDate,
  selected,
  focusLabel,
  onSelect,
  onChange,
  onDelete,
  onSearchInArea,
}: {
  area: TripArea;
  areas: TripArea[];
  stops: Stop[];
  numDays: number;
  startDate: string;
  selected: boolean;
  focusLabel: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: AreaPatch) => void;
  onDelete: (id: string) => void;
  onSearchInArea: (area: TripArea) => void;
}) {
  const color = areaColor(area.day_index);
  const inside = stopsInArea(area, stops).length;
  const otherDayStops = stopsOfOtherDays(area, stops).length;
  const overlap = overlapsOtherDay(area, areas);

  return (
    <Card
      withBorder
      p="sm"
      radius="md"
      className={classes.item}
      style={{ "--area-color": color }}
      data-area-id={area.id}
      data-selected={selected || undefined}
    >
      <UnstyledButton
        className={classes.itemHeader}
        aria-expanded={selected}
        onClick={() => onSelect(selected ? null : area.id)}
      >
        <span className={classes.itemDot} style={{ background: color }} />
        <Box className={classes.flexible}>
          <Text
            fw={600}
            truncate
            className={area.label.trim() ? undefined : classes.itemEmpty}
            c={area.label.trim() ? undefined : "dimmed"}
          >
            {areaTitle(area)}
          </Text>
          <Group gap={6} wrap="wrap">
            <Text size="xs" c="dimmed">
              반경 {formatDistance(area.radius_m / 1000)}
            </Text>
            {inside > 0 && (
              <Badge size="xs" variant="light" color="gray">
                {inside}곳 포함
              </Badge>
            )}
            {otherDayStops > 0 && (
              <Badge
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconAlertTriangle size={10} aria-hidden="true" />}
              >
                다른 일차 장소 {otherDayStops}곳
              </Badge>
            )}
            {overlap && (
              <Badge
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconAlertTriangle size={10} aria-hidden="true" />}
              >
                다른 일차와 겹침
              </Badge>
            )}
          </Group>
        </Box>
      </UnstyledButton>

      {selected && (
        <Box className={classes.editor}>
          <AreaEditor
            area={area}
            numDays={numDays}
            startDate={startDate}
            focusLabel={focusLabel}
            onChange={(patch) => onChange(area.id, patch)}
            onDelete={() => onDelete(area.id)}
            onSearch={() => onSearchInArea(area)}
            onDone={() => onSelect(null)}
          />
        </Box>
      )}
    </Card>
  );
}
