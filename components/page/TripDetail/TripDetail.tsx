"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { notFound, useRouter } from "next/navigation";
import { Box, Button, Group, Text } from "@mantine/core";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";

import type { Flight, Lodging, PlaceResult, Stop, Trip } from "@/types";
import {
  createFlight,
  createLodging,
  createStop,
  deleteFlight,
  deleteLodging,
  deleteStop,
  deleteTrip,
  disableShare,
  enableShare,
  getTrip,
  getUser,
  reorderStops,
  updateFlight,
  updateLodging,
  updateStop,
  updateTrip,
  type UserInfo,
} from "@/lib/api";
import { ApiError } from "@/lib/http";
import { useAirports } from "@/lib/airports";
import {
  buildFlightStops,
  isAirportMarkerId,
  type FlightStop,
} from "@/lib/flightStops";
import { Header } from "@/components/common/Header";
import { MAX_FLIGHTS_PER_TRIP, MAX_TRIP_DAYS } from "@/constants/trip";
import classes from "./TripDetail.module.css";
import { useDetailRoute } from "./hooks/useDetailRoute";
import {
  getSheetHeight,
  useBottomSheet,
  type SheetSnap,
} from "./hooks/useBottomSheet";
import { DetailLoading, DetailMessage } from "./modules/DetailState";
import { SubScreen } from "./modules/SubScreen";
import { TripMap, type FlyTarget, type MapInsets } from "./modules/TripMap";
import { TripPanel, type SaveStatus } from "./modules/TripPanel";
import type { FlightFormData } from "./modules/FlightForm";
import type { LodgingFormData } from "./modules/LodgingForm";
import type { TripEditFormData } from "./modules/TripEditForm";

type TripData = {
  trip: Trip;
  stops: Stop[];
  lodgings: Lodging[];
  flights: Flight[];
};

type Coords = { lng: number; lat: number };

const MAP_MARGIN_PX = 24;
const FOCUS_ZOOM = 14;
const AIRPORT_FOCUS_ZOOM = 11;

/** 메모와 별칭은 입력이 이 시간 동안 멈추면 저장합니다. */
const TEXT_SAVE_DELAY_MS = 700;

type StopTextField = "memo" | "alias";

/** 빈 값은 서버에 null로 보내 지웁니다. */
function textPatch(field: StopTextField, value: string) {
  return field === "alias"
    ? { alias: value.trim() || null }
    : { memo: value || null };
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "network_error":
        return "네트워크에 연결할 수 없어요. 연결을 확인해 주세요.";
      case "too_many_stops":
        return "이 여행에는 장소를 더 추가할 수 없어요.";
      case "too_many_flights":
        return "이 여행에는 항공편을 더 추가할 수 없어요.";
      case "too_many_lodgings":
        return "이 여행에는 숙소를 더 추가할 수 없어요.";
      case "stops_out_of_range":
        return "줄어든 기간을 벗어나는 일차에 장소가 있어요. 장소를 옮기거나 지운 뒤 다시 시도해 주세요.";
      case "day_out_of_range":
        return "여행 기간을 벗어나는 일차예요.";
      case "invalid_dates":
        return `날짜를 확인해 주세요. 종료일은 시작일 이후여야 하고, 최대 ${MAX_TRIP_DAYS}일까지 가능해요.`;
      case "unauthorized":
        return "로그인이 만료됐어요. 다시 로그인해 주세요.";
      case "not_found":
        return "이미 삭제되었거나 찾을 수 없는 항목이에요. 화면을 새로 고쳐 주세요.";
      case "validation_error":
        return "입력한 내용이 올바르지 않아 저장하지 못했어요.";
    }
    if (error.status >= 500) {
      return "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    }
  }
  return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

const nextSortOrder = (stops: Stop[], day: number) =>
  stops
    .filter((stop) => stop.day_index === day)
    .reduce((max, stop) => Math.max(max, stop.sort_order), -1) + 1;

export function TripDetailClient({ id }: { id: string }) {
  return (
    <Suspense fallback={<DetailLoading />}>
      <TripDetailContent key={id} id={id} />
    </Suspense>
  );
}

function TripDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const route = useDetailRoute();
  const isDesktop = useMediaQuery("(min-width: 48em)");
  const { ref: workspaceRef, height: workspaceHeight } =
    useElementSize<HTMLDivElement>();
  const sheetRef = useRef<HTMLElement | null>(null);
  const sheet = useBottomSheet(sheetRef, workspaceHeight);

  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [user, setUser] = useState<UserInfo>({ name: "", email: "" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(
    null,
  );
  const [newStopId, setNewStopId] = useState<string | null>(null);

  const [preview, setPreview] = useState<PlaceResult | null>(null);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [pickActive, setPickActive] = useState(false);

  const newStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickCallback = useRef<((coords: Coords) => void) | null>(null);
  const pendingScrollId = useRef<string | null>(null);
  const stopListRef = useRef<HTMLDivElement>(null);

  // ----- 데이터 불러오기 -----

  useEffect(() => {
    let active = true;
    getUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // setState는 모두 Promise 콜백 안에서만 호출해 effect 안에서 동기 호출하지 않습니다.
  const fetchTrip = useCallback(
    () =>
      getTrip(id)
        .then((result) =>
          setData(
            result
              ? {
                  trip: result.trip,
                  stops: result.stops,
                  lodgings: result.lodgings,
                  flights: result.flights,
                }
              : null,
          ),
        )
        .catch(() => setError(true))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    fetchTrip();
    return () => {
      if (newStopTimer.current) clearTimeout(newStopTimer.current);
    };
  }, [fetchTrip]);

  function retry() {
    setLoading(true);
    setError(false);
    fetchTrip();
  }

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

  // ----- 저장 -----

  // 저장 요청은 한 줄로 세워 차례대로 보냅니다. (장소 추가 → 순서 저장처럼 앞 결과에 기대는 요청이 있어서)
  // 실패하면 안내를 띄우고, 남은 요청이 끝난 뒤 서버 상태로 다시 불러와 화면을 되돌립니다.
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSaves = useRef(0);
  const anyFailed = useRef(false);
  // 저장 버튼을 연달아 눌러도 같은 항목이 두 번 만들어지지 않게 합니다.
  const formBusy = useRef(false);
  const dataRef = useRef<TripData | null>(null);
  // 입력 중인 메모/별칭. 입력이 멈추면 한 번만 저장합니다. (키: `${field}:${stopId}`)
  const textQueue = useRef(
    new Map<
      string,
      {
        timer: ReturnType<typeof setTimeout>;
        stopId: string;
        field: StopTextField;
        value: string;
      }
    >(),
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const reload = useCallback(async () => {
    try {
      const result = await getTrip(id);
      if (result) setData(result);
    } catch {
      // 다시 불러오지 못해도 화면은 그대로 둡니다. 저장 상태 표시가 "저장 실패"로 남습니다.
    }
  }, [id]);

  /** 성공하면 작업의 결과를, 실패하면 null을 돌려줍니다. */
  const save = useCallback(
    <T,>(task: () => Promise<T>): Promise<T | null> => {
      pendingSaves.current += 1;
      setSaveStatus("saving");
      const result = saveQueue.current.then(async () => {
        try {
          return await task();
        } catch (error) {
          anyFailed.current = true;
          notifications.show({
            message: saveErrorMessage(error),
            color: "red",
          });
          return null;
        } finally {
          pendingSaves.current -= 1;
          if (pendingSaves.current === 0) {
            const failed = anyFailed.current;
            anyFailed.current = false;
            if (failed) await reload();
            setSaveStatus(failed ? "error" : "saved");
          }
        }
      });
      saveQueue.current = result;
      return result;
    },
    [reload],
  );

  // 화면을 떠날 때 아직 보내지 않은 메모/별칭을 보냅니다.
  useEffect(() => {
    const queued = textQueue.current;
    return () => {
      for (const entry of queued.values()) {
        clearTimeout(entry.timer);
        void updateStop(
          id,
          entry.stopId,
          textPatch(entry.field, entry.value),
        ).catch(() => undefined);
      }
      queued.clear();
    };
  }, [id]);

  const patchData = useCallback(
    (updater: (current: TripData) => TripData) =>
      setData((current) => (current ? updater(current) : current)),
    [],
  );

  const patchStops = useCallback(
    (updater: (stops: Stop[]) => Stop[]) =>
      patchData((current) => ({ ...current, stops: updater(current.stops) })),
    [patchData],
  );

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

  // ----- 화면 상태 계산 -----

  const selectedDay =
    route.selectedDay !== null && data && route.selectedDay < data.trip.num_days
      ? route.selectedDay
      : null;
  const subView = route.view;
  // 지도 선택 모드는 숙소 폼이나 장소 검색이 열려 있을 때만 유효합니다.
  const pickMode =
    pickActive && (subView === "lodging" || subView === "search");
  const visiblePreview =
    subView === "search" || subView === "lodging" ? preview : null;

  // 서브 화면이 열리면 시트 높이가 따로 정해지고, 닫으면 사용자가 둔 단계로 돌아옵니다.
  const sheetSnap: SheetSnap = subView
    ? subView === "search" || subView === "lodging"
      ? 1
      : 2
    : sheet.snap;

  const insets: MapInsets = isDesktop
    ? {
        top: MAP_MARGIN_PX,
        right: MAP_MARGIN_PX,
        bottom: MAP_MARGIN_PX,
        left: MAP_MARGIN_PX,
      }
    : {
        top: MAP_MARGIN_PX,
        right: MAP_MARGIN_PX,
        bottom: getSheetHeight(sheetSnap, workspaceHeight) + MAP_MARGIN_PX,
        left: MAP_MARGIN_PX,
      };

  // ----- 장소 -----

  /** 추가에 성공하면 true를 돌려줍니다. (실패 안내는 save()가 띄웁니다) */
  async function handleAddPlace(
    place: PlaceResult,
    dayIndex: number,
  ): Promise<boolean> {
    if (!data || dayIndex < 0 || dayIndex >= data.trip.num_days) return false;
    const created = await save(() =>
      createStop(id, {
        day_index: dayIndex,
        name: place.name,
        alias: null,
        address_text: place.address_text,
        lat: place.lat,
        lng: place.lng,
        provider: place.provider,
        provider_place_id: place.provider_place_id,
        memo: null,
      }),
    );
    if (!created) return false;
    patchStops((stops) => [...stops, created]);
    setNewStopId(created.id);
    if (newStopTimer.current) clearTimeout(newStopTimer.current);
    newStopTimer.current = setTimeout(() => setNewStopId(null), 1500);
    setPreview(null);
    notifications.show({
      message: `${dayIndex + 1}일차에 추가했어요.`,
      color: "teal",
    });
    return true;
  }

  // 메모와 별칭은 입력할 때마다 화면에 반영하고, 입력이 잠시 멈추면 한 번만 저장합니다.
  function editStopText(stopId: string, field: StopTextField, value: string) {
    patchStops((stops) =>
      stops.map((stop) => {
        if (stop.id !== stopId) return stop;
        return field === "alias"
          ? { ...stop, alias: value.trim() ? value : null }
          : { ...stop, memo: value };
      }),
    );
    const queued = textQueue.current;
    const key = `${field}:${stopId}`;
    const previous = queued.get(key);
    if (previous) clearTimeout(previous.timer);
    const timer = setTimeout(() => {
      queued.delete(key);
      void save(() => updateStop(id, stopId, textPatch(field, value)));
    }, TEXT_SAVE_DELAY_MS);
    queued.set(key, { timer, stopId, field, value });
  }

  const handleMemo = (stopId: string, memo: string) =>
    editStopText(stopId, "memo", memo);
  const handleAlias = (stopId: string, alias: string) =>
    editStopText(stopId, "alias", alias);

  /** 삭제 취소: 장소를 다시 만들고, 지워지기 전 순서로 되돌립니다. */
  async function restoreStop(deleted: Stop, index: number) {
    const created = await save(() =>
      createStop(id, {
        day_index: deleted.day_index,
        name: deleted.name,
        alias: deleted.alias,
        address_text: deleted.address_text,
        lat: deleted.lat,
        lng: deleted.lng,
        provider: deleted.provider,
        provider_place_id: deleted.provider_place_id,
        memo: deleted.memo,
      }),
    );
    if (!created) return;

    const sameDay = (dataRef.current?.stops ?? [])
      .filter((stop) => stop.day_index === deleted.day_index)
      .sort((a, b) => a.sort_order - b.sort_order);
    const ordered = [...sameDay];
    ordered.splice(Math.min(index, ordered.length), 0, created);
    const renumbered = ordered.map((stop, order) => ({
      ...stop,
      sort_order: order,
    }));
    patchStops((stops) => [
      ...stops.filter((stop) => stop.day_index !== deleted.day_index),
      ...renumbered,
    ]);
    if (index < sameDay.length) {
      void save(() =>
        reorderStops(
          id,
          renumbered.map(({ id: stopId, day_index, sort_order }) => ({
            id: stopId,
            day_index,
            sort_order,
          })),
        ),
      );
    }
  }

  async function handleDeleteStop(stopId: string) {
    const deleted = data?.stops.find((stop) => stop.id === stopId);
    if (!data || !deleted) return;
    const index = data.stops
      .filter((stop) => stop.day_index === deleted.day_index)
      .sort((a, b) => a.sort_order - b.sort_order)
      .findIndex((stop) => stop.id === stopId);

    for (const field of ["memo", "alias"] as const) {
      const key = `${field}:${stopId}`;
      const queuedText = textQueue.current.get(key);
      if (queuedText) {
        clearTimeout(queuedText.timer);
        textQueue.current.delete(key);
      }
    }
    patchStops((stops) => stops.filter((stop) => stop.id !== stopId));
    setExpandedStopId(null);

    const done = await save(async () => {
      await deleteStop(id, stopId);
      return true;
    });
    if (!done) return;

    const notificationId = `undo-${stopId}`;
    notifications.show({
      id: notificationId,
      color: "teal",
      autoClose: 6000,
      message: (
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="sm">장소를 삭제했어요.</Text>
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => {
              notifications.hide(notificationId);
              void restoreStop(deleted, index);
            }}
          >
            실행 취소
          </Button>
        </Group>
      ),
    });
  }

  function handleMoveStop(stopId: string, day: number) {
    if (!data) return;
    const order = nextSortOrder(data.stops, day);
    patchStops((stops) =>
      stops.map((stop) =>
        stop.id === stopId
          ? { ...stop, day_index: day, sort_order: order }
          : stop,
      ),
    );
    route.setDay(day);
    void save(() =>
      reorderStops(id, [{ id: stopId, day_index: day, sort_order: order }]),
    );
  }

  function handleReorder(reordered: Stop[]) {
    if (selectedDay === null) return;
    const day = selectedDay;
    patchStops((stops) => [
      ...stops.filter((stop) => stop.day_index !== day),
      ...reordered.map((stop, index) => ({ ...stop, sort_order: index })),
    ]);
    void save(() =>
      reorderStops(
        id,
        reordered.map((stop, index) => ({
          id: stop.id,
          day_index: day,
          sort_order: index,
        })),
      ),
    );
  }

  // ----- 항공편 -----

  async function handleSaveFlight(values: FlightFormData) {
    if (!data || formBusy.current) return;
    const editing = data.flights.find((f) => f.id === route.id);
    if (!editing && data.flights.length >= MAX_FLIGHTS_PER_TRIP) {
      notifications.show({
        message: `항공편은 한 여행에 최대 ${MAX_FLIGHTS_PER_TRIP}개까지 추가할 수 있어요.`,
        color: "red",
      });
      return;
    }

    const fields = {
      flight_no: values.flight_no,
      dep_airport: values.dep_airport || null,
      arr_airport: values.arr_airport || null,
      dep_local: values.dep_local || null,
      arr_local: values.arr_local || null,
      dep_tz: values.dep_tz,
      arr_tz: values.arr_tz,
    };

    formBusy.current = true;
    try {
      const saved = await save(() =>
        editing
          ? updateFlight(id, editing.id, fields)
          : createFlight(id, {
              ...fields,
              direction: route.dir ?? "outbound",
            }),
      );
      if (!saved) return;
      patchData((current) => ({
        ...current,
        flights: editing
          ? current.flights.map((f) => (f.id === saved.id ? saved : f))
          : [...current.flights, saved],
      }));
      route.closeView();
      notifications.show({ message: "항공편을 저장했어요.", color: "teal" });
    } finally {
      formBusy.current = false;
    }
  }

  async function handleDeleteFlight() {
    const flightId = route.id;
    if (!flightId || formBusy.current) return;
    formBusy.current = true;
    try {
      const done = await save(async () => {
        await deleteFlight(id, flightId);
        return true;
      });
      if (!done) return;
      patchData((current) => ({
        ...current,
        flights: current.flights.filter((f) => f.id !== flightId),
      }));
      route.closeView();
      notifications.show({ message: "항공편을 삭제했어요.", color: "teal" });
    } finally {
      formBusy.current = false;
    }
  }

  // ----- 숙소 -----

  function focusOn(coords: Coords) {
    setPreview(null);
    setFlyTo({ ...coords, zoom: FOCUS_ZOOM });
  }

  function handleFocusLodging(lodging: Lodging) {
    focusOn({ lng: lodging.lng, lat: lodging.lat });
    setHighlightedMarkerId(`lodging-${lodging.id}`);
  }

  async function handleSaveLodging(values: LodgingFormData) {
    if (!data || formBusy.current) return;
    const editing = data.lodgings.find((l) => l.id === route.id);
    formBusy.current = true;
    try {
      const saved = await save(() =>
        editing
          ? updateLodging(id, editing.id, values)
          : createLodging(id, values),
      );
      if (!saved) return;
      patchData((current) => ({
        ...current,
        lodgings: editing
          ? current.lodgings.map((l) => (l.id === saved.id ? saved : l))
          : [...current.lodgings, saved],
      }));
      focusOn({ lng: saved.lng, lat: saved.lat });
      route.closeView();
      notifications.show({ message: "숙소를 저장했어요.", color: "teal" });
    } finally {
      formBusy.current = false;
    }
  }

  async function handleDeleteLodging() {
    const lodgingId = route.id;
    if (!lodgingId || formBusy.current) return;
    formBusy.current = true;
    try {
      const done = await save(async () => {
        await deleteLodging(id, lodgingId);
        return true;
      });
      if (!done) return;
      patchData((current) => ({
        ...current,
        lodgings: current.lodgings.filter((l) => l.id !== lodgingId),
      }));
      route.closeView();
      notifications.show({ message: "숙소를 삭제했어요.", color: "teal" });
    } finally {
      formBusy.current = false;
    }
  }

  // 숙소 폼이 지도 선택 모드를 켜고 끄는 통로. 켤 때 넘긴 콜백이 지도 클릭 좌표를 받습니다.
  function handlePickModeChange(
    active: boolean,
    onPick?: (coords: Coords) => void,
  ) {
    pickCallback.current = active ? (onPick ?? null) : null;
    setPickActive(active);
  }

  function handleMapClick(lng: number, lat: number) {
    if (pickMode) pickCallback.current?.({ lng, lat });
  }

  // ----- 여행 정보 -----

  async function handleShareEnable() {
    const token = await save(() => enableShare(id));
    if (!token) return false;
    patchData((current) => ({
      ...current,
      trip: { ...current.trip, share_token: token },
    }));
    return true;
  }

  async function handleShareDisable() {
    const done = await save(async () => {
      await disableShare(id);
      return true;
    });
    if (!done) return false;
    patchData((current) => ({
      ...current,
      trip: { ...current.trip, share_token: null },
    }));
    return true;
  }

  async function handleTripDelete() {
    const done = await save(async () => {
      await deleteTrip(id);
      return true;
    });
    if (!done) return;
    router.push("/trips");
    notifications.show({ message: "여행을 삭제했어요.", color: "teal" });
  }

  async function handleSaveTripEdit(values: TripEditFormData) {
    if (formBusy.current) return;
    formBusy.current = true;
    try {
      const saved = await save(() => updateTrip(id, values));
      if (!saved) return;
      patchData((current) => ({
        ...current,
        trip: { ...current.trip, ...saved },
      }));
      route.closeView();
      notifications.show({ message: "여행 정보를 저장했어요.", color: "teal" });
    } finally {
      formBusy.current = false;
    }
  }

  // ----- 지도 ↔ 목록 -----

  // 검색 결과에 마우스를 올렸을 때: 점선 원만 띄우고 지도는 움직이지 않습니다.
  const handlePreview = useCallback((place: PlaceResult | null) => {
    setPreview(place);
  }, []);

  // 검색 결과를 누르거나 숙소 위치를 고른 경우: 그 위치로 지도를 옮깁니다.
  const handleFocusPlace = useCallback((place: PlaceResult | null) => {
    setPreview(place);
    if (place) setFlyTo({ lng: place.lng, lat: place.lat, zoom: FOCUS_ZOOM });
  }, []);

  function handleFocusFlightStop(stop: FlightStop) {
    setPreview(null);
    setFlyTo({ lng: stop.lng, lat: stop.lat, zoom: AIRPORT_FOCUS_ZOOM });
    setHighlightedMarkerId(stop.markerId);
  }

  function handleToggleStop(stopId: string) {
    const opening = expandedStopId !== stopId;
    setExpandedStopId(opening ? stopId : null);
    if (!opening) return;
    const stop = data?.stops.find((s) => s.id === stopId);
    if (stop) focusOn({ lng: stop.lng, lat: stop.lat });
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

  if (loading) return <DetailLoading />;
  if (error)
    return (
      <DetailMessage
        icon={<IconAlertCircle size={36} />}
        title="여행을 불러오지 못했어요."
        action={<Button onClick={retry}>다시 시도</Button>}
      />
    );
  if (!data) notFound();

  const { trip, stops, lodgings, flights } = data;

  return (
    <Box className={classes.page}>
      <Header userName={user.name} userEmail={user.email} fluid />
      <Box ref={workspaceRef} className={classes.workspace}>
        {/* 데스크톱: 왼쪽 패널 / 모바일: 지도 위로 올라오는 바텀시트 */}
        <Box
          component="aside"
          ref={sheetRef}
          className={classes.panel}
          data-snap={sheetSnap}
        >
          {!subView && (
            <button
              type="button"
              className={classes.handle}
              aria-label="패널 크기 조절"
              {...sheet.handleProps}
            >
              <span />
            </button>
          )}
          <Box className={classes.panelBody}>
            {/* 서브 화면이 위에 덮여도 스크롤 위치와 입력 상태가 유지되도록 계속 마운트해 둡니다. */}
            <Box className={classes.panelMain} inert={!!subView}>
              <TripPanel
                trip={trip}
                stops={stops}
                lodgings={lodgings}
                flights={flights}
                flightStops={flightStops}
                selectedDay={selectedDay}
                saveStatus={saveStatus}
                expandedStopId={expandedStopId}
                hoveredStopId={hoveredId}
                highlightedStopId={newStopId}
                listRef={stopListRef}
                onSelectDay={route.setDay}
                onToggleStop={handleToggleStop}
                onHoverStop={setHoveredId}
                onMemo={handleMemo}
                onAlias={handleAlias}
                onMoveStop={handleMoveStop}
                onReorder={handleReorder}
                onDeleteStop={handleDeleteStop}
                onShareEnable={handleShareEnable}
                onShareDisable={handleShareDisable}
                onTripDelete={handleTripDelete}
                onEditTrip={() => route.openView("trip-edit")}
                onAddFlight={(dir) => route.openView("flight", { dir })}
                onEditFlight={(flight) =>
                  route.openView("flight", { id: flight.id })
                }
                onAddLodging={() => route.openView("lodging")}
                onEditLodging={(lodging) =>
                  route.openView("lodging", { id: lodging.id })
                }
                onFocusLodging={handleFocusLodging}
                onFocusFlightStop={handleFocusFlightStop}
                onOpenSearch={() => route.openView("search")}
              />
            </Box>
            {subView && (
              <Box className={classes.subScreen}>
                <SubScreen
                  view={subView}
                  direction={route.dir}
                  targetId={route.id}
                  trip={trip}
                  stops={stops}
                  lodgings={lodgings}
                  flights={flights}
                  selectedDay={selectedDay}
                  onClose={route.closeView}
                  onAddPlace={handleAddPlace}
                  onPreview={handlePreview}
                  onFocusPlace={handleFocusPlace}
                  onSaveFlight={handleSaveFlight}
                  onDeleteFlight={handleDeleteFlight}
                  onSaveLodging={handleSaveLodging}
                  onDeleteLodging={handleDeleteLodging}
                  onSaveTripEdit={handleSaveTripEdit}
                  onGoToDay={route.closeViewToDay}
                  pickMode={pickMode}
                  onPickModeChange={handlePickModeChange}
                />
              </Box>
            )}
          </Box>
        </Box>

        <Box className={classes.mapPane}>
          <TripMap
            trip={trip}
            stops={stops}
            lodgings={lodgings}
            flightStops={flightStops}
            selectedDay={selectedDay}
            hoveredId={hoveredId}
            highlightedId={highlightedMarkerId}
            preview={visiblePreview}
            flyTo={flyTo}
            insets={insets}
            pickMode={pickMode}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
          />
        </Box>
      </Box>
    </Box>
  );
}
