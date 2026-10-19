import { Text } from "@mantine/core";

import type { SharedStop } from "@/types";
import { isHiddenStop } from "@/lib/lodging";
import { formatDistance, haversineKm } from "@/lib/geo";
import classes from "./DistanceSeparator.module.css";

/**
 * 연속한 두 장소 사이의 직선 거리를 보여줍니다.
 * 숨겨진 숙소가 끼면 위치를 알 수 없으니 거리는 빼고, 화살표(↓)만 보여줍니다.
 */
export function DistanceSeparator({
  from,
  to,
}: {
  from: SharedStop;
  to: SharedStop;
}) {
  if (isHiddenStop(from) || isHiddenStop(to)) {
    return (
      <Text
        size="xs"
        c="dimmed"
        ta="center"
        className={classes.root}
        aria-hidden="true"
      >
        ↓
      </Text>
    );
  }
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return (
    <Text size="xs" c="dimmed" ta="center" className={classes.root}>
      ↓ {formatDistance(km)}
    </Text>
  );
}
