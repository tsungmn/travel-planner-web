"use client";

import { SubmitEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Stepper,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";

import type { PlaceResult } from "@/types";
import { createTrip } from "@/lib/api";
import { inclusiveDays, todayLocal } from "@/lib/date";
import { Header } from "@/components/common/Header";
import { useDestinationSearch } from "./hooks/useDestinationSearch";
import { DestinationStep } from "./modules/DestinationStep";
import { DateStep, type DateRange } from "./modules/DateStep";
import classes from "./TripNew.module.css";
import { MAX_TRIP_DAYS, TRIP_TITLE_MAX_LENGTH } from "@/constants/trip";

export function TripNewClient() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const search = useDestinationSearch();
  const [range, setRange] = useState<DateRange>([null, null]);
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);

  const { selected } = search;
  const [start, end] = range;
  const titleValid =
    title.trim().length >= 1 && title.trim().length <= TRIP_TITLE_MAX_LENGTH;
  const rangeReady =
    !!start &&
    !!end &&
    !dateError &&
    inclusiveDays(start, end) >= 1 &&
    inclusiveDays(start, end) <= MAX_TRIP_DAYS;

  function changeQuery(value: string) {
    search.changeQuery(value);
    setSubmitError(null);
  }

  function selectPlace(place: PlaceResult) {
    search.selectPlace(place);
    setSubmitError(null);
    if (!titleEdited)
      setTitle(`${place.name} 여행`.slice(0, TRIP_TITLE_MAX_LENGTH));
  }

  function changeRange(next: DateRange) {
    if (submissionLock.current) return;
    setSubmitError(null);
    const [nextStart, nextEnd] = next;
    if (
      nextStart &&
      nextEnd &&
      inclusiveDays(nextStart, nextEnd) > MAX_TRIP_DAYS
    ) {
      setRange([nextStart, null]);
      setDateError(`여행은 최대 ${MAX_TRIP_DAYS}일까지 만들 수 있어요.`);
      return;
    }
    setDateError(null);
    setRange(next);
  }

  function changeTitle(value: string) {
    setTitleEdited(true);
    setTitle(value.slice(0, TRIP_TITLE_MAX_LENGTH));
    setSubmitError(null);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current) return;
    if (step === 0) {
      if (selected) setStep(1);
      return;
    }
    if (!selected || !start || !end || !rangeReady || !titleValid) return;
    if (start < todayLocal()) {
      setDateError("출발일은 오늘 이후 날짜로 선택해 주세요.");
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createTrip({
        title: title.trim(),
        destination: selected.name,
        dest_lat: selected.lat,
        dest_lng: selected.lng,
        start_date: start,
        end_date: end,
      });
      // 뒤로 가기로 생성 폼에 돌아와 중복 생성하지 않도록 기록을 교체합니다.
      router.replace(`/trips/${encodeURIComponent(created.id)}`);
      router.refresh();
      // 성공 후에는 이동이 끝날 때까지 버튼을 잠가 둡니다.
    } catch {
      submissionLock.current = false;
      setSubmitting(false);
      setSubmitError("여행을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <Box className={classes.page}>
      <Header />
      <Container component="main" size={640} className={classes.main}>
        <Title order={1} size="h3" mb="lg">
          새 여행 만들기
        </Title>

        <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
          <Group justify="space-between" wrap="nowrap" mb="xl">
            <Stepper
              active={step}
              size="xs"
              className={classes.stepper}
              completedIcon={<IconCheck size={14} />}
            >
              <Stepper.Step label="여행지" allowStepSelect={false} />
              <Stepper.Step label="날짜" allowStepSelect={false} />
            </Stepper>
            {submitting ? (
              <Button variant="subtle" color="gray" disabled>
                취소
              </Button>
            ) : (
              <Button
                component={Link}
                href="/trips"
                variant="subtle"
                color="gray"
              >
                취소
              </Button>
            )}
          </Group>

          {step === 0 ? (
            <Stack gap="md">
              <DestinationStep
                query={search.query}
                results={search.results}
                attribution={search.attribution}
                status={search.status}
                selected={selected}
                onQueryChange={changeQuery}
                onSelect={selectPlace}
              />
              <Group justify="flex-end" pt="md">
                <Button
                  type="submit"
                  disabled={!selected}
                  radius="md"
                  rightSection={<IconArrowRight size={16} />}
                >
                  다음
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="lg">
              <DateStep
                range={range}
                dateError={dateError}
                title={title}
                submitting={submitting}
                onRangeChange={changeRange}
                onTitleChange={changeTitle}
              />
              {submitError && (
                <Alert
                  color="red"
                  radius="md"
                  icon={<IconAlertCircle size={18} />}
                  role="alert"
                >
                  {submitError}
                </Alert>
              )}
              <Group justify="space-between" pt="md">
                <Button
                  type="button"
                  variant="subtle"
                  radius="md"
                  disabled={submitting}
                  onClick={() => setStep(0)}
                  leftSection={<IconArrowLeft size={16} />}
                >
                  이전
                </Button>
                <Button
                  type="submit"
                  radius="md"
                  loading={submitting}
                  disabled={!rangeReady || !titleValid || submitting}
                >
                  {submitting ? "만드는 중..." : "여행 만들기"}
                </Button>
              </Group>
            </Stack>
          )}
        </form>
      </Container>
    </Box>
  );
}
