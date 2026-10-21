"use client";

import { NativeSelect } from "@mantine/core";

export type WeatherScenario =
  | "live"
  | "stable"
  | "mixed"
  | "normal"
  | "low"
  | "stale"
  | "failed"
  | "empty"
  | "transit";

const OPTIONS: { value: WeatherScenario; label: string }[] = [
  { value: "live", label: "실제 API" },
  { value: "stable", label: "예보 안정" },
  { value: "mixed", label: "혼합" },
  { value: "normal", label: "전부 평년" },
  { value: "low", label: "저신뢰 예보" },
  { value: "stale", label: "낡은 예보" },
  { value: "failed", label: "실패" },
  { value: "empty", label: "위치 없음" },
  { value: "transit", label: "이동일 포함" },
];

export function WeatherScenarioPicker({
  value,
  onChange,
}: {
  value: WeatherScenario;
  onChange: (value: WeatherScenario) => void;
}) {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <NativeSelect
      aria-label="날씨 개발 시나리오"
      data={OPTIONS}
      value={value}
      onChange={(event) =>
        onChange(event.currentTarget.value as WeatherScenario)
      }
      size="xs"
      w={128}
    />
  );
}
