"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { Center, Loader } from "@mantine/core";
import { IconHome, IconPlane } from "@tabler/icons-react";

import type { Lodging, PlaceResult, Stop, TripPublic } from "@/types";
import { addDays } from "@/lib/date";
import { getDayColor } from "@/lib/dayColor";
import { uniqueAirportStops, type FlightStop } from "@/lib/flightStops";
import { findLodgingFor } from "@/lib/lodging";
import { DEFAULT_VIEW_STATE } from "@/constants/map";
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

type TripMapProps = {
  trip: TripPublic;
  stops: Stop[];
  lodgings: Lodging[];
  /** 항공편의 출발·도착 공항. 숙소처럼 항상 보이지만 지도 범위 맞춤에는 넣지 않습니다. */
  flightStops: FlightStop[];
  /** null이면 "전체" 탭: 모든 일차를 번호 마커로 보여주고 경로는 그리지 않습니다. */
  selectedDay: number | null;
  hoveredId: string | null;
  highlightedId: string | null;
  /** 검색 결과 / 숙소 위치 미리보기 */
  preview: PlaceResult | null;
  flyTo: FlyTarget | null;
  /** 패널·바텀시트에 가려지는 영역 */
  insets: MapInsets;
  /** 숙소 위치를 지도에서 직접 고르는 중 */
  pickMode: boolean;
  onMarkerClick: (markerId: string) => void;
  onMapClick: (lng: number, lat: number) => void;
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

export function TripMap({
  trip,
  stops,
  lodgings,
  flightStops,
  selectedDay,
  hoveredId,
  highlightedId,
  preview,
  flyTo,
  insets,
  pickMode,
  onMarkerClick,
  onMapClick,
}: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
  const hasFitted = useRef(false);
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

  const routes = useMemo(() => {
    if (selectedDay === null) return [];
    const coordinates = sortedStops
      .filter((stop) => stop.day_index === selectedDay)
      .map((stop) => [stop.lng, stop.lat] as [number, number]);
    return coordinates.length >= 2
      ? [{ dayIndex: selectedDay, coordinates }]
      : [];
  }, [sortedStops, selectedDay]);

  const fitKey =
    selectedDay === null
      ? "all"
      : `day${selectedDay}|${toKey(pointsOfDay(selectedDay, trip.start_date, stops, lodgings))}`;
  const lastFit = useRef<{ key: string; points: Point[] } | null>(null);
  const { top, right, bottom, left } = insets;

  const fitToScope = useEffectEvent((map: MapRef) => {
    let points: Point[];
    if (lastFit.current?.key === fitKey) {
      // 패널 크기만 바뀐 경우: 같은 범위를 새 여백으로 다시 맞춥니다.
      points = lastFit.current.points;
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

      {pins.map((pin) => {
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
