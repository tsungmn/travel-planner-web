"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Box, Button } from "@mantine/core";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import { IconAlertCircle } from "@tabler/icons-react";

import type {
  Flight,
  HiddenStop,
  Lodging,
  ShareOptions,
  SharedStop,
  Stop,
  TripArea,
  TripPublic,
} from "@/types";
import { getSharedTrip, getSharedTripWeather } from "@/lib/api";
import { useDevWeatherScenario } from "@/hooks/useDevWeatherScenario";
import { useTripWeather } from "@/hooks/useTripWeather";
import { isHiddenStop } from "@/lib/lodging";
import { isTripEnded } from "@/lib/weather";
import { useAirports } from "@/lib/airports";
import {
  buildFlightStops,
  isAirportMarkerId,
  type FlightStop,
} from "@/lib/flightStops";
import { getSheetHeight, useBottomSheet } from "@/hooks/useBottomSheet";
import { useDetailRoute } from "@/hooks/useDetailRoute";
import { DetailLoading, DetailMessage } from "@/components/common/DetailState";
import {
  TripMap,
  type FlyTarget,
  type MapInsets,
} from "@/components/common/TripMap";
import { SharePanel } from "./modules/SharePanel";
import { ShareTopBar } from "./modules/ShareTopBar";
import classes from "./SharedTrip.module.css";

type TripData = {
  trip: TripPublic;
  share: ShareOptions;
  stops: SharedStop[];
  lodgings: Lodging[];
  flights: Flight[];
  areas: TripArea[];
};

/** 데스크톱 왼쪽 패널 너비(px). SharedTrip.module.css의 .panel 너비(25rem)와 같아야 합니다. */
const PANEL_WIDTH_PX = 400;
const MAP_MARGIN_PX = 24;
const FOCUS_ZOOM = 14;
const AIRPORT_FOCUS_ZOOM = 11;

// 읽기 전용이라 지도를 눌러도 할 일이 없습니다.
const noop = () => {};

export function SharedTripClient({ token }: { token: string }) {
  return (
    <Suspense fallback={<DetailLoading header={<ShareTopBar />} />}>
      <SharedTripContent key={token} token={token} />
    </Suspense>
  );
}

