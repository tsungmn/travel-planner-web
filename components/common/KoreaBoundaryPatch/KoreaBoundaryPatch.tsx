"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import {
  KOREA_BOUNDARY_BANDS,
  KOREA_BOUNDARY_SOURCE_LAYER,
  KOREA_BOUNDARY_SPLIT_ZOOM,
  KOREA_BOUNDARY_VECTOR_SOURCE_ID,
  KOREA_DMZ_AREA,
  stripLinesInArea,
  type LineStringGeometry,
  type MultiLineStringGeometry,
} from "@/lib/koreaBoundary";

type BoundaryFeature = {
  properties: Record<string, unknown> | null;
  geometry: LineStringGeometry | MultiLineStringGeometry;
};

type LineFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: LineStringGeometry;
};

type Snapshot = Map<string, LineFeature>;

type SourceEvent = {
  sourceId?: string;
  sourceDataType?: string;
};

type BandState = {
  source: GeoJSONSource;
  snapshot: Snapshot;
  ready: boolean;
  busy: boolean;
};

/**
 * DMZ 제거는 기존 함수를 그대로 사용한다.
 *
 * 전체 FeatureCollection을 stringify/parse하지 않고,
 * 속성과 좌표가 정확히 같은 선분을 키로 비교한다.
 */
function appendLines(snapshot: Snapshot, feature: BoundaryFeature) {
  const geometry = feature.geometry;

  if (geometry.type !== "LineString" && geometry.type !== "MultiLineString") {
    return;
  }

  const propertyKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(feature.properties ?? {}).sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0,
      ),
    ),
  );

  const properties = JSON.parse(propertyKey) as Record<string, unknown>;

  for (const coordinates of stripLinesInArea(geometry, KOREA_DMZ_AREA)) {
    if (coordinates.length < 2) continue;

    const key = propertyKey + "\n" + JSON.stringify(coordinates);

    if (snapshot.has(key)) continue;

    // MapLibre feature 객체를 넘기지 않고 필요한 값만 복사한다.
    snapshot.set(key, {
      type: "Feature",
      properties,
      geometry: {
        type: "LineString",
        coordinates: coordinates.map((position) => [...position]),
      },
    });
  }
}

/**
 * feature 조회 순서가 달라도 같은 데이터로 판단한다.
 * 전체 선분 정렬이나 전체 GeoJSON 직렬화는 하지 않는다.
 */
function sameSnapshot(a: Snapshot, b: Snapshot) {
  if (a.size !== b.size) return false;

  for (const key of a.keys()) {
    if (!b.has(key)) return false;
  }

  return true;
}

