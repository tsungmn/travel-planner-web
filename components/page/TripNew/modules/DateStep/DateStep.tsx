import { useState } from "react";
import { Fieldset, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import "dayjs/locale/ko";

import { formatPeriod, todayLocal } from "@/lib/date";
import { TRIP_TITLE_MAX_LENGTH } from "@/constants/trip";
import classes from "./DateStep.module.css";

export type DateRange = [string | null, string | null];

type DateStepProps = {
  range: DateRange;
  dateError: string | null;
  title: string;
  submitting: boolean;
  onRangeChange: (next: DateRange) => void;
  onTitleChange: (value: string) => void;
};

export function DateStep({
  range,
  dateError,
  title,
  submitting,
  onRangeChange,
  onTitleChange,
}: DateStepProps) {
  const [today] = useState(todayLocal);
  const [start, end] = range;

  return (
    <Stack gap="lg">
      <Fieldset
        disabled={submitting}
        variant="unstyled"
        legend={
          <Text component="span" fw={600}>
            여행 날짜
          </Text>
        }
      >
        <Text size="sm" c="dimmed" mb="md">
          출발일과 도착일을 선택하세요.
        </Text>

        <Paper withBorder radius={12} p="xs" className={classes.calendar}>
          <DatePicker
            type="range"
            locale="ko"
            value={range}
            onChange={onRangeChange}
            minDate={today}
            allowSingleDateInRange
            numberOfColumns={1}
            aria-label="출발일과 도착일 선택"
          />
        </Paper>
      </Fieldset>

      {dateError && (
        <Text size="sm" c="red" role="alert">
          {dateError}
        </Text>
      )}

      {start && end && (
        <Paper radius={12} px="md" py="sm" className={classes.selection}>
          <Group gap="xs" wrap="nowrap">
            <IconCalendar
              size={20}
              className={classes.placeIcon}
              aria-hidden="true"
            />

            <Text size="sm" fw={500}>
              {formatPeriod(start, end)}
            </Text>
          </Group>
        </Paper>
      )}

      <Stack gap={6}>
        <TextInput
          id="trip-title"
          name="title"
          label="여행 제목"
          size="md"
          radius={12}
          value={title}
          maxLength={TRIP_TITLE_MAX_LENGTH}
          required
          disabled={submitting}
          placeholder="여행 제목을 입력해 주세요"
          aria-describedby="trip-title-help trip-title-count"
          styles={{
            label: {
              fontSize: "var(--mantine-font-size-sm)",
              fontWeight: 600,
              marginBottom: 6,
            },
            input: {
              height: 44,
            },
          }}
          onChange={(event) => onTitleChange(event.currentTarget.value)}
        />

        <Group justify="space-between">
          <Text id="trip-title-help" size="xs" c="dimmed">
            최대 {TRIP_TITLE_MAX_LENGTH}자
          </Text>

          <Text id="trip-title-count" size="xs" c="dimmed">
            {title.length}/{TRIP_TITLE_MAX_LENGTH}
          </Text>
        </Group>
      </Stack>
    </Stack>
  );
}
