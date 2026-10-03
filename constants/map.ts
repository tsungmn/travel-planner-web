import { MapProps } from "react-map-gl/maplibre";
import { koreaBoundaryStyle } from "@/lib/koreaBoundary";
import {
  flatBuildings,
  hideLayers,
  overrideLabelText,
  StyleTransform,
} from "@/lib/transformStyle";

export const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const DEFAULT_VIEW_STATE: MapProps["initialViewState"] = {
  longitude: 127.8,
  latitude: 36.4,
  zoom: 6,
};

const LABEL_OVERRIDES: Record<string, string> = {
  "Sea of Japan": "East Sea\n동해",
  "Yellow Sea": "Yellow Sea\n황해",
  "East China Sea": "East China Sea",
  "South China Sea": "South China Sea",
  "South Korea": "Republic of Korea\n대한민국",
  "North Korea": "",
};

export const DEFAULT_STYLE_TRANSFORMS: StyleTransform[] = [
  flatBuildings(),

  overrideLabelText(/^(water_name|label_country)/, LABEL_OVERRIDES),

  koreaBoundaryStyle(),
];
