"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { Flight, TripMode } from "@/types";

export type DetailView = "search" | "flight" | "lodging" | "trip-edit";
export type FlightDirection = Flight["direction"];

const VIEWS: readonly DetailView[] = [
  "search",
  "flight",
  "lodging",
  "trip-edit",
];

/** openView가 push한 history 항목임을 표시합니다. (닫을 때 history.back() 할지 판단) */
const OPENED_BY_APP = "tripDetailViewOpened";

/**
 * URL만 바꿉니다. (history 항목은 새로 만들지 않음)
 *
 * 주의: `window.history.state`를 그대로 넘기면 안 됩니다. 그 안의 `__NA`를 보고 Next가
 * "자기 내부 호출"로 판단해 `useSearchParams` 동기화를 건너뛰어, URL만 바뀌고 화면은 그대로예요.
 * Next가 내부 state를 알아서 채우므로 우리 표시만 남겨 넘깁니다.
 */
function replaceUrl(url: string) {
  const keep = window.history.state?.[OPENED_BY_APP]
    ? { [OPENED_BY_APP]: true }
    : null;
  window.history.replaceState(keep, "", url);
}

type RouteState = {
  /** 0부터 시작. URL에는 1부터 적습니다. */
  day: number | null;
  /** 러프(영역) / 계획(장소). 계획이 기본값이라 러프일 때만 URL에 적습니다. */
  mode: TripMode;
  view: DetailView | null;
  dir: FlightDirection | null;
  id: string | null;
};

function parseDay(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? null : n - 1;
}

function parseMode(value: string | null): TripMode {
  return value === "rough" ? "rough" : "plan";
}

function parseView(value: string | null): DetailView | null {
  return VIEWS.find((view) => view === value) ?? null;
}

function parseDirection(value: string | null): FlightDirection | null {
  return value === "outbound" || value === "inbound" ? value : null;
}

function buildUrl(pathname: string, state: RouteState): string {
  const params = new URLSearchParams();
  if (state.day !== null) params.set("day", String(state.day + 1));
  if (state.mode === "rough") params.set("mode", "rough");
  if (state.view) params.set("view", state.view);
  if (state.dir) params.set("dir", state.dir);
  if (state.id) params.set("id", state.id);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * `?day=`, `?mode=`, `?view=`, `?dir=`, `?id=`로 일차 탭, 작업 모드, 서브 화면을 관리합니다.
 * (`?view=search`의 `?id=`는 검색 범위로 쓸 영역입니다.)
 *
 * `router.push`는 서버 왕복을 일으키고 transition이 끝날 때까지 UI 반영이 늦어져서,
 * Next가 `useSearchParams`와 동기화해 주는 History API를 직접 씁니다.
 * - 서브 화면 열기: pushState → 브라우저 뒤로 가기로 닫을 수 있어요.
 * - 일차 탭 전환: replaceState → 탭을 누를 때마다 기록이 쌓이지 않아요.
 */
export function useDetailRoute() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state: RouteState = {
    day: parseDay(searchParams.get("day")),
    mode: parseMode(searchParams.get("mode")),
    view: parseView(searchParams.get("view")),
    dir: parseDirection(searchParams.get("dir")),
    id: searchParams.get("id"),
  };

  function setDay(day: number | null) {
    replaceUrl(buildUrl(pathname, { ...state, day }));
  }

  /** 러프 ↔ 계획. 일차 탭 전환처럼 기록을 쌓지 않습니다. */
  function setMode(mode: TripMode) {
    replaceUrl(buildUrl(pathname, { ...state, mode }));
  }

  function openView(
    view: DetailView,
    options?: {
      dir?: FlightDirection;
      id?: string;
      mode?: TripMode;
      /** 서브 화면을 열면서 일차 탭도 함께 바꿉니다. (null = 전체) */
      day?: number | null;
    },
  ) {
    window.history.pushState(
      { [OPENED_BY_APP]: true },
      "",
      buildUrl(pathname, {
        day: options?.day === undefined ? state.day : options.day,
        mode: options?.mode ?? state.mode,
        view,
        dir: options?.dir ?? null,
        id: options?.id ?? null,
      }),
    );
  }

  /** 서브 화면을 닫습니다. 앱이 연 화면이면 뒤로 가기, 주소로 바로 들어왔다면 주소만 정리합니다. */
  function closeView() {
    if (window.history.state?.[OPENED_BY_APP]) {
      window.history.back();
      return;
    }
    replaceUrl(
      buildUrl(pathname, {
        day: state.day,
        mode: state.mode,
        view: null,
        dir: null,
        id: null,
      }),
    );
  }

  /** 서브 화면을 닫으면서 특정 일차로 이동합니다. */
  function closeViewToDay(day: number) {
    replaceUrl(
      buildUrl(pathname, {
        day,
        mode: state.mode,
        view: null,
        dir: null,
        id: null,
      }),
    );
  }

  return {
    selectedDay: state.day,
    mode: state.mode,
    view: state.view,
    dir: state.dir,
    id: state.id,
    setDay,
    setMode,
    openView,
    closeView,
    closeViewToDay,
  };
}
