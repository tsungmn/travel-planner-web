import { Text } from "@mantine/core";

/** 날씨 데이터 출처 표기. Open-Meteo는 출처를 밝히는 조건으로 쓸 수 있어서, 날씨가 보일 때만 넣습니다. */
export function WeatherAttribution({
  attribution,
}: {
  attribution: string | null;
}) {
  if (!attribution) return null;
  return (
    <Text size="xs" c="dimmed">
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit" }}
      >
        {attribution}
      </a>
    </Text>
  );
}
