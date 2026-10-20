"use client";

import { useEffect, useState } from "react";

import { searchCities } from "@/lib/api";
import type { CityCandidate } from "../modules/DayWeather/types";

/** 입력을 멈춘 뒤 이만큼 기다렸다가 검색합니다. 한 글자마다 요청이 나가지 않게 합니다. */
const SEARCH_DELAY_MS = 300;

export type CitySearchState = {
  items: CityCandidate[];
  /** 결과를 보여 줄 때 함께 표기해야 하는 출처. 결과가 없으면 빈 문자열. */
  attribution: string;
  /** idle: 검색어 없음 / loading: 입력을 기다리거나 요청 중 / done / error */
  status: "idle" | "loading" | "done" | "error";
};

type Settled = {
  /** 이 결과가 어느 검색어의 것인지. 검색어가 바뀐 뒤에 도착한 옛 결과를 거르는 데 씁니다. */
  query: string;
  status: "done" | "error";
  items: CityCandidate[];
  attribution: string;
};

const IDLE: CitySearchState = { items: [], attribution: "", status: "idle" };
const LOADING: CitySearchState = {
  items: [],
  attribution: "",
  status: "loading",
};

/** 도시 이름 검색. 검색어가 바뀌면 진행 중인 요청은 취소합니다. */
export function useCitySearch(query: string): CitySearchState {
  const q = query.trim();
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchCities(q, controller.signal)
        .then((result) =>
          setSettled({
            query: q,
            status: "done",
            items: result.items,
            attribution: result.attribution,
          }),
        )
        .catch(() => {
          if (controller.signal.aborted) return;
          setSettled({ query: q, status: "error", items: [], attribution: "" });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  if (!q) return IDLE;
  if (settled === null || settled.query !== q) return LOADING;
  return settled;
}
