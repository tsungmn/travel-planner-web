import { Text } from "@mantine/core";

import type { Stop } from "@/types";
import { formatDistance, haversineKm } from "@/lib/geo";
import classes from "./DistanceSeparator.module.css";

/** 연속한 두 장소 사이의 직선 거리를 보여줍니다. */
export function DistanceSeparator({ from, to }: { from: Stop; to: Stop }) {
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return (
    <Text size="xs" c="dimmed" ta="center" className={classes.root}>
      ↓ {formatDistance(km)}
    </Text>
  );
}
