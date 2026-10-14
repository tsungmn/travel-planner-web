"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Layer, Marker, Source, useMap } from "react-map-gl/maplibre";
import type { FeatureCollection, Polygon } from "geojson";
import type { MapMouseEvent } from "maplibre-gl";

import type { TripArea } from "@/types";
import { AREA_DEFAULT_RADIUS_M } from "@/constants/area";
import {
  areaColor,
  areaEastPoint,
  areaNorthPoint,
  areaPolygon,
  areaTitle,
  circleRing,
  clampRadius,
  dayOutline,
  distanceM,
  ringTopLeft,
} from "@/lib/areas";
import { formatDistance } from "@/lib/geo";
import classes from "./AreaLayer.module.css";

const OUTLINE_SOURCE = "trip-day-outlines";
const AREA_SOURCE = "trip-areas";
const AREA_FILL = "trip-area-fill";

export type AreaEditControl = {
  selectedId: string | null;
  /** 지도에서 새 영역을 그리는 중 (중심 클릭 → 반경 클릭) */
  addMode: boolean;
  onSelect: (id: string | null) => void;
  onAdd: (lat: number, lng: number, radiusM: number) => void;
  /** 드래그 중 계속 불립니다. 화면에만 반영하고, 저장은 `onCommit`에서 합니다. */
  onChange: (
    id: string,
    patch: Partial<Pick<TripArea, "lat" | "lng" | "radius_m">>,
  ) => void;
  /** 드래그를 마쳤을 때: 바뀐 내용을 바로 저장합니다. */
  onCommit: (id: string) => void;
};

type AreaLayerProps = {
  areas: TripArea[];
  /** 선택된 일차 탭. 다른 일차의 영역은 흐리게 합니다. null이면 전체. */
  selectedDay: number | null;
  /**
   * - rough: 영역이 주인공. 라벨, 일차 외곽선, 선택·편집 핸들을 보여줍니다.
   * - background: 계획 모드의 배경. 아주 옅은 원과 점선만 그리고 클릭은 받지 않습니다.
   */
  variant: "rough" | "background";
  /** 없으면 읽기 전용 (공유 화면) */
  edit?: AreaEditControl;
};

type Collection = FeatureCollection<Polygon>;

