"use client";

import { useEffect, useRef, useState } from "react";

import type { MapBounds, PlaceResult, SearchMode } from "@/types";
import {
  searchPlaces,
  SearchRateLimitError,
  SearchServiceUnavailableError,
} from "@/lib/api";
import { ApiError } from "@/lib/http";
import { PLACE_SEARCH_DEBOUNCE_MS } from "@/constants/search";

/**
 * - rate: 하루 검색 한도 초과 (429)
 * - unavailable: 검색 기능이 서버에 설정되지 않음 (503)
 * - network: 서버에 닿지 못함 (연결 끊김 등)
 * - upstream: 서버나 검색 업체가 오류를 돌려줌 (502 등)
 */
export type PlaceSearchError = "rate" | "unavailable" | "network" | "upstream";

type Center = { lat: number | null; lng: number | null };

/**
 * 검색 범위.
 * - nearby: 여행지 반경 안 (기본값, "여행지 주변만")
 * - world: 제한 없음
 * - view: "현 지도에서 검색"을 눌렀을 때의 지도 범위, 또는 영역에서 연 검색의 영역 범위
 *   (`source: "area"`)
 */
type SearchScope =
  | { kind: "nearby" }
  | { kind: "world" }
  | { kind: "view"; bounds: MapBounds; source?: "area" };

function toSearchError(error: unknown): PlaceSearchError {
  if (error instanceof SearchRateLimitError) return "rate";
  if (error instanceof SearchServiceUnavailableError) return "unavailable";
  if (error instanceof ApiError && error.status === 0) return "network";
  return "upstream";
}

/**
 * 장소 검색 상태를 관리합니다. (디바운스, 오래된 응답 무시, 여행지 주변 / 현 지도 범위 필터)
 * 장소 추가 화면과 숙소 폼이 같이 씁니다.
 *
 * 입력 → 타이머 → 요청이 모두 이벤트 핸들러 안에서 이어지도록 해서 effect 없이 동작합니다.
 */
export function usePlaceSearch(
  center: Center,
  /** 있으면 "여행지 주변" 대신 이 범위(러프 계획의 영역)에서 시작합니다. */
  areaBounds?: MapBounds | null,
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [attribution, setAttribution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PlaceSearchError | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [scope, setScope] = useState<SearchScope>(() =>
    areaBounds
      ? { kind: "view", bounds: areaBounds, source: "area" }
      : { kind: "nearby" },
  );
  const nearbyOnly = scope.kind === "nearby";
  // 서버에 자동완성(suggest)이 설정돼 있지 않으면 true가 됩니다.
  // 이때는 입력 중 요청을 보내지 않고, Enter/검색 버튼의 전체 검색(full)만 씁니다.
  const [suggestUnavailable, setSuggestUnavailable] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 새 요청이 시작되거나 입력이 바뀔 때마다 올라가서, 이전 요청의 응답을 버립니다.
  const version = useRef(0);
  // 마지막으로 보낸 검색 방식. "여행지 주변만"을 바꿨을 때 같은 방식으로 다시 찾습니다.
  const lastMode = useRef<SearchMode>("suggest");

  useEffect(() => {
    const pending = timer;
    const requests = version;
    return () => {
      if (pending.current) clearTimeout(pending.current);
      requests.current += 1;
    };
  }, []);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function reset() {
    version.current += 1;
    setResults([]);
    setAttribution("");
    setLoading(false);
    setHasSearched(false);
    setError(null);
  }

  async function run(raw: string, mode: SearchMode, area: SearchScope) {
    const trimmed = raw.trim();
    if (trimmed.length < 2) {
      reset();
      return;
    }

    const current = ++version.current;
    lastMode.current = mode;
    setLoading(true);
    setError(null);

    const useCenter =
      area.kind === "nearby" && center.lat !== null && center.lng !== null;

    try {
      const output = await searchPlaces(trimmed, {
        mode,
        ...(area.kind === "view" ? { bbox: area.bounds } : {}),
        ...(useCenter ? { nearLat: center.lat, nearLng: center.lng } : {}),
      });
      if (current !== version.current) return;
      setResults(output.items);
      setAttribution(output.attribution);
      setHasSearched(true);
    } catch (e) {
      if (current !== version.current) return;
      if (mode === "suggest" && e instanceof SearchServiceUnavailableError) {
        // 오류로 보여주지 않고, 이후로는 입력 중 자동완성을 건너뜁니다.
        setSuggestUnavailable(true);
        setResults([]);
        setAttribution("");
        setHasSearched(false);
        return;
      }
      setError(toSearchError(e));
      setResults([]);
      setAttribution("");
      setHasSearched(true);
    } finally {
      if (current === version.current) setLoading(false);
    }
  }

  /** 입력이 바뀔 때: 잠깐 기다렸다가 간단 검색(suggest). */
  function changeQuery(value: string) {
    setQuery(value);
    clearTimer();
    if (value.trim().length < 2) {
      reset();
      return;
    }
    version.current += 1;
    lastMode.current = "suggest";
    if (suggestUnavailable) {
      // 입력이 바뀌었으니 이전 결과와 오류는 치우고, Enter를 기다립니다.
      setResults([]);
      setAttribution("");
      setLoading(false);
      setHasSearched(false);
      setError(null);
      return;
    }
    timer.current = setTimeout(
      () => void run(value, "suggest", scope),
      PLACE_SEARCH_DEBOUNCE_MS,
    );
  }

  /** Enter / 검색 버튼 / 다시 시도: 기다리지 않고 전체 검색(full). */
  function submit() {
    clearTimer();
    void run(query, "full", scope);
  }

  /** "여행지 주변만" 버튼: 켜져 있으면 제한 없음으로, 그 외(제한 없음 / 현 지도 범위)에는 여행지 주변으로. */
  function toggleNearby() {
    const next: SearchScope = nearbyOnly
      ? { kind: "world" }
      : { kind: "nearby" };
    setScope(next);
    if (query.trim().length < 2) return;
    clearTimer();
    // 자동완성을 쓸 수 없는데 아직 검색을 확정하지 않았다면 기다립니다.
    if (suggestUnavailable && lastMode.current !== "full") return;
    void run(query, lastMode.current, next);
  }

  /**
   * "현 지도에서 검색": 지금 보이는 지도 범위 안에서 전체 검색(full)을 합니다.
   * 이후 입력 중 자동완성도 이 범위를 유지하고, "여행지 주변만"을 누르면 풀립니다.
   */
  function searchInView(bounds: MapBounds) {
    const next: SearchScope = { kind: "view", bounds };
    setScope(next);
    clearTimer();
    void run(query, "full", next);
  }

  /** 검색 결과를 모두 비웁니다. (장소를 골랐을 때) */
  function clearResults() {
    clearTimer();
    setQuery("");
    reset();
  }

  return {
    query,
    results,
    attribution,
    loading,
    error,
    hasSearched,
    nearbyOnly,
    searchScope: scope.kind,
    /** 영역에서 연 검색의 영역 범위 안에서 찾는 중인지 */
    inArea: scope.kind === "view" && scope.source === "area",
    suggestUnavailable,
    changeQuery,
    submit,
    toggleNearby,
    searchInView,
    clearResults,
  };
}
