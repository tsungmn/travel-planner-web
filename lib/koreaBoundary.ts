/**
 * 한국 국경선(남북 경계, DMZ) 처리 — 스타일 쪽 전부.
 *
 * ─ 무엇을 하려는 건가 ─
 * 기본 지도(OpenFreeMap Liberty)는 남북 경계를 일반 국경 실선으로 그린다.
 * 이걸 지우고, 확대(zoom >= 8)했을 때만 DMZ를 파선으로 보여주고 싶다.
 *
 * ─ 왜 한 번에 안 되나 ─
 * zoom < 5 타일은 홍콩, 마카오, 북중 국경, 남북 DMZ 같은 서로 다른 국경을
 * MultiLineString feature 하나로 묶어서 내려준다. 스타일 필터(`within`)는
 * feature 통째로만 판정하므로 DMZ 부분만 골라서 지울 수 없다.
 *
 * ─ 그래서 이렇게 나눠서 한다 ─
 * 1) [이 파일] 원본 국경 레이어(boundary_2, boundary_disputed)를 숨기고,
 *    같은 모양의 "복사 레이어"를 빈 GeoJSON 소스에 연결해 둔다.   → patchBoundaryLayers
 * 2) [KoreaBoundaryPatch 컴포넌트] 지도가 돌아가는 동안 원본 벡터 타일에서
 *    국경 선분을 읽어, DMZ 안에 있는 선분만 빼고 위 GeoJSON 소스에 채워 넣는다.
 *    (선분 단위로 자르는 stripLinesInArea가 여기서 쓰인다)
 * 3) [이 파일] zoom >= 8에서는 원본 타일을 그대로 써서 DMZ만 파선으로 그린다. → addDmzLayer
 *
 * 밖에서 쓰는 건 koreaBoundaryStyle() 하나다 (1 + 3을 한꺼번에 적용).
 * 이걸 쓰는 화면에는 반드시 <KoreaBoundaryPatch />도 같이 렌더링해야 한다.
 */

import type { LineLayerSpecification } from "maplibre-gl";
import type { StyleTransform } from "@/lib/transformStyle";

/* -------------------------------------------------------------------------- */
/*  타입                                                                       */
/* -------------------------------------------------------------------------- */

export type Position = number[];
export type LineStringGeometry = {
  type: "LineString";
  coordinates: Position[];
};
export type MultiLineStringGeometry = {
  type: "MultiLineString";
  coordinates: Position[][];
};
export type PolygonGeometry = { type: "Polygon"; coordinates: Position[][] };

/* -------------------------------------------------------------------------- */
/*  상수                                                                       */
/* -------------------------------------------------------------------------- */

/** DMZ를 포함하는 영역. 이 안에 완전히 들어가는 국경 선분을 DMZ로 본다. */
export const KOREA_DMZ_AREA: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [128.532662, 39.2427691],
      [125.0246148, 37.851722],
      [125.5511543, 36.9517462],
      [129.1843109, 38.3173438],
      [128.532662, 39.2427691],
    ],
  ],
};

/** 원본 국경선이 들어 있는 벡터 소스 / 소스 레이어 (Liberty 스타일 기준). */
export const KOREA_BOUNDARY_VECTOR_SOURCE_ID = "openmaptiles";
export const KOREA_BOUNDARY_SOURCE_LAYER = "boundary";

/** 이 줌을 기준으로 저배율(low) / 고배율(high) 복사 레이어를 나눈다. */
export const KOREA_BOUNDARY_SPLIT_ZOOM = 5;

/**
 * 복사 레이어 묶음. 저배율·고배율 구간마다 GeoJSON 소스를 따로 둔다.
 * 소스를 분리하는 이유는 저배율 데이터를 고배율 데이터로 덮어쓰지 않고
 * 유지하기 위해서다. layerIds는 [boundary_2용, boundary_disputed용] 순서.
 */
export const KOREA_BOUNDARY_BANDS = [
  {
    sourceId: "boundary-korea-patch-low-src",
    minzoom: 0,
    maxzoom: KOREA_BOUNDARY_SPLIT_ZOOM,
    sourceMaxzoom: 4,
    layerIds: ["boundary-korea-patch-low", "boundary-korea-patch-low-disputed"],
  },
  {
    sourceId: "boundary-korea-patch-high-src",
    minzoom: KOREA_BOUNDARY_SPLIT_ZOOM,
    maxzoom: 24,
    sourceMaxzoom: 18,
    layerIds: [
      "boundary-korea-patch-high",
      "boundary-korea-patch-high-disputed",
    ],
  },
] as const;

const ORIGINAL_LAYER_IDS = ["boundary_2", "boundary_disputed"] as const;

const DMZ_LAYER_ID = "boundary-korea-dmz-dashed";
const DMZ_MIN_ZOOM = 8;

/* -------------------------------------------------------------------------- */
/*  지오메트리 — KoreaBoundaryPatch 컴포넌트가 런타임에 사용                       */
/* -------------------------------------------------------------------------- */

/**
 * Ray-casting 점-폴리곤 판정. 외곽 링(구멍 없는 단순 폴리곤) 기준.
 * KOREA_DMZ_AREA처럼 작고 단순한 사각형 폴리곤이면 충분히 정확하다.
 */
function pointInRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function isFullyInside(line: Position[], polygon: Position[][]): boolean {
  return line.length > 0 && line.every((p) => pointInRing(p, polygon[0]));
}

