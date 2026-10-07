import { useState } from "react";
import { Fieldset, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import "dayjs/locale/ko";

import { inclusiveDays, todayLocal } from "@/lib/date";
import classes from "./DateStep.module.css";
import { TRIP_TITLE_MAX_LENGTH } from "@/constants/trip";

/** Mantine Dates 8 이상: Date 객체 대신 YYYY-MM-DD 문자열을 사용합니다. */
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
  // 이 단계는 첫 화면이 아니라 클라이언트에서만 열리므로, 서버/브라우저 시간대
  // 차이로 인한 hydration 불일치가 없습니다.
  const [today] = useState(todayLocal);
  const [start, end] = range;

  return (
    <Stack gap="lg">
      <Fieldset disabled={submitting} variant="unstyled" legend="여행 날짜">
        <Text size="sm" c="dimmed" mb="sm">
          출발일과 도착일을 선택하세요.
        </Text>
        <Paper withBorder radius="md" p="xs" className={classes.calendar}>
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
        <Paper radius="md" p="sm" className={classes.selection}>
          <Group gap="xs" wrap="nowrap">
            <IconCalendar size={20} className={classes.placeIcon} />
            <Text size="sm" fw={500}>
              {start.replaceAll("-", ".")} ~ {end.replaceAll("-", ".")} ·{" "}
              {inclusiveDays(start, end)}일
            </Text>
          </Group>
        </Paper>
      )}

      <TextInput
        id="trip-title"
        name="title"
        label="여행 제목"
        size="md"
        radius="md"
        value={title}
        maxLength={TRIP_TITLE_MAX_LENGTH}
        required
        disabled={submitting}
        description={`최대 ${TRIP_TITLE_MAX_LENGTH}자 · ${title.length}/${TRIP_TITLE_MAX_LENGTH}`}
        placeholder="여행 제목을 입력해 주세요"
        onChange={(event) => onTitleChange(event.currentTarget.value)}
      />
    </Stack>
  );
}
