"use client";

import { useState } from "react";
import { Alert, Button, Paper, Stack, Text, TextInput } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconAlertTriangle } from "@tabler/icons-react";
import "dayjs/locale/ko";

import type { Stop, Trip } from "@/types";
import { formatPeriod, inclusiveDays } from "@/lib/date";
import { MAX_TRIP_DAYS, TRIP_TITLE_MAX_LENGTH } from "@/constants/trip";
import { PanelSubScreen } from "../PanelSubScreen";
import classes from "./TripEditForm.module.css";

export type TripEditFormData = {
  title: string;
  start_date: string;
  end_date: string;
};

type DateRange = [string | null, string | null];

type TripEditFormProps = {
  trip: Trip;
  stops: Stop[];
  onSave: (data: TripEditFormData) => void;
  onCancel: () => void;
  onGoToDay: (dayIndex: number) => void;
};

export function TripEditForm({
  trip,
  stops,
  onSave,
  onCancel,
  onGoToDay,
}: TripEditFormProps) {
  const [title, setTitle] = useState(trip.title);
  const [range, setRange] = useState<DateRange>([
    trip.start_date,
    trip.end_date,
  ]);
  const [rangeError, setRangeError] = useState<string | null>(null);
  // 줄어든 기간 밖에 장소가 남아 있을 때, 가장 뒤쪽 일차(0부터)
  const [conflictDay, setConflictDay] = useState<number | null>(null);

  const [start, end] = range;
  const trimmedTitle = title.trim();
  const titleValid =
    trimmedTitle.length >= 1 && trimmedTitle.length <= TRIP_TITLE_MAX_LENGTH;
  const rangeReady = !!start && !!end;

  const isDirty =
    trimmedTitle !== trip.title ||
    start !== trip.start_date ||
    end !== trip.end_date;

  function changeRange(next: DateRange) {
    const [nextStart, nextEnd] = next;
    if (
      nextStart &&
      nextEnd &&
      inclusiveDays(nextStart, nextEnd) > MAX_TRIP_DAYS
    ) {
      setRange([nextStart, null]);
      setRangeError(`여행은 최대 ${MAX_TRIP_DAYS}일까지 만들 수 있어요.`);
      return;
    }
    setRangeError(null);
    setConflictDay(null);
    setRange(next);
  }

  function handleSave() {
    if (!titleValid || !start || !end) return;

    const lastDayIndex = inclusiveDays(start, end) - 1;
    const outOfRange = stops.filter((stop) => stop.day_index > lastDayIndex);
    if (outOfRange.length > 0) {
      setConflictDay(Math.max(...outOfRange.map((stop) => stop.day_index)));
      return;
    }

    onSave({ title: trimmedTitle, start_date: start, end_date: end });
  }

  return (
    <PanelSubScreen
      title="여행 정보 수정"
      dirty={isDirty}
      saveDisabled={!titleValid || !rangeReady}
      onBack={onCancel}
      onSave={handleSave}
    >
      <Stack gap="lg">
        {conflictDay !== null && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            role="alert"
          >
            <Text size="sm" c="red">
              {conflictDay + 1}일차에 등록된 장소가 있어요. 먼저 다른 일차로
              옮기거나 삭제해 주세요.
            </Text>
            <Button
              variant="outline"
              color="red"
              size="compact-sm"
              mt="xs"
              onClick={() => onGoToDay(conflictDay)}
            >
              {conflictDay + 1}일차 보기
            </Button>
          </Alert>
        )}

        <Stack gap={4}>
          <TextInput
            label="제목"
            placeholder="여행 제목"
            value={title}
            maxLength={TRIP_TITLE_MAX_LENGTH}
            onChange={(event) =>
              setTitle(
                event.currentTarget.value.slice(0, TRIP_TITLE_MAX_LENGTH),
              )
            }
          />
          <Text size="xs" c="dimmed" ta="right">
            {title.length}/{TRIP_TITLE_MAX_LENGTH}
          </Text>
        </Stack>

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            여행 기간
          </Text>
          {start && end && (
            <Paper radius="md" px="md" py="sm" className={classes.summary}>
              <Text size="sm" fw={500}>
                {formatPeriod(start, end)}
              </Text>
            </Paper>
          )}
          <Paper withBorder radius="md" p="xs" className={classes.calendar}>
            <DatePicker
              type="range"
              locale="ko"
              value={range}
              defaultDate={start ?? undefined}
              onChange={changeRange}
              allowSingleDateInRange
              numberOfColumns={1}
              aria-label="여행 기간 선택"
            />
          </Paper>
          {rangeError ? (
            <Text size="xs" c="red" role="alert">
              {rangeError}
            </Text>
          ) : (
            <Text size="xs" c="dimmed">
              최대 {MAX_TRIP_DAYS}일({MAX_TRIP_DAYS - 1}박)까지 선택할 수
              있어요.
            </Text>
          )}
        </Stack>
      </Stack>
    </PanelSubScreen>
  );
}