export function AreaLayer({
  areas,
  selectedDay,
  variant,
  edit,
}: AreaLayerProps) {
  const rough = variant === "rough";
  const selectedId = rough ? (edit?.selectedId ?? null) : null;

  const isDimmed = (dayIndex: number | null) =>
    selectedDay !== null && dayIndex !== selectedDay;

  const areaCollection = useMemo<Collection>(
    () => ({
      type: "FeatureCollection",
      features: areas.map((area) => ({
        type: "Feature",
        properties: {
          id: area.id,
          color: areaColor(area.day_index),
          selected: area.id === selectedId,
          dimmed: selectedDay !== null && area.day_index !== selectedDay,
        },
        geometry: areaPolygon(area),
      })),
    }),
    [areas, selectedId, selectedDay],
  );

  const outlines = useMemo(() => {
    if (!rough) return [];
    const byDay = new Map<number, TripArea[]>();
    for (const area of areas) {
      if (area.day_index === null) continue;
      byDay.set(area.day_index, [...(byDay.get(area.day_index) ?? []), area]);
    }
    return [...byDay].flatMap(([day, dayAreas]) => {
      const outline = dayOutline(dayAreas);
      return outline ? [{ day, outline }] : [];
    });
  }, [areas, rough]);

  const outlineCollection = useMemo<Collection>(
    () => ({
      type: "FeatureCollection",
      features: outlines.map(({ day, outline }) => ({
        ...outline,
        properties: {
          color: areaColor(day),
          dimmed: selectedDay !== null && day !== selectedDay,
        },
        geometry: outline.geometry,
      })),
    }),
    [outlines, selectedDay],
  );

  const selectedArea = areas.find((area) => area.id === selectedId) ?? null;
  const editable = rough && edit && !edit.addMode;

  return (
    <>
      <MapEvents areas={areas} variant={variant} edit={edit} />

      {rough && (
        <Source id={OUTLINE_SOURCE} type="geojson" data={outlineCollection}>
          <Layer
            id="trip-day-outline-fill"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": ["case", ["get", "dimmed"], 0.012, 0.035],
            }}
          />
          <Layer
            id="trip-day-outline-line"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": 2,
              "line-dasharray": [2, 3],
              "line-opacity": ["case", ["get", "dimmed"], 0.18, 0.48],
              "line-blur": 0.25,
            }}
          />
        </Source>
      )}

      <Source id={AREA_SOURCE} type="geojson" data={areaCollection}>
        <Layer
          id={AREA_FILL}
          type="fill"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": rough
              ? [
                  "case",
                  ["get", "dimmed"],
                  0.04,
                  ["get", "selected"],
                  0.22,
                  0.14,
                ]
              : ["case", ["get", "dimmed"], 0.02, 0.05],
          }}
        />
        {/* line-dasharray는 데이터에 따라 바꿀 수 없어서, 선택된 영역(실선)과 나머지(점선)를 레이어로 나눕니다. */}
        <Layer
          id="trip-area-line"
          type="line"
          filter={["!", ["get", "selected"]]}
          paint={{
            "line-color": ["get", "color"],
            "line-width": rough ? 2 : 1.5,
            "line-dasharray": [3, 2],
            "line-opacity": [
              "case",
              ["get", "dimmed"],
              rough ? 0.25 : 0.2,
              rough ? 1 : 0.5,
            ],
          }}
        />
        <Layer
          id="trip-area-line-selected"
          type="line"
          filter={["get", "selected"]}
          paint={{ "line-color": ["get", "color"], "line-width": 3 }}
        />
      </Source>

      {rough &&
        outlines.map(({ day, outline }) => {
          const corner = ringTopLeft(
            outline.geometry.coordinates[0] as [number, number][],
          );
          return (
            <Marker
              key={`day-chip-${day}`}
              longitude={corner.lng}
              latitude={corner.lat}
              anchor="bottom-left"
              style={{ pointerEvents: "none" }}
            >
              <div
                className={classes.dayChip}
                style={{ "--area-color": areaColor(day) } as CSSProperties}
                data-dimmed={isDimmed(day) || undefined}
              >
                {day + 1}일차
              </div>
            </Marker>
          );
        })}

      {rough &&
        areas.map((area) => {
          const selected = area.id === selectedId;
          const empty = area.label.trim() === "";
          const north = areaNorthPoint(area);
          return (
            <Marker
              key={`label-${area.id}`}
              longitude={north.lng}
              latitude={north.lat}
              anchor="bottom"
              offset={[0, -6]}
              style={{ pointerEvents: "none", zIndex: selected ? 5 : 3 }}
            >
              <div
                className={classes.label}
                style={
                  { "--area-color": areaColor(area.day_index) } as CSSProperties
                }
                data-selected={selected || undefined}
                data-empty={empty || undefined}
                data-dimmed={isDimmed(area.day_index) || undefined}
              >
                {areaTitle(area)}
              </div>
            </Marker>
          );
        })}

      {editable && selectedArea && <Handles area={selectedArea} edit={edit} />}

      {rough && edit?.addMode && <AddAreaTool onAdd={edit.onAdd} />}
    </>
  );
}

/* ───────── 영역 선택 (러프 모드의 지도 클릭) ───────── */

function MapEvents({
  areas,
  variant,
  edit,
}: Pick<AreaLayerProps, "areas" | "variant" | "edit">) {
  const { current: mapRef } = useMap();
  const active = variant === "rough" && !!edit && !edit.addMode;

  const handleClick = useEffectEvent((event: MapMouseEvent) => {
    const map = mapRef?.getMap();
    if (!map || !edit || !map.getLayer(AREA_FILL)) return;
    const hits = map.queryRenderedFeatures(event.point, {
      layers: [AREA_FILL],
    });
    // 겹친 곳을 눌렀을 때는 가장 작은 원을 고릅니다. (큰 원에 가려지지 않도록)
    const hit = hits
      .map((feature) =>
        areas.find((area) => area.id === feature.properties?.id),
      )
      .filter((area): area is TripArea => !!area)
      .sort((a, b) => a.radius_m - b.radius_m)[0];
    edit.onSelect(hit?.id ?? null);
  });

  const handleMove = useEffectEvent((event: MapMouseEvent) => {
    const map = mapRef?.getMap();
    if (!map || !map.getLayer(AREA_FILL)) return;
    const hovering =
      map.queryRenderedFeatures(event.point, { layers: [AREA_FILL] }).length >
      0;
    map.getCanvas().style.cursor = hovering ? "pointer" : "";
  });

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !active) return;
    const onClick = (event: MapMouseEvent) => handleClick(event);
    const onMove = (event: MapMouseEvent) => handleMove(event);
    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.getCanvas().style.cursor = "";
    };
  }, [mapRef, active]);

  return null;
}

