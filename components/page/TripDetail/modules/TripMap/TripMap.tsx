"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { Center, Loader } from "@mantine/core";
import { IconHome, IconPinFilled, IconPlane } from "@tabler/icons-react";

import type {
  Lodging,
  MapBounds,
  PlaceResult,
  Stop,
  TripArea,
  TripMode,
  TripPublic,
} from "@/types";
import { areaBounds } from "@/lib/areas";
import { addDays } from "@/lib/date";
import { getDayColor } from "@/lib/dayColor";
import { uniqueAirportStops, type FlightStop } from "@/lib/flightStops";
import { findLodgingFor } from "@/lib/lodging";
import { DEFAULT_VIEW_STATE } from "@/constants/map";
import { AreaLayer, type AreaEditControl } from "../AreaLayer";
import classes from "./TripMap.module.css";

const MapContainer = dynamic(() => import("@/components/common/MapContainer"), {
  ssr: false,
  loading: () => (
    <Center h="100%" role="status" aria-label="지도를 불러오는 중">
      <Loader size="sm" />
    </Center>
  ),
});

export type MapInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type FlyTarget = { lng: number; lat: number; zoom: number };

/** 러프 모드의 「장소 찾기」 결과 마커. 저장되지 않는 임시 표시입니다. */
export type FinderControl = {
  places: PlaceResult[];
  /** 고정해 둔 장소. 검색을 새로 해도 남고, 이름이 항상 보입니다. */
  pinned: PlaceResult[];
  /** 지금 고른 결과. 이 마커만 이름표가 붙고 강조됩니다. */
  activeId: string | null;
  /** false면 마커가 클릭을 받지 않습니다. (영역을 그리는 중에는 마커 위를 눌러도 지도가 눌려야 합니다) */
  interactive: boolean;
  onSelect: (place: PlaceResult) => void;
};
/** 이 범위가 보이도록 지도를 맞춥니다. (객체가 새로 만들어질 때마다 한 번 움직입니다) */
export type FitTarget = MapBounds;

type TripMapProps = {
  trip: TripPublic;
  stops: Stop[];
  lodgings: Lodging[];
  /** 러프 계획 영역 */
  areas: TripArea[];
  /**
   * 러프: 영역이 주인공이고 장소는 작은 회색 점으로 물러납니다.
   * 계획: 장소 마커가 주인공이고, 영역은 `showAreas`일 때 옅은 배경으로만 보입니다.
   */
  mode: TripMode;
  showAreas: boolean;
  /** 러프 모드에서 영역을 고르고 옮기는 데 쓰는 핸들러. 없으면 읽기 전용입니다. */
  areaEdit?: AreaEditControl;
  /** 항공편의 출발·도착 공항. 숙소처럼 항상 보이지만 지도 범위 맞춤에는 넣지 않습니다. */
  flightStops: FlightStop[];
  /** null이면 "전체" 탭: 모든 일차를 번호 마커로 보여주고 경로는 그리지 않습니다. */
  selectedDay: number | null;
  hoveredId: string | null;
  highlightedId: string | null;
  /** 검색 결과 / 숙소 위치 미리보기 */
  preview: PlaceResult | null;
  /** 러프 모드에서만 그립니다. */
  finder?: FinderControl;
  flyTo: FlyTarget | null;
  fitTo?: FitTarget | null;
  /** 패널·바텀시트에 가려지는 영역 */
  insets: MapInsets;
  /** 숙소 위치를 지도에서 직접 고르는 중 */
  pickMode: boolean;
  onMarkerClick: (markerId: string) => void;
  onMapClick: (lng: number, lat: number) => void;
  /**
   * 사용자가 직접 지도를 움직이면 패널·시트에 가리지 않는 영역의 범위를,
   * 코드로 움직인 경우(범위 맞춤, 결과로 이동)에는 null을 알립니다.
   * 공유 화면처럼 검색이 없는 곳에서는 생략합니다.
   */
  onViewChange?: (bounds: MapBounds | null) => void;
};

