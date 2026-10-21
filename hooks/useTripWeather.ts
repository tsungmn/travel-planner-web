"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { TripWeather } from "@/lib/api";
import type { DayWeather } from "@/components/common/DayWeather/types";

const REFETCH_DELAY_MS = 600;
const EMPTY: ReadonlyMap<string, DayWeather> = new Map();

type Settled = TripWeather | "failed";

export type TripWeatherState = {
  byDate: ReadonlyMap<string, DayWeather>;
  summary: TripWeather["summary"];
  attribution: string | null;
  fetchedAt: string | null;
  stale: boolean;
  loading: boolean;
  failed: boolean;
  retry: () => void;
};

export function useTripWeather(
  load: (signal: AbortSignal) => Promise<TripWeather>,
  signature: string | null,
  mock?: TripWeather | null,
): TripWeatherState {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const retry = useCallback(() => {
    // 실패 화면을 비워야 다시 받는 동안 로딩 표시가 보입니다.
    setSettled((current) => (current === "failed" ? null : current));
    setRetryVersion((value) => value + 1);
  }, []);

  // 개발용 mock이 있으면 서버 응답 대신 그 값을 그대로 씁니다. (effect에서 state를 바꾸지 않고 계산합니다)
  const useMock = signature !== null && mock !== undefined;
  const shown: Settled | null = useMock ? (mock ?? "failed") : settled;

  useEffect(() => {
    if (signature === null || useMock) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      load(controller.signal)
        .then((result) => setSettled(result))
        .catch(() => {
          if (!controller.signal.aborted)
            setSettled((current) => current ?? "failed");
        });
    }, REFETCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, signature, useMock, retryVersion]);

  return useMemo(() => {
    if (shown === null)
      return {
        byDate: EMPTY,
        summary: null,
        attribution: null,
        fetchedAt: null,
        stale: false,
        loading: signature !== null,
        failed: false,
        retry,
      };
    if (shown === "failed")
      return {
        byDate: EMPTY,
        summary: null,
        attribution: null,
        fetchedAt: null,
        stale: false,
        loading: false,
        failed: true,
        retry,
      };
    return {
      byDate: new Map(shown.days.map((day) => [day.date, day])),
      summary: shown.summary,
      attribution: shown.days.length > 0 ? shown.attribution : null,
      fetchedAt: shown.fetchedAt,
      stale: shown.stale,
      loading: false,
      failed: false,
      retry,
    };
  }, [retry, shown, signature]);
}