/* ───────── 선택한 영역의 핸들 (이동 / 반경) ───────── */

function Handles({ area, edit }: { area: TripArea; edit: AreaEditControl }) {
  const style = { "--area-color": areaColor(area.day_index) } as CSSProperties;
  const east = areaEastPoint(area);

  return (
    <>
      <Marker
        longitude={area.lng}
        latitude={area.lat}
        draggable
        style={{ zIndex: 10 }}
        onClick={(event) => event.originalEvent.stopPropagation()}
        onDrag={(event) =>
          edit.onChange(area.id, {
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          })
        }
        onDragEnd={() => edit.onCommit(area.id)}
      >
        <div
          className={`${classes.handle} ${classes.handleMove}`}
          style={style}
          role="presentation"
        />
      </Marker>
      <Marker
        longitude={east.lng}
        latitude={east.lat}
        draggable
        style={{ zIndex: 10 }}
        onClick={(event) => event.originalEvent.stopPropagation()}
        onDrag={(event) =>
          edit.onChange(area.id, {
            radius_m: clampRadius(
              distanceM(area, { lat: event.lngLat.lat, lng: event.lngLat.lng }),
            ),
          })
        }
        onDragEnd={() => edit.onCommit(area.id)}
      >
        <div
          className={`${classes.handle} ${classes.handleResize}`}
          style={style}
          role="presentation"
        >
          <span className={classes.radiusBadge}>
            {formatDistance(area.radius_m / 1000)}
          </span>
        </div>
      </Marker>
    </>
  );
}

/* ───────── 새 영역 그리기 (중심 클릭 → 반경 클릭) ───────── */

type Center = { lat: number; lng: number };

/**
 * 추가 모드일 때만 마운트됩니다. 그래서 모드를 껐다 켜도 이전 중심점이 남지 않습니다.
 * 터치에는 마우스 이동이 없으니, 두 번째로 누른 지점까지의 거리가 반경이 됩니다.
 */
function AddAreaTool({ onAdd }: { onAdd: AreaEditControl["onAdd"] }) {
  const { current: mapRef } = useMap();
  const [center, setCenter] = useState<Center | null>(null);
  const [radius, setRadius] = useState(AREA_DEFAULT_RADIUS_M);

  const handleClick = useEffectEvent((event: MapMouseEvent) => {
    const point = { lat: event.lngLat.lat, lng: event.lngLat.lng };
    if (!center) {
      setCenter(point);
      setRadius(AREA_DEFAULT_RADIUS_M);
      return;
    }
    onAdd(center.lat, center.lng, clampRadius(distanceM(center, point)));
    setCenter(null);
  });

  const handleMove = useEffectEvent((event: MapMouseEvent) => {
    if (!center) return;
    setRadius(
      clampRadius(
        distanceM(center, { lat: event.lngLat.lat, lng: event.lngLat.lng }),
      ),
    );
  });

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onClick = (event: MapMouseEvent) => handleClick(event);
    const onMove = (event: MapMouseEvent) => handleMove(event);
    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.getCanvas().style.cursor = "crosshair";
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.getCanvas().style.cursor = "";
    };
  }, [mapRef]);

  const preview = useMemo<Collection>(
    () => ({
      type: "FeatureCollection",
      features: center
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [circleRing(center, radius)],
              },
            },
          ]
        : [],
    }),
    [center, radius],
  );

  if (!center) return null;
  return (
    <>
      <Source id="trip-area-preview" type="geojson" data={preview}>
        <Layer
          id="trip-area-preview-fill"
          type="fill"
          paint={{ "fill-color": "#6B7280", "fill-opacity": 0.1 }}
        />
        <Layer
          id="trip-area-preview-line"
          type="line"
          paint={{
            "line-color": "#6B7280",
            "line-width": 2,
            "line-dasharray": [3, 2],
            "line-opacity": 0.7,
          }}
        />
      </Source>
      <Marker
        longitude={center.lng}
        latitude={center.lat}
        style={{ pointerEvents: "none", zIndex: 8 }}
      >
        <div className={classes.previewDot} />
      </Marker>
    </>
  );
}