export function KoreaBoundaryPatch() {
  const { current } = useMap();

  useEffect(() => {
    const map = current?.getMap();
    if (!map) return;

    const states = new Map<string, BandState>();

    let disposed = false;
    let dirty = true;
    let lastBand = map.getZoom() < KOREA_BOUNDARY_SPLIT_ZOOM ? 0 : 1;

    const requestUpdate = () => {
      if (disposed) return;

      dirty = true;
      map.triggerRepaint();
    };

    /**
     * 지도 렌더 시점에는 카메라 변경에 따른 타일 선택이
     * 반영되어 있으므로 여기서 조회한다.
     *
     * dirty가 false면 조회·가공·setData 모두 하지 않는다.
     */
    const flush = () => {
      if (disposed || !dirty) return;

      const bandIndex = map.getZoom() < KOREA_BOUNDARY_SPLIT_ZOOM ? 0 : 1;
      const band = KOREA_BOUNDARY_BANDS[bandIndex];

      const source = map.getSource(band.sourceId) as GeoJSONSource | undefined;

      if (!source || !map.getSource(KOREA_BOUNDARY_VECTOR_SOURCE_ID)) {
        return;
      }

      let state = states.get(band.sourceId);

      if (!state || state.source !== source) {
        state = {
          source,
          snapshot: new Map(),
          ready: false,
          busy: false,
        };

        states.set(band.sourceId, state);
      }

      // 워커 작업이 진행 중이면 dirty를 유지한다.
      // 작업 완료 후 최신 상태를 한 번만 다시 조회한다.
      if (state.busy) return;

      dirty = false;

      const loaded = map.isSourceLoaded(KOREA_BOUNDARY_VECTOR_SOURCE_ID);

      // 이미 완성된 데이터가 있다면 타일 전환 도중의
      // 불완전한 결과로 덮어쓰지 않는다.
      //
      // 저배율 소스는 고배율 이동 중에도 그대로 유지된다.
      if (state.ready && !loaded) return;

      const next: Snapshot = new Map();
      let queriedCount = 0;
      let hasLayer = false;

      for (const layerId of band.layerIds) {
        if (!map.getLayer(layerId)) continue;

        hasLayer = true;

        // 원본 스타일에서 복사된 필터를 사용한다.
        const filter = map.getFilter(layerId);

        const features = map.querySourceFeatures(
          KOREA_BOUNDARY_VECTOR_SOURCE_ID,
          {
            sourceLayer: KOREA_BOUNDARY_SOURCE_LAYER,
            ...(filter ? { filter } : {}),
          },
        );

        queriedCount += features.length;

        for (const feature of features) {
          appendLines(next, feature as unknown as BoundaryFeature);
        }
      }

      if (!hasLayer) return;

      // 최초 로딩 중의 일시적인 빈 결과는 반영하지 않는다.
      if (!loaded && queriedCount === 0) return;

      if (sameSnapshot(state.snapshot, next)) {
        state.ready = loaded;
        return;
      }

      const target = state;
      target.busy = true;

      /**
       * MapLibre 6.x의 setData 완료를 기다린다.
       *
       * 그동안 원본 타일 이벤트가 여러 번 발생해도
       * 작업을 쌓지 않고 dirty 하나로 합친다.
       */
      void (async () => {
        try {
          await source.setData({
            type: "FeatureCollection",
            features: [...next.values()],
          });

          if (!disposed && states.get(band.sourceId) === target) {
            target.snapshot = next;

            // 최초 진입 중에는 후속 타일도 순차 반영한다.
            target.ready = loaded;
          }
        } catch (error) {
          if (!disposed && map.getSource(band.sourceId) === source) {
            console.error("Korea boundary update failed:", error);
          }
        } finally {
          target.busy = false;

          if (!disposed && dirty) {
            map.triggerRepaint();
          }
        }
      })();
    };

    const onSourceData = (event: SourceEvent) => {
      // 패치 자신의 데이터 이벤트는 무시한다.
      if (event.sourceId !== KOREA_BOUNDARY_VECTOR_SOURCE_ID) {
        return;
      }

      if (
        event.sourceDataType === "content" ||
        event.sourceDataType === "idle"
      ) {
        requestUpdate();
      }
    };

    const onZoom = () => {
      const band = map.getZoom() < KOREA_BOUNDARY_SPLIT_ZOOM ? 0 : 1;

      // 매 zoom 이벤트마다 경계선을 조회하지 않는다.
      if (band !== lastBand) {
        lastBand = band;
        requestUpdate();
      }
    };

    const onStyleData = () => {
      for (const band of KOREA_BOUNDARY_BANDS) {
        const state = states.get(band.sourceId);
        const source = map.getSource(band.sourceId);

        if (state?.source === source) continue;

        states.delete(band.sourceId);

        if (source) {
          states.set(band.sourceId, {
            source: source as GeoJSONSource,
            snapshot: new Map(),
            ready: false,
            busy: false,
          });

          requestUpdate();
        }
      }
    };

    const onStyleLoad = () => {
      states.clear();
      requestUpdate();
    };

    map.on("render", flush);
    map.on("sourcedata", onSourceData);
    map.on("zoom", onZoom);
    map.on("moveend", requestUpdate);
    map.on("styledata", onStyleData);
    map.on("style.load", onStyleLoad);

    requestUpdate();

    return () => {
      disposed = true;

      map.off("render", flush);
      map.off("sourcedata", onSourceData);
      map.off("zoom", onZoom);
      map.off("moveend", requestUpdate);
      map.off("styledata", onStyleData);
      map.off("style.load", onStyleLoad);

      states.clear();
    };
  }, [current]);

  return null;
}