/**
 * LineString/MultiLineString geometry를 부분 라인(sub-line) 단위로 쪼갠 뒤,
 * area 안에 "완전히" 들어간 부분 라인만 제거하고 나머지를 돌려준다.
 *
 * `within` 필터는 feature 전체 단위로만 판정되고 MultiLineString 자체를
 * 지원하지 않아서, 이 함수처럼 sub-line 단위로 직접 쪼개서 판정해야
 * 남북 경계 부분만 제거할 수 있다.
 */
export function stripLinesInArea(
  geometry: LineStringGeometry | MultiLineStringGeometry,
  area: PolygonGeometry,
): Position[][] {
  const lines =
    geometry.type === "MultiLineString"
      ? geometry.coordinates
      : [geometry.coordinates];
  return lines.filter((line) => !isFullyInside(line, area.coordinates));
}

/* -------------------------------------------------------------------------- */
/*  스타일 변환                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 원본 국경 레이어를 숨기고, 같은 모양의 복사 레이어를 빈 GeoJSON 소스에 연결한다.
 * GeoJSON 소스는 비어 있는 채로 시작하고, KoreaBoundaryPatch가 채운다.
 */
const patchBoundaryLayers: StyleTransform = (style) => {
  if (style.sources[KOREA_BOUNDARY_BANDS[0].sourceId]) {
    return style;
  }

  const sources = { ...style.sources };

  for (const band of KOREA_BOUNDARY_BANDS) {
    sources[band.sourceId] = {
      type: "geojson",
      maxzoom: band.sourceMaxzoom,
      data: {
        type: "FeatureCollection",
        features: [],
      },
    };
  }

  const layers: typeof style.layers = [];

  for (const layer of style.layers) {
    const index = ORIGINAL_LAYER_IDS.findIndex((id) => id === layer.id);

    if (layer.type !== "line" || index === -1) {
      layers.push(layer);
      continue;
    }

    // 원본 국경선은 모든 줌에서 숨긴다.
    layers.push({
      ...layer,
      layout: {
        ...layer.layout,
        visibility: "none",
      },
    });

    for (const band of KOREA_BOUNDARY_BANDS) {
      const minzoom = Math.max(layer.minzoom ?? 0, band.minzoom);
      const maxzoom = Math.min(layer.maxzoom ?? 24, band.maxzoom);

      if (minzoom >= maxzoom) continue;

      // 원본 필터·paint·layout·레이어 순서를 유지한다.
      const patch: LineLayerSpecification = {
        ...layer,
        id: band.layerIds[index],
        source: band.sourceId,
        minzoom,
        maxzoom,
      };

      delete patch["source-layer"];
      layers.push(patch);
    }
  }

  return {
    ...style,
    sources,
    layers,
  };
};

/**
 * zoom >= 8에서만 DMZ 경계를 파선으로 표시한다.
 *
 * GeoJSON 복사본이 아니라 원본 벡터 타일을 직접 사용하므로
 * KoreaBoundaryPatch의 갱신을 기다리지 않는다.
 */
const addDmzLayer: StyleTransform = (style) => {
  if (style.layers.some((layer) => layer.id === DMZ_LAYER_ID)) {
    return style;
  }

  const original = style.layers.find((layer) => layer.id === "boundary_2");

  if (!original || original.type !== "line") {
    return style;
  }

  const dmzLayer: LineLayerSpecification = {
    id: DMZ_LAYER_ID,
    type: "line",

    // 패치용 GeoJSON이 아닌 원본 벡터 소스를 사용한다.
    source: original.source,
    "source-layer": original["source-layer"],

    // 정확히 zoom 8부터 표시한다.
    minzoom: DMZ_MIN_ZOOM,

    filter: [
      "all",

      // 해상 경계 제외.
      ["!=", ["get", "maritime"], 1],

      // 기존 Liberty의 일반 국경·분쟁 경계 대상.
      [
        "any",
        [
          "all",
          ["==", ["get", "admin_level"], 2],
          ["!=", ["get", "disputed"], 1],
          ["!", ["has", "claimed_by"]],
        ],
        ["==", ["get", "disputed"], 1],
      ],

      // 고배율에서 DMZ 영역 안에 들어가는 경계만 표시.
      ["within", KOREA_DMZ_AREA],
    ],

    layout: {
      visibility: "visible",
      "line-cap": "butt",
      "line-join": "round",
    },

    paint: {
      "line-color": original.paint?.["line-color"] ?? "hsl(248,1%,41%)",

      "line-opacity": 0.85,

      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        1.2,
        12,
        1.8,
        16,
        2.4,
      ],

      // 선 길이 3 : 간격 2. 단위는 선 두께 기준.
      "line-dasharray": [3, 2],
    },
  };

  // 기존 국경선 위치에 삽입해 라벨 아래에 표시한다.
  let insertAt = 0;

  style.layers.forEach((layer, index) => {
    if (layer.id === "boundary_2" || layer.id === "boundary_disputed") {
      insertAt = index + 1;
    }
  });

  return {
    ...style,
    layers: [
      ...style.layers.slice(0, insertAt),
      dmzLayer,
      ...style.layers.slice(insertAt),
    ],
  };
};

/**
 * 한국 국경선 스타일 변환. DEFAULT_STYLE_TRANSFORMS에 한 번만 넣는다.
 * (원본 국경 숨김 + 복사 레이어 추가 → DMZ 파선 추가, 이 순서로 적용)
 */
export const koreaBoundaryStyle = (): StyleTransform => (style) =>
  addDmzLayer(patchBoundaryLayers(style));
