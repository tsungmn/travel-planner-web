"use client";

import { useEffect, useMemo, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { applyTransforms, type StyleTransform } from "@/lib/transformStyle";

const NO_TRANSFORMS: StyleTransform[] = [];

/**
 * 스타일 JSON을 URL당 한 번만 가져오고, 변환 목록을 적용한 결과를 돌려준다.
 * 준비되기 전까지는 undefined.
 *
 * `transforms`는 참조가 안정적이어야 한다 (모듈 상수이거나 useMemo).
 * 렌더마다 새 배열을 만들면 매번 스타일이 다시 적용된다.
 */
export function useMapStyle(
  url: string,
  transforms: StyleTransform[] = NO_TRANSFORMS,
) {
  const [base, setBase] = useState<StyleSpecification>();

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load map style: ${res.status}`);
        return res.json() as Promise<StyleSpecification>;
      })
      .then(setBase)
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });

    return () => controller.abort();
  }, [url]);

  return useMemo(
    () => (base ? applyTransforms(base, transforms) : undefined),
    [base, transforms],
  );
}
