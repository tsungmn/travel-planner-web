import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from "maplibre-gl";

/* -------------------------------------------------------------------------- */
/*  Core types                                                                */
/* -------------------------------------------------------------------------- */

/** 스타일을 받아 수정된 스타일을 돌려주는 함수. 배열로 쌓아서 순서대로 적용한다. */
export type StyleTransform = (style: StyleSpecification) => StyleSpecification;

/**
 * 레이어 선택 방법
 * - string: id가 정확히 일치
 * - string[]: id가 목록 중 하나와 일치 (예: ["poi_r1", "poi_r7"])
 * - RegExp: id가 정규식에 매칭 (예: /^poi/)
 * - function: 직접 만든 조건 (예: (l) => l.type === "symbol")
 */
export type LayerMatcher =
  string | string[] | RegExp | ((layer: LayerSpecification) => boolean);

function toPredicate(
  matcher: LayerMatcher,
): (layer: LayerSpecification) => boolean {
  if (typeof matcher === "string") return (layer) => layer.id === matcher;
  if (Array.isArray(matcher)) {
    const ids = new Set(matcher);
    return (layer) => ids.has(layer.id);
  }
  if (matcher instanceof RegExp) return (layer) => matcher.test(layer.id);
  return matcher;
}

/** 변환 목록을 순서대로 적용한다. */
export function applyTransforms(
  style: StyleSpecification,
  transforms: StyleTransform[],
): StyleSpecification {
  return transforms.reduce((acc, transform) => transform(acc), style);
}

/* -------------------------------------------------------------------------- */
/*  Building blocks - 새 변환을 만들 때 쓰는 기본 부품                           */
/* -------------------------------------------------------------------------- */

/** 모든 레이어를 한 번씩 훑으며 바꾼다. */
export const mapLayers =
  (fn: (layer: LayerSpecification) => LayerSpecification): StyleTransform =>
  (style) => ({ ...style, layers: style.layers.map(fn) });

/** 조건에 맞는 레이어만 바꾼다. */
export const updateLayers = (
  matcher: LayerMatcher,
  update: (layer: LayerSpecification) => LayerSpecification,
): StyleTransform => {
  const match = toPredicate(matcher);
  return mapLayers((layer) => (match(layer) ? update(layer) : layer));
};

/** 조건에 맞는 레이어를 스타일에서 제거한다. */
export const removeLayers =
  (matcher: LayerMatcher): StyleTransform =>
  (style) => {
    const match = toPredicate(matcher);
    return { ...style, layers: style.layers.filter((layer) => !match(layer)) };
  };

/** 조건에 맞는 레이어를 숨긴다 (visibility: none). */
export const hideLayers = (matcher: LayerMatcher): StyleTransform =>
  setLayout(matcher, { visibility: "none" });

/** 조건에 맞는 레이어의 paint 속성을 덮어쓴다. 지정한 키만 바뀌고 나머지는 유지된다. */
export function setPaint(
  matcher: LayerMatcher,
  paint: Record<string, unknown>,
): StyleTransform {
  return updateLayers(
    matcher,
    (layer) =>
      ({ ...layer, paint: { ...layer.paint, ...paint } }) as LayerSpecification,
  );
}

/** 조건에 맞는 레이어의 layout 속성을 덮어쓴다. */
export function setLayout(
  matcher: LayerMatcher,
  layout: Record<string, unknown>,
): StyleTransform {
  return updateLayers(
    matcher,
    (layer) =>
      ({
        ...layer,
        layout: { ...layer.layout, ...layout },
      }) as LayerSpecification,
  );
}

export function hideInArea(
  matcher: LayerMatcher,
  area: { type: "Polygon" | "MultiPolygon"; coordinates: unknown },
): StyleTransform {
  const exclude = ["!", ["within", area]] as unknown as ExpressionSpecification;
  return updateLayers(matcher, (layer) => {
    const existingFilter = (layer as { filter?: ExpressionSpecification })
      .filter;
    const filter = existingFilter
      ? (["all", existingFilter, exclude] as unknown as ExpressionSpecification)
      : exclude;
    return { ...layer, filter } as LayerSpecification;
  });
}

/**
 * 조건에 맞는 레이어에서 MultiLineString feature만 숨긴다 (LineString은 그대로 둔다).
 *
 * OpenMapTiles의 `boundary` 소스는 zoom<5(Natural Earth 구간)에서 서로 관련 없는
 * 국경 여러 개(예: 홍콩, 마카오, 북중 국경, 남북 DMZ)를 하나의 MultiLineString feature로
 * 묶어서 내려줄 때가 있다. `within` 필터는 feature 전체 단위로만 판정하고
 * MultiLineString 자체를 지원하지 않기 때문에, 이런 묶음은 hideInArea()로 걸러낼 수 없다.
 * 이 변환으로 그 묶음 feature를 통째로 숨기고, 실제로 남겨야 할 부분(예: 홍콩·마카오·
 * 북중 국경)은 KoreaBoundaryPatch 같은 런타임 컴포넌트로 다시 그려 넣는 방식과 짝을 이룬다.
 */
export const hideMultiLineString = (matcher: LayerMatcher): StyleTransform => {
  const exclude = [
    "!=",
    ["geometry-type"],
    "MultiLineString",
  ] as unknown as ExpressionSpecification;
  return updateLayers(matcher, (layer) => {
    const existingFilter = (layer as { filter?: ExpressionSpecification })
      .filter;
    const filter = existingFilter
      ? (["all", existingFilter, exclude] as unknown as ExpressionSpecification)
      : exclude;
    return { ...layer, filter } as LayerSpecification;
  });
};

