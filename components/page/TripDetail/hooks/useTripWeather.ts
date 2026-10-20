"use client";

import { useEffect, useMemo, useState } from "react";

import type { TripWeather } from "@/lib/api";
import type { DayWeather } from "../modules/DayWeather/types";

/** 일정을 고치는 동안 요청이 쏟아지지 않게, 마지막 변경 뒤 이만큼 기다렸다가 받습니다. */
const REFETCH_DELAY_MS = 600;

const EMPTY: ReadonlyMap<string, DayWeather> = new Map();

export type TripWeatherState = {
  /** "YYYY-MM-DD" → 그날의 날씨. 없는 날은 키가 없습니다. */
  byDate: ReadonlyMap<string, DayWeather>;
  attribution: string | null;
  /** 첫 응답(또는 실패)을 기다리는 중. 이때만 날씨 자리를 미리 잡아 둡니다. */
  loading: boolean;
};

type Settled = { days: DayWeather[]; attribution: string } | "failed";

/**
 * 일차별 날씨를 받아 옵니다. 날씨는 부가 정보라서 실패해도 화면은 그대로 두고 날씨만 안 보입니다.
 *
 * - `signature`가 바뀌면(장소·숙소·영역·날짜가 바뀌어 위치 추정이 달라질 수 있으면) 다시 받습니다.
 *   서버가 예보를 캐시해서 다시 받아도 외부 요청은 거의 나가지 않습니다.
 * - 다시 받는 동안과, 다시 받기가 실패했을 때는 이전 날씨를 그대로 보여 줍니다.
 * - `signature`가 null이면(여행을 아직 못 불러옴) 아무것도 하지 않습니다.
 * - `load`는 useCallback 등으로 안정적이어야 합니다.
 */
export function useTripWeather(
  load: (signal: AbortSignal) => Promise<TripWeather>,
  signature: string | null,
): TripWeatherState {
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (signature === null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      load(controller.signal)
        .then((result) => setSettled(result))
        .catch(() => {
          if (controller.signal.aborted) return;
          // 이미 받은 날씨가 있으면 그대로 두고, 처음부터 실패했으면 "실패"로 표시합니다.
          setSettled((current) => current ?? "failed");
        });
    }, REFETCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, signature]);

  return useMemo(() => {
    if (settled === null) {
      return { byDate: EMPTY, attribution: null, loading: signature !== null };
    }
    if (settled === "failed") {
      return { byDate: EMPTY, attribution: null, loading: false };
    }
    return {
      byDate: new Map(settled.days.map((day) => [day.date, day])),
      attribution: settled.days.length > 0 ? settled.attribution : null,
      loading: false,
    };
  }, [settled, signature]);
}
