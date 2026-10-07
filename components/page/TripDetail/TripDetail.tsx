"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";

import type { Flight, Lodging, PlaceResult, Stop, Trip } from "@/types";
import { getTrip, searchPlaces } from "@/lib/api";
import { Header } from "@/components/common/Header";
import classes from "./TripDetail.module.css";
import { PlaceSearch } from "./modules/PlaceSearch";
import { DayStopList } from "./modules/DayStopList";
import { formatDayDate, formatPeriod } from "@/lib/date";
import { AllDaysList } from "./modules/AllDaysList";
import { getDayColor } from "@/lib/dayColor";
import { InfoSection } from "./modules/InfoSection";
import { DetailLoading, DetailMessage } from "./modules/DetailState";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Collapse,
  Group,
  Loader,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  ScrollArea,
  Stack,
  Tabs,
  TabsList,
  TabsTab,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconDotsVertical,
  IconHome,
  IconMapPin,
  IconPlane,
  IconPlus,
  IconSearch,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";

const MapContainer = dynamic(() => import("@/components/common/MapContainer"), {
  ssr: false,
  loading: () => (
    <Center h="100%" role="status" aria-label="지도를 불러오는 중">
      <Loader size="sm" />
    </Center>
  ),
});

type SaveStatus = "saved" | "saving" | "error";
type TripData = {
  trip: Trip;
  stops: Stop[];
  lodgings: Lodging[];
  flights: Flight[];
};

export function TripDetailClient({ id }: { id: string }) {
  return (
    <Suspense fallback={<DetailLoading />}>
      <TripDetailContent id={id} />
    </Suspense>
  );
}

function TripDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [preview, setPreview] = useState<PlaceResult | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [undoStop, setUndoStop] = useState<Stop | null>(null);
  const [mobilePanel, setMobilePanel] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopListRef = useRef<HTMLDivElement>(null);

  const dayParam = searchParams.get("day");
  const selectedDay =
    dayParam && Number(dayParam) > 0 ? Number(dayParam) - 1 : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await getTrip(id);
      if (!result) {
        setData(null);
        setError(false);
        return;
      }
      setData({
        trip: result.trip,
        stops: result.stops,
        lodgings: result.lodgings,
        flights: result.flights,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [load]);

  const simulateSave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus("saved"), 1200);
  }, []);

  const updateStops = useCallback(
    (updater: (stops: Stop[]) => Stop[]) => {
      setData((current) =>
        current ? { ...current, stops: updater(current.stops) } : current,
      );
      simulateSave();
    },
    [simulateSave],
  );

  function setDay(day: number | null) {
    router.replace(day === null ? pathname : `${pathname}?day=${day + 1}`);
  }

  function handleAddPlace(place: PlaceResult, dayIndex: number) {
    if (!data) return;
    const newStop: Stop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      trip_id: data.trip.id,
      day_index: dayIndex,
      sort_order: data.stops.filter((stop) => stop.day_index === dayIndex)
        .length,
      name: place.name,
      address_text: place.address_text,
      lat: place.lat,
      lng: place.lng,
      provider: place.provider,
      provider_place_id: place.provider_place_id,
      memo: null,
    };
    updateStops((stops) => [...stops, newStop]);
    setSearchOpen(false);
    setPreview(null);
    setQuery("");
    notifications.show({
      message: `${dayIndex + 1}일차에 장소를 추가했어요.`,
      color: "teal",
    });
  }

  function handleQuery(value: string) {
    setQuery(value);
    setSearchError("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchPlaces(value.trim());
        setSearchResults(result.items);
      } catch {
        setSearchResults([]);
        setSearchError("검색에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function deleteStop(stopId: string) {
    const deleted = data?.stops.find((stop) => stop.id === stopId);
    if (!deleted) return;
    updateStops((stops) => stops.filter((stop) => stop.id !== stopId));
    setExpandedStopId(null);
    setUndoStop(deleted);
    notifications.show({
      message: "장소를 삭제했어요. 아래에서 실행 취소할 수 있어요.",
      color: "teal",
    });
  }

  function undoDelete() {
    if (!undoStop) return;
    updateStops((stops) =>
      [...stops, undoStop].sort(
        (a, b) => a.day_index - b.day_index || a.sort_order - b.sort_order,
      ),
    );
    setUndoStop(null);
  }

  function moveStop(stopId: string, dayIndex: number) {
    updateStops((stops) => {
      const nextOrder = stops.filter(
        (stop) => stop.day_index === dayIndex,
      ).length;
      return stops.map((stop) =>
        stop.id === stopId
          ? { ...stop, day_index: dayIndex, sort_order: nextOrder }
          : stop,
      );
    });
    setDay(dayIndex);
  }

  const mapData = useMemo(() => {
    if (!data) return { markers: [], route: [] as [number, number][] };
    const visibleStops =
      selectedDay === null
        ? data.stops
        : data.stops.filter((stop) => stop.day_index === selectedDay);
    const routeStops = data.stops
      .filter((stop) => stop.day_index === selectedDay)
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      markers: visibleStops.map((stop) => ({
        ...stop,
        dimmed: selectedDay !== null && stop.day_index !== selectedDay,
      })),
      route: routeStops.map((stop) => [stop.lng, stop.lat] as [number, number]),
    };
  }, [data, selectedDay]);

  if (loading) return <DetailLoading />;
  if (error)
    return (
      <DetailMessage
        icon={<IconAlertCircle size={36} />}
        title="여행을 불러오지 못했어요."
        action={<Button onClick={load}>다시 시도</Button>}
      />
    );
  if (!data)
    return (
      <DetailMessage
        title="여행을 찾을 수 없어요."
        description="존재하지 않는 여행이거나 삭제되었을 수 있어요."
        action={
          <Button component="a" href="/trips">
            여행 목록으로
          </Button>
        }
      />
    );

  const { trip, stops, lodgings, flights } = data;
  const currentStops =
    selectedDay === null
      ? []
      : stops
          .filter((stop) => stop.day_index === selectedDay)
          .sort((a, b) => a.sort_order - b.sort_order);
  const center = preview
    ? [preview.lng, preview.lat]
    : [trip.dest_lng ?? 120.3826, trip.dest_lat ?? 36.0671];

  return (
    <Box className={classes.page}>
      <Header />
      <Box className={classes.workspace}>
        <Box className={classes.mapPane}>
          <MapContainer
            key={`${center[0]}-${center[1]}`}
            className={classes.map}
            initialViewState={{
              longitude: center[0],
              latitude: center[1],
              zoom: preview ? 14 : 12,
            }}
            showNavigation
            showGeolocate
            showScale
          >
            {mapData.route.length >= 2 && (
              <Source
                id="trip-route"
                type="geojson"
                data={{
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: mapData.route,
                  },
                }}
              >
                <Layer
                  id="trip-route-line"
                  type="line"
                  paint={{
                    "line-color": "#0f766e",
                    "line-width": 3,
                    "line-opacity": 0.7,
                  }}
                />
              </Source>
            )}
            {mapData.markers.map((stop) => (
              <Marker
                key={stop.id}
                longitude={stop.lng}
                latitude={stop.lat}
                anchor="bottom"
              >
                <ActionIcon
                  variant="filled"
                  color={getDayColor(stop.day_index).hex}
                  radius="xl"
                  size={32}
                  className={stop.dimmed ? classes.dimmedMarker : undefined}
                  aria-label={`${stop.name} 위치`}
                  onClick={() => {
                    setExpandedStopId(stop.id);
                    stopListRef.current
                      ?.querySelector(`[data-stop-id="${stop.id}"]`)
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }}
                >
                  <IconMapPin size={18} />
                </ActionIcon>
              </Marker>
            ))}
            {preview && (
              <Marker
                longitude={preview.lng}
                latitude={preview.lat}
                anchor="bottom"
              >
                <ThemeIcon color="orange" radius="xl" size={36}>
                  <IconPlus size={20} />
                </ThemeIcon>
              </Marker>
            )}
          </MapContainer>
        </Box>

        <Box
          className={`${classes.panel} ${mobilePanel ? classes.mobilePanelOpen : ""}`}
        >
          <Box
            className={classes.mobileHandle}
            onClick={() => setMobilePanel((open) => !open)}
          >
            <span />
          </Box>
          <ScrollArea className={classes.panelScroll} offsetScrollbars>
            <Stack gap="md" p="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box className={classes.flexible}>
                  <Button
                    component="a"
                    href="/trips"
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    leftSection={<IconArrowLeft size={16} />}
                  >
                    뒤로
                  </Button>
                  <Title order={1} size="h3" lineClamp={1}>
                    {trip.title}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {formatPeriod(trip.start_date, trip.end_date)}
                  </Text>
                </Box>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    variant="default"
                    size="compact-sm"
                    leftSection={<IconShare size={16} />}
                  >
                    공유
                  </Button>
                  <Menu position="bottom-end" withinPortal>
                    <MenuTarget>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="여행 메뉴"
                      >
                        <IconDotsVertical size={18} />
                      </ActionIcon>
                    </MenuTarget>
                    <MenuDropdown>
                      <MenuItem
                        leftSection={<IconTrash size={16} />}
                        color="red"
                      >
                        여행 삭제
                      </MenuItem>
                    </MenuDropdown>
                  </Menu>
                </Group>
              </Group>

              <Text size="xs" c="dimmed">
                {saveStatus === "saving"
                  ? "저장 중…"
                  : saveStatus === "error"
                    ? "저장 실패"
                    : "저장됨"}
              </Text>
              {undoStop && (
                <Alert
                  color="teal"
                  radius="md"
                  withCloseButton
                  onClose={() => setUndoStop(null)}
                >
                  장소를 삭제했어요.{" "}
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    onClick={undoDelete}
                  >
                    실행 취소
                  </Button>
                </Alert>
              )}

              <Button
                variant="light"
                leftSection={<IconSearch size={17} />}
                onClick={() => setSearchOpen((open) => !open)}
              >
                장소 추가
              </Button>
              <Collapse expanded={searchOpen}>
                <PlaceSearch
                  query={query}
                  results={searchResults}
                  searching={searching}
                  error={searchError}
                  dayIndex={selectedDay ?? 0}
                  numDays={trip.num_days}
                  onQuery={handleQuery}
                  onPreview={setPreview}
                  onAdd={handleAddPlace}
                />
              </Collapse>

              <InfoSection title="항공편" icon={<IconPlane size={17} />}>
                {flights.length ? (
                  flights.map((flight, index) => (
                    <Text key={flight.id} size="sm">
                      항공편 정보 {index + 1}
                    </Text>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    등록된 항공편이 없어요.
                  </Text>
                )}
              </InfoSection>
              <InfoSection title="숙소" icon={<IconHome size={17} />}>
                {lodgings.length ? (
                  lodgings.map((lodging, index) => (
                    <Text key={lodging.id} size="sm">
                      숙소 정보 {index + 1}
                    </Text>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    등록된 숙소가 없어요.
                  </Text>
                )}
              </InfoSection>

              <Tabs
                value={selectedDay === null ? "all" : String(selectedDay)}
                onChange={(value) =>
                  setDay(
                    value === "all" || value === null ? null : Number(value),
                  )
                }
                variant="pills"
                keepMounted={false}
              >
                <TabsList className={classes.dayTabs}>
                  <TabsTab value="all">전체</TabsTab>
                  {Array.from({ length: trip.num_days }, (_, day) => (
                    <TabsTab
                      key={day}
                      value={String(day)}
                      leftSection={
                        <Box
                          className={classes.dayDot}
                          style={{ background: getDayColor(day).hex }}
                        />
                      }
                    >
                      {day + 1}일차{" "}
                      <Text component="span" size="xs" c="dimmed">
                        {formatDayDate(trip.start_date, day)}
                      </Text>
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>

              <Box ref={stopListRef}>
                {selectedDay === null ? (
                  <AllDaysList trip={trip} stops={stops} onSelect={setDay} />
                ) : (
                  <DayStopList
                    trip={trip}
                    stops={currentStops}
                    dayIndex={selectedDay}
                    expandedStopId={expandedStopId}
                    onToggle={(stopId) =>
                      setExpandedStopId(
                        expandedStopId === stopId ? null : stopId,
                      )
                    }
                    onMemo={(stopId, memo) =>
                      updateStops((items) =>
                        items.map((stop) =>
                          stop.id === stopId ? { ...stop, memo } : stop,
                        ),
                      )
                    }
                    onMove={moveStop}
                    onReorder={(reordered) =>
                      updateStops((items) => [
                        ...items.filter(
                          (stop) => stop.day_index !== selectedDay,
                        ),
                        ...reordered.map((stop, index) => ({
                          ...stop,
                          sort_order: index,
                        })),
                      ])
                    }
                    onDelete={deleteStop}
                  />
                )}
              </Box>
            </Stack>
          </ScrollArea>
        </Box>
      </Box>
    </Box>
  );
}
