"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Center, Loader } from "@mantine/core";
import { setWorkerUrl } from "maplibre-gl";
import Map, {
  GeolocateControl,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import type { MapProps, MapRef } from "react-map-gl/maplibre";
import type { ReactNode, Ref } from "react";

import type { StyleTransform } from "@/lib/transformStyle";
import { useMapStyle } from "@/hooks/useMapStyle";
import {
  DEFAULT_MAP_STYLE,
  DEFAULT_STYLE_TRANSFORMS,
  DEFAULT_VIEW_STATE,
} from "@/constants/map";
import classes from "./MapContainer.module.css";

setWorkerUrl("/maplibre-gl-worker.mjs");

interface MapContainerProps {
  id?: string;
  className?: string;
  mapStyle?: string;
  styleTransforms?: StyleTransform[];
  background?: string;
  initialViewState?: MapProps["initialViewState"];
  showNavigation?: boolean;
  showGeolocate?: boolean;
  showScale?: boolean;
  mapRef?: Ref<MapRef>;
  mapProps?: Omit<
    MapProps,
    "ref" | "style" | "mapStyle" | "initialViewState" | "children"
  >;
  children?: ReactNode;
}

export function MapContainer({
  id,
  className,
  mapStyle = DEFAULT_MAP_STYLE,
  styleTransforms = DEFAULT_STYLE_TRANSFORMS,
  background,
  initialViewState = DEFAULT_VIEW_STATE,
  showNavigation = true,
  showGeolocate = true,
  showScale = true,
  mapRef,
  mapProps,
  children,
}: MapContainerProps) {
  const style = useMapStyle(mapStyle, styleTransforms);

  if (!style) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  return (
    <div
      className={[classes.root, className].filter(Boolean).join(" ")}
      style={background ? { background } : undefined}
    >
      <Map
        {...mapProps}
        id={id}
        ref={mapRef}
        mapStyle={style}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
      >
        {showNavigation && <NavigationControl position="top-right" />}
        {showGeolocate && (
          <GeolocateControl
            position="top-right"
            trackUserLocation
            positionOptions={{ enableHighAccuracy: true }}
          />
        )}
        {showScale && <ScaleControl position="bottom-left" />}
        {children}
      </Map>
    </div>
  );
}

export default MapContainer;
