import { useEffect, useRef, useState } from "react";

import type { PlaceResult } from "@/types";
import { searchPlaces, SearchRateLimitError } from "@/lib/api";
import { PLACE_SEARCH_DEBOUNCE_MS } from "@/constants/search";

export type SearchStatus =
  "idle" | "loading" | "success" | "empty" | "error" | "rate-limit";

/** 여행지 검색(디바운스, 오래된 응답 무시)과 선택 상태를 관리합니다. */
export function useDestinationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [attribution, setAttribution] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  // 입력이 바뀌거나 장소를 고르면 올라가서, 이전 요청의 응답을 버립니다.
  const version = useRef(0);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const current = ++version.current;
    let active = true;
    const timer = setTimeout(async () => {
      if (!active || current !== version.current) return;
      setStatus("loading");
      try {
        const output = await searchPlaces(query.trim());
        if (!active || current !== version.current) return;
        setResults(output.items);
        setAttribution(output.attribution ?? "");
        setStatus(output.items.length ? "success" : "empty");
      } catch (error) {
        if (!active || current !== version.current) return;
        setResults([]);
        setAttribution("");
        setStatus(
          error instanceof SearchRateLimitError ? "rate-limit" : "error",
        );
      }
    }, PLACE_SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, selected]);

  function changeQuery(value: string) {
    ++version.current;
    setQuery(value);
    setSelected(null);
    setResults([]);
    setAttribution("");
    setStatus("idle");
  }

  function selectPlace(place: PlaceResult) {
    ++version.current;
    setSelected(place);
    setQuery(place.name);
    setResults([]);
    setStatus("idle");
  }

  return {
    query,
    results,
    attribution,
    status,
    selected,
    changeQuery,
    selectPlace,
  };
}
