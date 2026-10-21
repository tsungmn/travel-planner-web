import {
  IconSun,
  IconSunHigh,
  IconCloud,
  IconCloudFog,
  IconDroplet,
  IconCloudRain,
  IconCloudFilled,
  IconSnowflake,
  IconBolt,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

import type { WeatherCondition } from "./types";

type ConditionMeta = {
  /**
   * 날씨 아이콘은 일부러 색을 주지 않습니다(중립 회색). 일차 색(lib/dayColor.ts)과
   * 겹치면 "몇일차인지"와 헷갈리기 때문입니다. 색은 강수확률(우산)에만 씁니다.
   */
  icon: TablerIcon;
};

const CONDITION_META: Record<WeatherCondition, ConditionMeta> = {
  clear: { icon: IconSun },
  "mostly-clear": { icon: IconSunHigh },
  "partly-cloudy": { icon: IconCloud },
  cloudy: { icon: IconCloudFilled },
  fog: { icon: IconCloudFog },
  drizzle: { icon: IconDroplet },
  rain: { icon: IconCloudRain },
  showers: { icon: IconCloudRain },
  snow: { icon: IconSnowflake },
  thunderstorm: { icon: IconBolt },
};

export function getConditionMeta(
  condition?: WeatherCondition | null,
): ConditionMeta {
  return (
    CONDITION_META[condition ?? "partly-cloudy"] ??
    CONDITION_META["partly-cloudy"]
  );
}
