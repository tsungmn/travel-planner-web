"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";

import type { PlaceResult } from "@/types";
import { createTrip, getUser, type UserInfo } from "@/lib/api";
import { ApiError } from "@/lib/http";
import { inclusiveDays, todayLocal } from "@/lib/date";
import { Header } from "@/components/common/Header";
import { MAX_TRIP_DAYS, TRIP_TITLE_MAX_LENGTH } from "@/constants/trip";
import { useDestinationSearch } from "@/hooks/useDestinationSearch";
import { DestinationStep } from "./modules/DestinationStep";
import { DateStep, type DateRange } from "./modules/DateStep";
import classes from "./TripNew.module.css";

export function TripNewClient() {
  const router = useRouter();
  const search = useDestinationSearch();

  const [step, setStep] = useState<0 | 1>(0);
  const [user, setUser] = useState<UserInfo>({ name: "", email: "" });
  const [range, setRange] = useState<DateRange>([null, null]);
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submissionLock = useRef(false);

  useEffect(() => {
    let active = true;

    getUser()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

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

    if (!titleEdited) {
      setTitle(`${place.name} 여행`.slice(0, TRIP_TITLE_MAX_LENGTH));
    }
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

      router.replace(`/trips/${encodeURIComponent(created.id)}`);
    } catch (error) {
      submissionLock.current = false;
      setSubmitting(false);
      setSubmitError(
        error instanceof ApiError && error.code === "too_many_trips"
          ? "만들 수 있는 여행 수를 모두 사용했어요. 지난 여행을 정리한 뒤 다시 시도해 주세요."
          : "여행을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  return (
    <Box className={classes.page}>
      <Header userName={user.name} userEmail={user.email} />

      <Container component="main" size={640} className={classes.main}>
        <VisuallyHidden>
          <Title order={1}>새 여행 만들기</Title>
        </VisuallyHidden>

        <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
          <Group justify="space-between" wrap="nowrap" mb={32}>
            <Group
              gap="xs"
              wrap="nowrap"
              className={classes.stepper}
              aria-label="여행 생성 단계"
            >
              <StepBadge n={1} active={step === 0} done={step > 0}>
                여행지
              </StepBadge>

              <IconArrowRight
                size={16}
                color="var(--mantine-color-dimmed)"
                aria-hidden="true"
              />

              <StepBadge n={2} active={step === 1} done={false}>
                날짜
              </StepBadge>
            </Group>

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
                  h={44}
                  px={24}
                  radius={12}
                  fw={600}
                  rightSection={<IconArrowRight size={16} aria-hidden="true" />}
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
                  radius={12}
                  icon={<IconAlertCircle size={18} aria-hidden="true" />}
                  role="alert"
                >
                  {submitError}
                </Alert>
              )}

              <Group justify="space-between" pt="md">
                <Button
                  type="button"
                  variant="subtle"
                  color="gray"
                  h={44}
                  px={16}
                  radius={12}
                  fw={600}
                  disabled={submitting}
                  onClick={() => setStep(0)}
                  leftSection={<IconArrowLeft size={16} aria-hidden="true" />}
                >
                  이전
                </Button>

                <Button
                  type="submit"
                  h={44}
                  px={24}
                  radius={12}
                  fw={600}
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

function StepBadge({
  n,
  active,
  done,
  children,
}: {
  n: number;
  active: boolean;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <Group gap={6} wrap="nowrap" aria-current={active ? "step" : undefined}>
      <ThemeIcon
        size={24}
        radius="xl"
        variant={active || done ? "filled" : "light"}
        color={active || done ? undefined : "gray"}
        aria-hidden="true"
      >
        {done ? (
          <IconCheck size={14} />
        ) : (
          <Text component="span" size="xs" fw={700} c="inherit">
            {n}
          </Text>
        )}
      </ThemeIcon>

      <Text
        component="span"
        size="sm"
        fw={500}
        c={active || done ? undefined : "dimmed"}
      >
        {children}
      </Text>
    </Group>
  );
}
