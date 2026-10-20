"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Group,
  Modal,
  NativeSelect,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconMapPin, IconSearch } from "@tabler/icons-react";

import { useCitySearch } from "../../hooks/useCitySearch";
import type { CityApplyScope, CityCandidate } from "./types";
import classes from "./DayWeather.module.css";

type CityPickerModalProps = {
  opened: boolean;
  onClose: () => void;
  /** 도시를 고르는 기준 일차(1부터 시작). */
  dayIndex: number;
  /** 전체 일차 수. */
  totalDays: number;
  /** 이 일차의 도시를 사용자가 정해 둔 상태인지. 그렇다면 자동 추정으로 되돌릴 수 있습니다. */
  canReset: boolean;
  /** 선택한 도시와 적용 범위를 저장합니다. 실패하면 던지고, 창은 열린 채 안내를 보여 줍니다. */
  onApply: (city: CityCandidate, scope: CityApplyScope) => Promise<void>;
  /** 범위의 지정을 지우고 자동 추정으로 되돌립니다. */
  onReset: (scope: CityApplyScope) => Promise<void>;
};

export function CityPickerModal({
  opened,
  onClose,
  dayIndex,
  totalDays,
  canReset,
  onApply,
  onReset,
}: CityPickerModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconMapPin size={18} aria-hidden="true" />
          <Text fw={600}>이 일차의 도시 바꾸기</Text>
        </Group>
      }
      centered
      size="md"
      radius="md"
      padding="md"
    >
      {/* 본문을 따로 두면 창이 닫힐 때 상태(검색어, 범위)가 함께 사라져, 열 때마다 처음 상태입니다. */}
      <CityPickerBody
        dayIndex={dayIndex}
        totalDays={totalDays}
        canReset={canReset}
        onApply={onApply}
        onReset={onReset}
        onClose={onClose}
      />
    </Modal>
  );
}

type ScopeKind = "day" | "to-end" | "range";

function CityPickerBody({
  dayIndex,
  totalDays,
  canReset,
  onApply,
  onReset,
  onClose,
}: Omit<CityPickerModalProps, "opened">) {
  const [query, setQuery] = useState("");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("day");
  // "범위 지정"의 마지막 일차 (기준 일차 다음 날부터 고를 수 있음)
  const [rangeEnd, setRangeEnd] = useState(Math.min(dayIndex + 1, totalDays));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const search = useCitySearch(query);

  const canRange = totalDays > dayIndex;
  const toDay =
    scopeKind === "day"
      ? dayIndex
      : scopeKind === "to-end"
        ? totalDays
        : Math.max(dayIndex, rangeEnd);
  const scope: CityApplyScope = { fromDay: dayIndex, toDay };

  /** 저장이 끝나면 창을 닫고, 실패하면 열어 둔 채 안내합니다. */
  async function run(action: () => Promise<void>) {
    setPending(true);
    setFailed(false);
    try {
      await action();
      onClose();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  const rangeOptions = useMemo(
    () =>
      Array.from({ length: Math.max(0, totalDays - dayIndex) }, (_, i) => ({
        value: String(dayIndex + 1 + i),
        label: `${dayIndex + 1 + i}일차`,
      })),
    [dayIndex, totalDays],
  );

  return (
    <Stack gap="md">
      <TextInput
        placeholder="도시 이름을 검색하세요"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        leftSection={<IconSearch size={16} aria-hidden="true" />}
        aria-label="도시 검색"
        radius="md"
        data-autofocus
      />

      {canRange && (
        <Box>
          <Text size="xs" fw={500} c="dimmed" mb={6}>
            적용 범위
          </Text>
          <SegmentedControl
            fullWidth
            value={scopeKind}
            onChange={(v) => setScopeKind(v as ScopeKind)}
            data={[
              { value: "day", label: "이 날만" },
              { value: "to-end", label: "끝까지" },
              { value: "range", label: "범위 지정" },
            ]}
            radius="md"
            size="sm"
            disabled={pending}
          />
          {scopeKind === "range" && (
            <NativeSelect
              mt={8}
              size="xs"
              label="마지막 일차"
              value={String(rangeEnd)}
              onChange={(e) => setRangeEnd(Number(e.currentTarget.value))}
              data={rangeOptions}
              disabled={pending}
            />
          )}
          <Text size="xs" c="dimmed" mt={6}>
            {toDay === dayIndex
              ? `${dayIndex}일차에만 적용돼요.`
              : `${dayIndex}일차부터 ${toDay}일차까지 적용돼요.`}
          </Text>
        </Box>
      )}

      <div aria-live="polite">
        {search.status === "idle" && (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            도시 이름을 입력하면 찾아 드려요.
          </Text>
        )}
        {search.status === "loading" && (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            검색하고 있어요…
          </Text>
        )}
        {search.status === "error" && (
          <Text size="sm" c="red" ta="center" py="lg">
            도시를 검색하지 못했어요. 잠시 뒤에 다시 시도해 주세요.
          </Text>
        )}
        {search.status === "done" && search.items.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            검색 결과가 없어요.
          </Text>
        )}
      </div>

      {search.status === "done" && search.items.length > 0 && (
        <ScrollArea.Autosize mah={280} type="auto" offsetScrollbars>
          <Stack gap={4}>
            {search.items.map((c) => {
              const place = [c.admin1, c.country].filter(Boolean).join(", ");
              return (
                <UnstyledButton
                  key={c.id}
                  className={classes.cityResult}
                  onClick={() => run(() => onApply(c, scope))}
                  disabled={pending}
                  aria-label={`${c.name}${place ? `, ${place}` : ""} 선택`}
                >
                  <IconMapPin size={16} aria-hidden="true" />
                  <Box>
                    <Text size="sm" fw={500}>
                      {c.name}
                    </Text>
                    {place && (
                      <Text size="xs" c="dimmed">
                        {place}
                      </Text>
                    )}
                  </Box>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      )}

      {failed && (
        <Text size="sm" c="red" role="alert">
          저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.
        </Text>
      )}

      {search.attribution && (
        <Text size="xs" c="dimmed">
          {search.attribution}
        </Text>
      )}

      <Group justify={canReset ? "space-between" : "flex-end"} gap="xs">
        {canReset && (
          <Button
            variant="subtle"
            color="gray"
            onClick={() => run(() => onReset(scope))}
            disabled={pending}
          >
            자동 추정으로 되돌리기
          </Button>
        )}
        <Button variant="default" onClick={onClose} disabled={pending}>
          취소
        </Button>
      </Group>
    </Stack>
  );
}
