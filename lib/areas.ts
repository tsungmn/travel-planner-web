import type { Feature, Polygon } from "geojson";

import type { MapBounds, Stop, TripArea } from "@/types";
import {
  AREA_MAX_RADIUS_M,
  AREA_MIN_RADIUS_M,
  DAY_OUTLINE_BUFFER_M,
} from "@/constants/area";
import { getDayColor } from "@/lib/dayColor";
import { haversineKm } from "@/lib/geo";

const EARTH_RADIUS_M = 6_371_008.8;
const METERS_PER_DEGREE_LAT = 111_320;
const UNASSIGNED_COLOR = "#6B7280";
const CIRCLE_STEPS = 64;

type LngLat = [number, number];
type Located = { lat: number; lng: number };

/* ───────── 표시 ───────── */

export function areaColor(dayIndex: number | null): string {
  return dayIndex === null ? UNASSIGNED_COLOR : getDayColor(dayIndex).hex;
}

export function areaDayLabel(dayIndex: number | null): string {
  return dayIndex === null ? "미지정" : `${dayIndex + 1}일차`;
}

export function areaTitle(area: Pick<TripArea, "label">): string {
  return area.label.trim() || "이름 없음";
}

/** 반경을 슬라이더 범위(100m ~ 5km)와 10m 단위에 맞춥니다. */
export function clampRadius(meters: number): number {
  const rounded = Math.round(meters / 10) * 10;
  return Math.max(AREA_MIN_RADIUS_M, Math.min(AREA_MAX_RADIUS_M, rounded));
}

/* ───────── 좌표 ───────── */

export const distanceM = (a: Located, b: Located) =>
  haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000;

/** 중심에서 `radiusM` 떨어진 곳을 도는 원의 꼭짓점. (닫힌 고리, 구면 계산) */
export function circleRing(
  center: Located,
  radiusM: number,
  steps = CIRCLE_STEPS,
): LngLat[] {
  const delta = radiusM / EARTH_RADIUS_M;
  const lat1 = (center.lat * Math.PI) / 180;
  const lng1 = (center.lng * Math.PI) / 180;
  const ring: LngLat[] = [];
  for (let i = 0; i < steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(delta) +
        Math.cos(lat1) * Math.sin(delta) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(delta) * Math.cos(lat1),
        Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2),
      );
    ring.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  ring.push(ring[0]);
  return ring;
}

export function areaPolygon(area: TripArea): Polygon {
  return {
    type: "Polygon",
    coordinates: [circleRing(area, area.radius_m)],
  };
}

/** 반경 끝(동쪽) 지점. 반경 조절 핸들이 놓입니다. */
export function areaEastPoint(area: TripArea): Located {
  const lngPerMeter =
    1 / (METERS_PER_DEGREE_LAT * Math.cos((area.lat * Math.PI) / 180));
  return { lat: area.lat, lng: area.lng + area.radius_m * lngPerMeter };
}

export function areaBounds(area: TripArea): MapBounds {
  const dLat = area.radius_m / METERS_PER_DEGREE_LAT;
  const dLng =
    area.radius_m /
    (METERS_PER_DEGREE_LAT * Math.cos((area.lat * Math.PI) / 180));
  return {
    west: area.lng - dLng,
    south: area.lat - dLat,
    east: area.lng + dLng,
    north: area.lat + dLat,
  };
}

/** 영역들을 모두 감싸는 범위. 영역이 없으면 null. */
export function areasBounds(areas: TripArea[]): MapBounds | null {
  if (areas.length === 0) return null;
  const all = areas.map(areaBounds);
  return {
    west: Math.min(...all.map((b) => b.west)),
    south: Math.min(...all.map((b) => b.south)),
    east: Math.max(...all.map((b) => b.east)),
    north: Math.max(...all.map((b) => b.north)),
  };
}

/** Andrew의 monotone chain. 점이 3개 미만이면 그대로 돌려줍니다. */
export function convexHull(points: LngLat[]): LngLat[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: LngLat, a: LngLat, b: LngLat) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const build = (input: LngLat[]) => {
    const chain: LngLat[] = [];
    for (const point of input) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      ) {
        chain.pop();
      }
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

/**
 * 한 일차 영역들을 감싸는 외곽선.
 * 볼록 껍질을 바깥으로 넓힌 모양은 "반경을 넓힌 원들의 볼록 껍질"과 같아서,
 * 별도 버퍼 계산 없이 원을 조금 키워서 껍질만 구합니다.
 */
export function dayOutline(
  dayAreas: TripArea[],
  bufferM = DAY_OUTLINE_BUFFER_M,
): Feature<Polygon> | null {
  if (dayAreas.length === 0) return null;
  const points = dayAreas.flatMap((area) =>
    circleRing(area, area.radius_m + bufferM, 48).slice(0, -1),
  );
  const hull = convexHull(points);
  if (hull.length < 3) return null;
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [[...hull, hull[0]]] },
  };
}

/** 외곽선 칩을 놓을 왼쪽 위 모서리. */
export function ringTopLeft(ring: LngLat[]): Located {
  return {
    lng: Math.min(...ring.map((p) => p[0])),
    lat: Math.max(...ring.map((p) => p[1])),
  };
}

/* ───────── 영역 ↔ 장소 ───────── */

export function isInArea(point: Located, area: TripArea): boolean {
  return distanceM(point, area) <= area.radius_m;
}

export function stopsInArea(area: TripArea, stops: Stop[]): Stop[] {
  return stops.filter((stop) => isInArea(stop, area));
}

/** 이 영역 안에 있으면서 영역과 다른 일차에 배정된 장소. (일차 미지정 영역은 세지 않습니다) */
export function stopsOfOtherDays(area: TripArea, stops: Stop[]): Stop[] {
  if (area.day_index === null) return [];
  return stopsInArea(area, stops).filter(
    (stop) => stop.day_index !== area.day_index,
  );
}

/**
 * 장소를 `dayIndex`에 넣을 때, 그 위치가 다른 일차 영역에만 들어 있으면
 * 그 일차들을 돌려줍니다. (러프 계획과 어긋나는 경우) 어긋나지 않으면 null.
 */
export function conflictingDays(
  point: Located,
  dayIndex: number,
  areas: TripArea[],
): number[] | null {
  const containing = areas.filter((area) => isInArea(point, area));
  if (containing.length === 0) return null;
  if (containing.some((area) => area.day_index === dayIndex)) return null;
  const days = new Set<number>();
  for (const area of containing) {
    if (area.day_index !== null) days.add(area.day_index);
  }
  return days.size > 0 ? [...days].sort((a, b) => a - b) : null;
}

/** 다른 일차 영역과 많이 겹치는지. (원이 서로 파고드는 깊이로 판단) */
export function overlapsOtherDay(area: TripArea, areas: TripArea[]): boolean {
  if (area.day_index === null) return false;
  return areas.some((other) => {
    if (other.id === area.id || other.day_index === null) return false;
    if (other.day_index === area.day_index) return false;
    return distanceM(area, other) < 0.7 * (area.radius_m + other.radius_m);
  });
}

/** 한 일차 영역 중심들 사이의 가장 먼 거리(km). */
export function daySpreadKm(dayAreas: TripArea[]): number {
  let max = 0;
  for (let i = 0; i < dayAreas.length; i++) {
    for (let j = i + 1; j < dayAreas.length; j++) {
      max = Math.max(
        max,
        haversineKm(
          dayAreas[i].lat,
          dayAreas[i].lng,
          dayAreas[j].lat,
          dayAreas[j].lng,
        ),
      );
    }
  }
  return max;
}