function SharedTripContent({ token }: { token: string }) {
  const route = useDetailRoute();
  const isDesktop = useMediaQuery("(min-width: 48em)");
  const { ref: workspaceRef, height: workspaceHeight } =
    useElementSize<HTMLDivElement>();
  const sheetRef = useRef<HTMLElement | null>(null);
  const sheet = useBottomSheet(sheetRef, workspaceHeight);

  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(
    null,
  );
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);

  const pendingScrollId = useRef<string | null>(null);
  const stopListRef = useRef<HTMLDivElement>(null);

  // ----- 데이터 불러오기 -----

  // setState는 모두 Promise 콜백 안에서만 호출해 effect 안에서 동기 호출하지 않습니다.
  const fetchTrip = useCallback(
    () =>
      getSharedTrip(token)
        .then(setData)
        .catch(() => setError(true))
        .finally(() => setLoading(false)),
    [token],
  );

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  function retry() {
    setLoading(true);
    setError(false);
    fetchTrip();
  }

  // 지도에는 위치가 있는 장소만 그립니다. 숨겨진 숙소 자리는 경로를 끊는 데만 씁니다.
  const mapStops = useMemo(
    () => (data?.stops ?? []).filter((s): s is Stop => !isHiddenStop(s)),
    [data],
  );
  const hiddenStops = useMemo(
    () => (data?.stops ?? []).filter((s): s is HiddenStop => isHiddenStop(s)),
    [data],
  );

  // 마커 강조는 잠깐만 보여줍니다.
  useEffect(() => {
    if (!highlightedMarkerId) return;
    const timer = setTimeout(() => setHighlightedMarkerId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedMarkerId]);

  // 마커를 눌러 일차가 바뀌고 카드가 펼쳐진 뒤에 그 카드로 스크롤합니다.
  useEffect(() => {
    const target = pendingScrollId.current;
    if (!target) return;
    const element = stopListRef.current?.querySelector(
      `[data-stop-id="${target}"]`,
    );
    if (!element) return;
    pendingScrollId.current = null;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expandedStopId, route.selectedDay, data]);

  // 항공편이 있을 때만 공항 목록을 불러와, 출발·도착 공항을 일정에 붙입니다.
  const airports = useAirports({ enabled: (data?.flights.length ?? 0) > 0 });
  const airportIndex = airports.index;
  const flightStops = useMemo(
    () =>
      data && airportIndex
        ? buildFlightStops(data.trip, data.flights, airportIndex.byIata)
        : [],
    [data, airportIndex],
  );

  // 일차별 날씨. 공유 화면의 일정은 바뀌지 않으니 여행을 불러온 뒤 한 번만 받습니다.
  const loadWeather = useCallback(
    (signal: AbortSignal) => getSharedTripWeather(token, signal),
    [token],
  );
  // 개발 전용(운영 빌드에서는 mock도 선택 UI도 없음). 만들기 어려운 날씨 상태를 볼 때 씁니다.
  const { mock: mockWeather, picker: weatherScenarioPicker } =
    useDevWeatherScenario(data?.trip);
  const weather = useTripWeather(
    loadWeather,
    data && !isTripEnded(data.trip.end_date) ? token : null,
    mockWeather,
  );

  // ----- 화면 상태 계산 -----

  const selectedDay =
    route.selectedDay !== null && data && route.selectedDay < data.trip.num_days
      ? route.selectedDay
      : null;

  const insets: MapInsets = isDesktop
    ? {
        top: MAP_MARGIN_PX,
        right: MAP_MARGIN_PX,
        bottom: MAP_MARGIN_PX,
        left: PANEL_WIDTH_PX + MAP_MARGIN_PX,
      }
    : {
        top: MAP_MARGIN_PX,
        right: MAP_MARGIN_PX,
        bottom: getSheetHeight(sheet.snap, workspaceHeight) + MAP_MARGIN_PX,
        left: MAP_MARGIN_PX,
      };

  // ----- 지도 ↔ 목록 -----

  function handleFocusLodging(lodging: Lodging) {
    setFlyTo({ lng: lodging.lng, lat: lodging.lat, zoom: FOCUS_ZOOM });
    setHighlightedMarkerId(`lodging-${lodging.id}`);
  }

  function handleFocusFlightStop(stop: FlightStop) {
    setFlyTo({ lng: stop.lng, lat: stop.lat, zoom: AIRPORT_FOCUS_ZOOM });
    setHighlightedMarkerId(stop.markerId);
  }

  function handleMarkerClick(markerId: string) {
    setHighlightedMarkerId(markerId);
    if (markerId.startsWith("lodging-") || isAirportMarkerId(markerId)) return;

    const stop = data?.stops.find((s) => s.id === markerId);
    if (!stop) return;
    if (selectedDay !== stop.day_index) route.setDay(stop.day_index);
    setExpandedStopId(markerId);
    pendingScrollId.current = markerId;
    // 시트가 접혀 있으면 카드가 보이도록 펼칩니다.
    sheet.setSnap((snap) => (snap === 0 ? 1 : snap));
  }

  // ----- 렌더 -----

  if (loading) return <DetailLoading header={<ShareTopBar />} />;
  if (error)
    return (
      <DetailMessage
        header={<ShareTopBar />}
        icon={<IconAlertCircle size={36} />}
        title="여행을 불러오지 못했어요."
        action={<Button onClick={retry}>다시 시도</Button>}
      />
    );
  if (!data)
    return (
      <DetailMessage
        header={<ShareTopBar />}
        title="공유가 중단되었거나 링크를 찾을 수 없어요"
        description="링크가 만료되었거나 여행 공유가 꺼졌을 수 있어요."
        action={
          <Button component={Link} href="/" variant="default">
            홈으로
          </Button>
        }
      />
    );

  const { trip, share, stops, lodgings, flights, areas } = data;

  return (
    <Box className={classes.page}>
      <ShareTopBar />
      <Box ref={workspaceRef} className={classes.workspace}>
        {/* 데스크톱: 왼쪽 패널 / 모바일: 지도 위로 올라오는 바텀시트 */}
        <Box
          component="aside"
          ref={sheetRef}
          className={classes.panel}
          data-snap={sheet.snap}
        >
          <button
            type="button"
            className={classes.handle}
            aria-label="패널 크기 조절"
            {...sheet.handleProps}
          >
            <span />
          </button>
          <Box className={classes.panelBody}>
            {weatherScenarioPicker}
            <SharePanel
              trip={trip}
              share={share}
              stops={stops}
              lodgings={lodgings}
              flights={flights}
              flightStops={flightStops}
              weather={weather}
              selectedDay={selectedDay}
              expandedStopId={expandedStopId}
              hoveredStopId={hoveredId}
              listRef={stopListRef}
              onSelectDay={route.setDay}
              onToggleStop={(stopId) =>
                setExpandedStopId((current) =>
                  current === stopId ? null : stopId,
                )
              }
              onHoverStop={setHoveredId}
              onFocusLodging={handleFocusLodging}
              onFocusFlightStop={handleFocusFlightStop}
            />
          </Box>
        </Box>

        <Box className={classes.mapPane}>
          <TripMap
            trip={trip}
            stops={mapStops}
            hiddenStops={hiddenStops}
            lodgings={lodgings}
            // 공유 화면은 읽기 전용이라, 러프 영역은 계획 모드의 옅은 배경으로만 보여줍니다.
            areas={areas}
            mode="plan"
            showAreas
            flightStops={flightStops}
            selectedDay={selectedDay}
            hoveredId={hoveredId}
            highlightedId={highlightedMarkerId}
            preview={null}
            flyTo={flyTo}
            insets={insets}
            pickMode={false}
            onMarkerClick={handleMarkerClick}
            onMapClick={noop}
          />
        </Box>
      </Box>
    </Box>
  );
}