type Pin = {
  id: string;
  lng: number;
  lat: number;
  dayIndex: number;
  label: string;
  name: string;
  dimmed: boolean;
};

type Point = { lng: number; lat: number };

const toKey = (points: Point[]) =>
  points.map((p) => `${p.lng},${p.lat}`).join("|");

/** 점들을 감싸는 fitBounds용 범위. 점이 하나여도 너무 확대되지 않게 여유를 둡니다. */
function boundsOf(
  points: Point[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  const pad = 0.01;
  return [
    [Math.min(...lngs) - pad, Math.min(...lats) - pad],
    [Math.max(...lngs) + pad, Math.max(...lats) + pad],
  ];
}

/** 패널·시트에 가리지 않고 실제로 보이는 지도 범위. 가려진 영역이 너무 크면 화면 전체를 씁니다. */
function visibleBounds(map: MapRef, insets: MapInsets): MapBounds {
  const canvas = map.getCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const hidden =
    width - insets.right <= insets.left || height - insets.bottom <= insets.top;
  const { top, right, bottom, left } = hidden
    ? { top: 0, right: 0, bottom: 0, left: 0 }
    : insets;

  // 지도가 회전돼 있어도 네 모서리를 모두 보고 감싸는 사각형을 만듭니다.
  const corners = [
    map.unproject([left, top]),
    map.unproject([width - right, top]),
    map.unproject([width - right, height - bottom]),
    map.unproject([left, height - bottom]),
  ];
  const lngs = corners.map((corner) => corner.lng);
  const lats = corners.map((corner) => corner.lat);
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  return {
    west: clamp(Math.min(...lngs), -180, 180),
    south: clamp(Math.min(...lats), -90, 90),
    east: clamp(Math.max(...lngs), -180, 180),
    north: clamp(Math.max(...lats), -90, 90),
  };
}

/**
 * 한 일차에 맞출 점들: 그 일차의 장소 + 그날 밤 묵는 숙소(체크인 ≤ 그날 < 체크아웃).
 * 날짜가 없는 숙소는 어느 일차인지 알 수 없어 뺍니다.
 */
function pointsOfDay(
  day: number,
  startDate: string,
  stops: Stop[],
  lodgings: Lodging[],
): Point[] {
  const date = addDays(startDate, day);
  return [
    ...stops.filter((stop) => stop.day_index === day),
    ...lodgings.filter(
      (lodging) =>
        lodging.check_in &&
        lodging.check_out &&
        lodging.check_in <= date &&
        date < lodging.check_out,
    ),
  ];
}

/** 영역의 네 모서리. 지도 범위 맞춤에 쓸 점들입니다. */
function cornersOfAreas(areas: TripArea[]): Point[] {
  return areas.flatMap((area) => {
    const { west, south, east, north } = areaBounds(area);
    return [
      { lng: west, lat: south },
      { lng: east, lat: north },
    ];
  });
}

export function TripMap({
  trip,
  stops,
  lodgings,
  areas,
  mode,
  showAreas,
  areaEdit,
  flightStops,
  selectedDay,
  hoveredId,
  highlightedId,
  preview,
  finder,
  flyTo,
  fitTo,
  insets,
  pickMode,
  onMarkerClick,
  onMapClick,
  onViewChange,
}: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
  const hasFitted = useRef(false);
  // 지금 진행 중인 이동이 사용자가 한 것인지. (드래그·휠·+/- 버튼은 originalEvent가 있고, 코드로 한 이동은 없습니다)
  const userMoving = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const sortedStops = useMemo(
    () =>
      [...stops].sort(
        (a, b) => a.day_index - b.day_index || a.sort_order - b.sort_order,
      ),
    [stops],
  );

  // 숙소에서 만든 장소 → 그 숙소 마커의 id. 숙소는 상시 마커가 있어서 번호 마커를 따로 그리지 않습니다.
  const lodgingOfStop = useMemo(() => {
    const owners = new Map<string, string>();
    for (const stop of stops) {
      const lodging = findLodgingFor(stop, lodgings);
      if (lodging) owners.set(stop.id, `lodging-${lodging.id}`);
    }
    return owners;
  }, [stops, lodgings]);

  const pins = useMemo<Pin[]>(() => {
    const countByDay = new Map<number, number>();
    const result: Pin[] = [];
    for (const stop of sortedStops) {
      if (lodgingOfStop.has(stop.id)) continue; // 번호도 매기지 않습니다.
      const order = (countByDay.get(stop.day_index) ?? 0) + 1;
      countByDay.set(stop.day_index, order);
      const dimmed = selectedDay !== null && stop.day_index !== selectedDay;
      result.push({
        id: stop.id,
        lng: stop.lng,
        lat: stop.lat,
        dayIndex: stop.day_index,
        label: dimmed ? "" : String(order),
        name: stop.alias ?? stop.name,
        dimmed,
      });
    }
    return result;
  }, [sortedStops, selectedDay, lodgingOfStop]);

  const airportStops = useMemo(
    () => uniqueAirportStops(flightStops),
    [flightStops],
  );

  const rough = mode === "rough";

  const routes = useMemo(() => {
    // 러프 모드에서는 장소를 잇는 경로가 영역을 가려서 그리지 않습니다.
    if (rough || selectedDay === null) return [];
    const coordinates = sortedStops
      .filter((stop) => stop.day_index === selectedDay)
      .map((stop) => [stop.lng, stop.lat] as [number, number]);
    return coordinates.length >= 2
      ? [{ dayIndex: selectedDay, coordinates }]
      : [];
  }, [sortedStops, selectedDay, rough]);

  // 러프 모드에서는 (선택한 일차의) 영역들에 맞춥니다. 영역이 없으면 장소·숙소로 대신합니다.
  const roughPoints = useMemo(
    () =>
      rough
        ? cornersOfAreas(
            areas.filter(
              (area) => selectedDay === null || area.day_index === selectedDay,
            ),
          )
        : [],
    [rough, areas, selectedDay],
  );
  const fitAreas = roughPoints.length > 0;

  // 영역 키에는 좌표를 넣지 않습니다. 영역을 끌 때마다 지도가 따라 움직이면 안 되니까요.
  const fitKey = fitAreas
    ? `rough|${selectedDay ?? "all"}`
    : selectedDay === null
      ? "all"
      : `day${selectedDay}|${toKey(pointsOfDay(selectedDay, trip.start_date, stops, lodgings))}`;
  const lastFit = useRef<{ key: string; points: Point[] } | null>(null);
  const { top, right, bottom, left } = insets;

  const fitToScope = useEffectEvent((map: MapRef) => {
    let points: Point[];
    if (lastFit.current?.key === fitKey) {
      // 패널 크기만 바뀐 경우: 같은 범위를 새 여백으로 다시 맞춥니다.
      points = lastFit.current.points;
    } else if (fitAreas) {
      points = roughPoints;
    } else if (selectedDay !== null) {
      points = pointsOfDay(selectedDay, trip.start_date, stops, lodgings);
    } else {
      // 전체: 첫 진입이든 이후든 모든 장소와 숙소가 보이도록 맞춥니다.
      points = [...stops, ...lodgings];
    }

    const bounds = boundsOf(points);
    if (!bounds) return; // 맞출 점이 없으면 지도를 움직이지 않습니다.
    map.fitBounds(bounds, {
      padding: { top, right, bottom, left },
      maxZoom: 15,
      duration: hasFitted.current ? 600 : 0,
    });
    lastFit.current = { key: fitKey, points };
    hasFitted.current = true;
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    fitToScope(map);
  }, [mapReady, fitKey, top, right, bottom, left]);

  const flyToTarget = useEffectEvent((map: MapRef, target: FlyTarget) => {
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom,
      // 데스크톱 패널·모바일 바텀시트에 가리지 않는 영역의 가운데로 옮깁니다.
      padding: { top, right, bottom, left },
      duration: 800,
    });
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !flyTo) return;
    flyToTarget(map, flyTo);
  }, [mapReady, flyTo]);

  const fitToBounds = useEffectEvent((map: MapRef, target: FitTarget) => {
    map.fitBounds(
      [
        [target.west, target.south],
        [target.east, target.north],
      ],
      {
        padding: { top, right, bottom, left },
        maxZoom: 16,
        duration: 800,
      },
    );
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !fitTo) return;
    fitToBounds(map, fitTo);
  }, [mapReady, fitTo]);

  const initialViewState =
    trip.dest_lng !== null && trip.dest_lat !== null
      ? { longitude: trip.dest_lng, latitude: trip.dest_lat, zoom: 12 }
      : DEFAULT_VIEW_STATE;

  const previewColor = getDayColor(selectedDay ?? 0).hex;

  // 숙소에서 만든 장소를 가리키거나 눌렀을 때는 그 숙소 마커를 강조합니다.
  const markerOwner = (markerId: string | null) =>
    markerId === null ? null : (lodgingOfStop.get(markerId) ?? markerId);

  return (
    <MapContainer
      className={classes.map}
      initialViewState={initialViewState}
      mapRef={mapRef}
      showNavigation
      showGeolocate
      showScale
      mapProps={{
        cursor: pickMode ? "crosshair" : undefined,
        onLoad: () => setMapReady(true),
        onClick: (event) => {
          if (pickMode) onMapClick(event.lngLat.lng, event.lngLat.lat);
        },
        onMoveStart: (event) => {
          userMoving.current = Boolean(event.originalEvent);
        },
        onMoveEnd: () => {
          const map = mapRef.current;
          if (!map) return;
          if (!userMoving.current) {
            onViewChange?.(null);
            return;
          }
          userMoving.current = false;
          onViewChange?.(visibleBounds(map, insets));
        },
      }}
    >
      {routes.map((route) => (
        <Source
          key={`route-${route.dayIndex}`}
          id={`trip-route-${route.dayIndex}`}
          type="geojson"
          data={{
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: route.coordinates },
          }}
        >
          <Layer
            id={`trip-route-line-${route.dayIndex}`}
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": getDayColor(route.dayIndex).hex,
              "line-width": 3,
              "line-opacity": 0.7,
              "line-dasharray": [2, 1.5],
            }}
          />
        </Source>
      ))}

      {/* 영역이 없어도 러프 모드에서 첫 영역을 그리는 중이면 도구가 필요합니다. */}
      {(rough || showAreas) &&
        (areas.length > 0 || (rough && areaEdit?.addMode)) && (
          <AreaLayer
            areas={areas}
            selectedDay={selectedDay}
            variant={rough ? "rough" : "background"}
            edit={rough ? areaEdit : undefined}
          />
        )}

      {pins.map((pin) => {
        if (rough) {
          // 러프 모드: 영역 선택·드래그를 방해하지 않도록 클릭을 받지 않는 작은 점으로만 둡니다.
          return (
            <Marker
              key={pin.id}
              longitude={pin.lng}
              latitude={pin.lat}
              style={{ pointerEvents: "none" }}
            >
              <span
                className={classes.roughDot}
                style={
                  {
                    "--marker-color": getDayColor(pin.dayIndex).hex,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            </Marker>
          );
        }
        const highlight = hoveredId === pin.id || highlightedId === pin.id;
        const style = {
          "--marker-color": getDayColor(pin.dayIndex).hex,
        } as CSSProperties;
        return (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            // 물방울 모양의 뾰족한 끝이 좌표에 오도록 위로 올립니다.
            offset={pin.dimmed ? [0, 0] : [0, -20]}
            style={{ zIndex: highlight ? 2 : undefined }}
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onMarkerClick(pin.id);
            }}
          >
            <button
              type="button"
              className={pin.dimmed ? classes.dot : classes.pin}
              style={style}
              data-highlight={highlight || undefined}
              aria-label={
                pin.dimmed ? `${pin.name} 위치` : `${pin.label}번 ${pin.name}`
              }
            >
              {!pin.dimmed && (
                <span className={classes.pinLabel}>{pin.label}</span>
              )}
            </button>
          </Marker>
        );
      })}

      {lodgings.map((lodging) => {
        const id = `lodging-${lodging.id}`;
        const highlight =
          markerOwner(hoveredId) === id || markerOwner(highlightedId) === id;
        return (
          <Marker
            key={id}
            longitude={lodging.lng}
            latitude={lodging.lat}
            style={{ zIndex: highlight ? 2 : undefined }}
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onMarkerClick(id);
            }}
          >
            <button
              type="button"
              className={classes.lodging}
              data-highlight={highlight || undefined}
              aria-label={`숙소 ${lodging.name}`}
            >
              <IconHome size={14} stroke={2.5} aria-hidden="true" />
            </button>
          </Marker>
        );
      })}

      {airportStops.map((airport) => {
        const highlight =
          hoveredId === airport.markerId || highlightedId === airport.markerId;
        return (
          <Marker
            key={airport.markerId}
            longitude={airport.lng}
            latitude={airport.lat}
            style={{ zIndex: highlight ? 2 : undefined }}
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onMarkerClick(airport.markerId);
            }}
          >
            <button
              type="button"
              className={classes.airport}
              data-highlight={highlight || undefined}
              aria-label={`공항 ${airport.name}`}
            >
              <IconPlane size={14} stroke={2.5} aria-hidden="true" />
            </button>
          </Marker>
        );
      })}

      {rough &&
        finder?.places.map((place, index) => {
          // 고정한 장소는 아래에서 따로 그리니, 같은 자리에 겹쳐 그리지 않습니다.
          if (
            finder.pinned.some(
              (p) => p.provider_place_id === place.provider_place_id,
            )
          )
            return null;
          const active = place.provider_place_id === finder.activeId;
          return (
            <Marker
              key={place.provider_place_id}
              longitude={place.lng}
              latitude={place.lat}
              // 영역 핸들(10)보다 위, 이름표가 있는 마커는 가장 위에 놓습니다.
              style={{
                zIndex: active ? 12 : 6,
                pointerEvents: finder.interactive ? undefined : "none",
              }}
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                finder.onSelect(place);
              }}
            >
              <div className={classes.finderWrap}>
                <button
                  type="button"
                  className={classes.finder}
                  data-active={active || undefined}
                  aria-label={`${index + 1}번 ${place.name}`}
                >
                  {index + 1}
                </button>
                {active && (
                  <div className={classes.finderLabel}>{place.name}</div>
                )}
              </div>
            </Marker>
          );
        })}

      {rough &&
        finder?.pinned.map((place) => {
          const active = place.provider_place_id === finder.activeId;
          return (
            <Marker
              key={`pinned-${place.provider_place_id}`}
              longitude={place.lng}
              latitude={place.lat}
              style={{
                zIndex: active ? 12 : 8,
                pointerEvents: finder.interactive ? undefined : "none",
              }}
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                finder.onSelect(place);
              }}
            >
              <div className={classes.finderWrap}>
                <button
                  type="button"
                  className={classes.finderPin}
                  data-active={active || undefined}
                  aria-label={`고정한 장소 ${place.name}`}
                >
                  <IconPinFilled size={14} aria-hidden="true" />
                </button>
                <div className={classes.finderLabel}>{place.name}</div>
              </div>
            </Marker>
          );
        })}

      {preview && (
        <Marker longitude={preview.lng} latitude={preview.lat}>
          <div
            className={classes.preview}
            style={{ "--marker-color": previewColor } as CSSProperties}
            aria-hidden="true"
          />
        </Marker>
      )}
    </MapContainer>
  );
}
