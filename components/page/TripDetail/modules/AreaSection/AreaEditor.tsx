import { useState } from "react";
import {
  Button,
  Group,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconSearch, IconTrash } from "@tabler/icons-react";

import type { TripArea } from "@/types";
import {
  AREA_LABEL_MAX_LENGTH,
  AREA_MAX_RADIUS_M,
  AREA_MEMO_MAX_LENGTH,
  AREA_MIN_RADIUS_M,
  AREA_WARN_RADIUS_M,
} from "@/constants/area";
import { formatDayDate } from "@/lib/date";
import { formatDistance } from "@/lib/geo";
import classes from "./AreaSection.module.css";

export type AreaPatch = Partial<
  Pick<TripArea, "label" | "day_index" | "radius_m" | "memo">
>;

type AreaEditorProps = {
  area: TripArea;
  numDays: number;
  startDate: string;
  focusLabel: boolean;
  /** 입력할 때마다 화면에 반영하고, 저장은 부모가 입력이 멈춘 뒤에 한 번만 합니다. */
  onChange: (patch: AreaPatch) => void;
  onDelete: () => void;
  onSearch: () => void;
  onDone: () => void;
};

const UNASSIGNED = "none";

export function AreaEditor({
  area,
  numDays,
  startDate,
  focusLabel,
  onChange,
  onDelete,
  onSearch,
  onDone,
}: AreaEditorProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Stack gap="sm">
      <TextInput
        label="이름"
        value={area.label}
        maxLength={AREA_LABEL_MAX_LENGTH}
        placeholder="예: 아사쿠사·스카이트리"
        data-autofocus={focusLabel || undefined}
        autoFocus={focusLabel}
        rightSectionWidth={48}
        rightSection={
          <Text size="xs" c="dimmed">
            {area.label.length}/{AREA_LABEL_MAX_LENGTH}
          </Text>
        }
        onChange={(event) =>
          onChange({
            label: event.currentTarget.value.slice(0, AREA_LABEL_MAX_LENGTH),
          })
        }
      />

      <Select
        label="일차"
        allowDeselect={false}
        value={area.day_index === null ? UNASSIGNED : String(area.day_index)}
        data={[
          { value: UNASSIGNED, label: "미지정" },
          ...Array.from({ length: numDays }, (_, day) => ({
            value: String(day),
            label: `${day + 1}일차 · ${formatDayDate(startDate, day)}`,
          })),
        ]}
        onChange={(value) =>
          onChange({
            day_index:
              value === null || value === UNASSIGNED ? null : Number(value),
          })
        }
      />

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          반경
        </Text>
        <Slider
          min={AREA_MIN_RADIUS_M}
          max={AREA_MAX_RADIUS_M}
          step={50}
          value={area.radius_m}
          label={(value) => formatDistance(value / 1000)}
          onChange={(value) => onChange({ radius_m: value })}
          aria-label="반경"
        />
        {area.radius_m >= AREA_WARN_RADIUS_M && (
          <Text size="xs" c="orange.7" fw={500}>
            반경이 너무 넓어요. 영역을 좁히면 더 정확하게 계획할 수 있어요.
          </Text>
        )}
      </Stack>

      <Textarea
        label="메모"
        value={area.memo ?? ""}
        maxLength={AREA_MEMO_MAX_LENGTH}
        placeholder="방문하고 싶은 곳이나 참고 사항을 적어 보세요"
        autosize
        minRows={2}
        maxRows={6}
        onChange={(event) =>
          onChange({ memo: event.currentTarget.value || null })
        }
      />

      <Button
        variant="light"
        leftSection={<IconSearch size={16} />}
        onClick={onSearch}
      >
        이 영역에서 장소 검색
      </Button>

      <Group className={classes.editorActions} justify="space-between" mt="xs">
        {confirming ? (
          <Group className={classes.deleteConfirm} gap="xs">
            <Text size="xs" c="red.7" fw={600}>
              이 영역을 삭제할까요?
            </Text>
            <Button color="red" size="compact-md" onClick={onDelete}>
              삭제
            </Button>
            <Button
              variant="default"
              size="compact-md"
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
          </Group>
        ) : (
          <Button
            className={classes.deleteButton}
            variant="subtle"
            color="red"
            size="compact-md"
            leftSection={<IconTrash size={16} />}
            onClick={() => setConfirming(true)}
          >
            영역 삭제
          </Button>
        )}
        <Button
          className={classes.doneButton}
          color="teal"
          size="compact-md"
          leftSection={<IconCheck size={16} />}
          onClick={onDone}
        >
          완료
        </Button>
      </Group>
    </Stack>
  );
}