/* -------------------------------------------------------------------------- */
/*  Presets                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * fill-extrusion(3D 건물) 레이어를 같은 위치의 2D fill 레이어로 바꾼다.
 * 레이어 id에 의존하지 않고 type으로 찾는다.
 * `...layer`로 펼치기 때문에 원본에 없는 키(filter, layout 등)는 그대로 없는 상태가 유지된다.
 */
export const flatBuildings = (): StyleTransform =>
  mapLayers((layer) => {
    if (layer.type !== "fill-extrusion") return layer;

    const paint = layer.paint ?? {};

    return {
      ...layer,
      type: "fill",
      paint: {
        "fill-color": paint["fill-extrusion-color"] ?? "#dddddd",
        "fill-opacity": paint["fill-extrusion-opacity"] ?? 1,
      },
    } as LayerSpecification;
  });

/** 지도를 globe로 렌더링한다 (MapLibre GL JS v5+). */
export const globe = (): StyleTransform => (style) => ({
  ...style,
  projection: { type: "globe" },
});

type SkySpecification = NonNullable<StyleSpecification["sky"]>;

/**
 * globe 테두리에 대기(glow)를 추가한다. 어두운 우주 배경 위에서 지구 가장자리가 은은하게 빛난다.
 * atmosphere-blend가 확대할수록 0으로 줄어서, 가까이 보면 평소 스타일로 돌아온다.
 * 넘긴 값만 기본값을 덮어쓴다: atmosphere({ "horizon-color": "#ffb37f" })
 */
export const atmosphere =
  (overrides: SkySpecification = {}): StyleTransform =>
  (style) => ({
    ...style,
    sky: {
      "sky-color": "#1b3a8a",
      "horizon-color": "#7fb2ff",
      "sky-horizon-blend": 0.6,
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        1,
        5,
        1,
        7,
        0,
      ],
      ...style.sky,
      ...overrides,
    } as SkySpecification,
  });

/**
 * 지도 라벨(text-field)의 글자를 특정 이름만 원하는 값으로 바꾼다. 나머지는 원래 표시 그대로다.
 * 예: overrideLabelText(/^water_name/, { "Sea of Japan": "동해" })
 *
 * @param matcher   바꿀 레이어 (예: 바다 이름은 /^water_name/)
 * @param overrides { 원래 이름: 표시할 글자 }. 원래 이름은 영문(name:latin) 기준으로 찾는다.
 * @param key       원래 이름을 읽는 표현식. 기본은 name:latin → name_en → name 순서.
 */
export function overrideLabelText(
  matcher: LayerMatcher,
  overrides: Record<string, string>,
  key: ExpressionSpecification = [
    "coalesce",
    ["get", "name:latin"],
    ["get", "name_en"],
    ["get", "name"],
  ],
): StyleTransform {
  const pairs = Object.entries(overrides).flat();
  if (pairs.length === 0) return (style) => style;

  return updateLayers(matcher, (layer) => {
    if (layer.type !== "symbol" || layer.layout?.["text-field"] === undefined) {
      return layer;
    }

    return {
      ...layer,
      layout: {
        ...layer.layout,
        // 표에 있으면 바꾼 글자, 없으면 원래 text-field 표현식 그대로
        "text-field": ["match", key, ...pairs, layer.layout["text-field"]],
      },
    } as unknown as LayerSpecification;
  });
}

/* -------------------------------------------------------------------------- */
/*  Overlays - 스타일 위에 내 데이터 레이어 얹기                                 */
/* -------------------------------------------------------------------------- */

interface OverlayOptions {
  sources?: Record<string, SourceSpecification>;
  layers: LayerSpecification[];
  /** true면 기본 스타일의 모든 레이어(라벨 포함) 위에 얹는다. 기본은 첫 라벨 레이어 바로 아래. */
  aboveLabels?: boolean;
}

/**
 * 글자를 그리는 symbol 레이어 (지명, POI 이름, 도로명, 도로 표지 등).
 * 일방통행 화살표처럼 아이콘만 그리는 symbol 레이어는 라벨로 보지 않는다.
 */
const isTextLabel = (layer: LayerSpecification) =>
  layer.type === "symbol" && layer.layout?.["text-field"] !== undefined;

/**
 * 소스와 레이어를 스타일에 추가한다.
 *
 * 기본 위치는 첫 라벨(글자) 레이어 바로 아래다. 도로, 다리, 건물, 경계선 같은 도형 레이어는 모두 그 아래에
 * 깔리고, 글자는 오버레이 위에 그대로 보인다.
 * 일방통행 화살표 같은 아이콘 전용 symbol 레이어는 라벨로 세지 않는다. (Liberty는 이 화살표 뒤에
 * 다리와 건물 레이어가 이어지는데, 화살표 기준으로 넣으면 그것들이 오버레이를 덮어 버린다.)
 * 라벨까지 덮으려면 aboveLabels: true.
 *
 * 오버레이를 여러 개 추가하면, 같은 위치끼리는 변환 목록에서 나중에 오는 것이 더 위에 그려진다.
 */
export const addOverlay =
  ({
    sources = {},
    layers,
    aboveLabels = false,
  }: OverlayOptions): StyleTransform =>
  (style) => {
    const firstLabel = style.layers.findIndex(isTextLabel);
    const index =
      aboveLabels || firstLabel === -1 ? style.layers.length : firstLabel;

    return {
      ...style,
      sources: { ...style.sources, ...sources },
      layers: [
        ...style.layers.slice(0, index),
        ...layers,
        ...style.layers.slice(index),
      ],
    };
  };
