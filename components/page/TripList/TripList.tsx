"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconMapPin, IconPlus, IconRefresh } from "@tabler/icons-react";

import type { Trip } from "@/types";
import { getTrips, getUser, type UserInfo } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { TripCard } from "@/components/common/TripCard";
import classes from "./TripList.module.css";

type QueryState = "loading" | "empty" | "error" | null;

function isPast(trip: Trip): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${trip.end_date}T00:00:00`) < today;
}

function getQueryState(value: string | null): QueryState {
  return value === "loading" || value === "empty" || value === "error"
    ? value
    : null;
}

export function TripListClient() {
  return (
    <Suspense
      fallback={
        <Center mih="100vh">
          <Loader size="sm" />
        </Center>
      }
    >
      <TripListContent />
    </Suspense>
  );
}

function TripListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryState = getQueryState(searchParams.get("state"));

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [user, setUser] = useState<UserInfo>({ name: "", email: "" });

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getTrips();
      data.sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
      );
      setTrips(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleted = useCallback((tripId: string) => {
    setTrips((current) => current.filter((item) => item.id !== tripId));
  }, []);

  useEffect(() => {
    if (queryState) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [queryState, load]);

  const showLoading = queryState === "loading" || (!queryState && loading);
  const showError = queryState === "error" || (!queryState && error);
  const showEmpty =
    queryState === "empty" ||
    (!queryState && !loading && !error && trips.length === 0);
  const showContent = !queryState && !loading && !error && trips.length > 0;
  // 다가오는 여행은 시작일이 가까운 순, 지난 여행은 최근 순으로 보여줍니다.
  const upcoming = trips
    .filter((trip) => !isPast(trip))
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );
  const past = trips.filter((trip) => isPast(trip));

  return (
    <Box className={classes.page}>
      <Header userName={user.name} userEmail={user.email} />

      <main className={classes.main}>
        <Container size="lg" className={classes.mainContainer}>
          <Group
            justify="space-between"
            align="center"
            className={classes.heading}
          >
            <Title order={1} size="h2">
              내 여행
            </Title>
            <Button
              leftSection={<IconPlus size={20} aria-hidden="true" />}
              onClick={() => router.push("/trips/new")}
              radius="xl"
              size="md"
              fw={600}
            >
              새 여행
            </Button>
          </Group>

          {showLoading && <LoadingGrid />}

          {showEmpty && (
            <Center className={classes.stateArea}>
              <Stack align="center" gap="xs">
                <EmptyIllustration />
                <Title order={2} size="h4" mt="md">
                  아직 여행이 없어요
                </Title>
                <Text size="sm" c="dimmed">
                  첫 여행을 만들고 일정을 세워요.
                </Text>
                <Button
                  leftSection={<IconPlus size={20} aria-hidden="true" />}
                  onClick={() => router.push("/trips/new")}
                  radius="xl"
                  size="md"
                  mt="md"
                  fw={600}
                >
                  첫 여행 만들기
                </Button>
              </Stack>
            </Center>
          )}

          {showError && !showLoading && (
            <Center className={classes.stateArea}>
              <Stack align="center" gap="xs">
                <ThemeIcon color="red" variant="light" size={56} radius="xl">
                  <IconMapPin size={28} aria-hidden="true" />
                </ThemeIcon>
                <Title order={2} size="h4" mt="md">
                  여행 목록을 불러오지 못했어요
                </Title>
                <Text size="sm" c="dimmed">
                  잠시 후 다시 시도해 주세요.
                </Text>
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={18} aria-hidden="true" />}
                  onClick={load}
                  radius="xl"
                  size="md"
                  mt="md"
                  fw={600}
                >
                  다시 시도
                </Button>
              </Stack>
            </Center>
          )}

          {showContent && (
            <Stack gap={40}>
              {upcoming.length > 0 && (
                <section>
                  <Text size="sm" fw={600} c="dimmed" mb="md">
                    다가오는 여행
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                    {upcoming.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onDeleted={handleDeleted}
                      />
                    ))}
                  </SimpleGrid>
                </section>
              )}

              {past.length > 0 && (
                <section>
                  <Text size="sm" fw={600} c="dimmed" mb="md">
                    지난 여행
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                    {past.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        past
                        onDeleted={handleDeleted}
                      />
                    ))}
                  </SimpleGrid>
                </section>
              )}
            </Stack>
          )}
        </Container>
      </main>

      <Footer />
    </Box>
  );
}

function LoadingGrid() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
      {Array.from({ length: 6 }).map((_, index) => (
        <Box key={index} className={classes.loadingCard}>
          <Skeleton height={144} />
          <Stack gap="sm" p="md">
            <Skeleton height={20} width="75%" />
            <Skeleton height={16} width="50%" />
            <Skeleton height={16} width="66%" />
            <Group gap="xs" pt={4}>
              <Skeleton height={28} width={80} radius="xl" />
              <Skeleton height={28} width={64} radius="xl" />
            </Group>
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}

function EmptyIllustration() {
  return (
    <svg
      className={classes.emptyIllustration}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#f0fdfa" />
      <path
        d="M28 78 Q42 60 50 48 T72 38 Q82 30 92 28"
        stroke="#0F766E"
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
        opacity="0.4"
      />
      <Marker x={28} y={78} color="#0F766E" number="1" />
      <Marker x={50} y={48} color="#EA580C" number="2" />
      <Marker x={72} y={38} color="#7C3AED" number="3" />
      <Marker x={92} y={28} color="#0284C7" number="4" />
    </svg>
  );
}

function Marker({
  x,
  y,
  color,
  number,
}: {
  x: number;
  y: number;
  color: string;
  number: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 0 C-7 -7 -7 -14 0 -14 C7 -14 7 -7 0 0 Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.5"
      />
      <text
        x="0"
        y="-8"
        textAnchor="middle"
        fill="#fff"
        fontSize="9"
        fontWeight="700"
        fontFamily="Pretendard, sans-serif"
      >
        {number}
      </text>
    </g>
  );
}
