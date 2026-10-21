import type {
  Flight,
  Lodging,
  PlaceResult,
  Stop,
  Trip,
  TripArea,
} from "@/types";
import type { DetailView } from "@/hooks/useDetailRoute";
import { CityPickerScreen } from "@/components/common/DayWeather/CityPickerScreen";
import type {
  CityApplyScope,
  CityCandidate,
} from "@/components/common/DayWeather/types";
import { FlightForm, type FlightFormData } from "../FlightForm";
import { LodgingForm, type LodgingFormData } from "../LodgingForm";
import { PanelSubScreen } from "../PanelSubScreen";
import { PlaceSearch, type MapSearchControl } from "../PlaceSearch";
import { TripEditForm, type TripEditFormData } from "../TripEditForm";

type SubScreenProps = {
  view: DetailView;
  /** `?dir=` : 새 항공편을 추가할 방향 */
  direction: Flight["direction"] | null;
  /** `?id=` : 수정할 항공편/숙소, 장소 검색에서는 검색 범위로 쓸 영역 */
  targetId: string | null;
  /** 날씨 도시 선택 화면에 필요한 일차 정보 */
  weatherCity?: {
    dayIndex: number;
    totalDays: number;
    canReset: boolean;
    onApply: (city: CityCandidate, scope: CityApplyScope) => Promise<void>;
    onReset: (scope: CityApplyScope) => Promise<void>;
  };
  trip: Trip;
  stops: Stop[];
  lodgings: Lodging[];
  flights: Flight[];
  areas: TripArea[];
  selectedDay: number | null;
  onClose: () => void;
  onAddPlace: (place: PlaceResult, dayIndex: number) => Promise<boolean>;
  /** 마우스를 올렸을 때 점선 원만 띄웁니다. (지도 이동 없음) */
  onPreview: (place: PlaceResult | null) => void;
  /** 선택한 위치로 지도를 옮기고 점선 원을 띄웁니다. */
  onFocusPlace: (place: PlaceResult | null) => void;
  onSaveFlight: (data: FlightFormData) => void;
  onDeleteFlight: () => void;
  onSaveLodging: (data: LodgingFormData) => void;
  onDeleteLodging: () => void;
  onSaveTripEdit: (data: TripEditFormData) => void;
  onGoToDay: (dayIndex: number) => void;
  /** 지도에서 위치를 고르는 중인지. 숙소 폼과 장소 검색이 같이 씁니다. */
  pickMode: boolean;
  onPickModeChange: (
    active: boolean,
    onPick?: (coords: { lng: number; lat: number }) => void,
  ) => void;
  /** 장소 검색의 "현 지도에서 검색" 버튼이 쓰는 지도 쪽 정보. */
  mapSearch: MapSearchControl;
};

/** `?view=` 값에 맞는 패널 서브 화면을 그립니다. */
export function SubScreen(props: SubScreenProps) {
  const { view, trip, stops, flights, lodgings, onClose } = props;

  if (view === "weather-city" && props.weatherCity) {
    return (
      <PanelSubScreen title="날씨 도시 바꾸기" onBack={onClose}>
        <CityPickerScreen {...props.weatherCity} onBack={onClose} />
      </PanelSubScreen>
    );
  }

  if (view === "search") {
    const area = props.areas.find((a) => a.id === props.targetId) ?? null;
    return (
      <PanelSubScreen title="장소 추가" onBack={onClose}>
        <PlaceSearch
          // 영역이 바뀌면 검색 범위도 새로 시작합니다.
          key={area?.id ?? "all"}
          trip={trip}
          stops={stops}
          lodgings={lodgings}
          selectedDay={props.selectedDay}
          area={area}
          onAddPlace={props.onAddPlace}
          onPreview={props.onPreview}
          onFocusPlace={props.onFocusPlace}
          onViewAdded={onClose}
          pickMode={props.pickMode}
          onPickModeChange={props.onPickModeChange}
          mapSearch={props.mapSearch}
        />
      </PanelSubScreen>
    );
  }

  if (view === "flight") {
    const direction = props.direction ?? "outbound";
    const editing = flights.find((f) => f.id === props.targetId) ?? null;
    return (
      <FlightForm
        key={props.targetId ?? `new-${direction}`}
        direction={editing?.direction ?? direction}
        editingFlight={editing}
        allFlightsInDirection={flights.filter(
          (f) => f.direction === (editing?.direction ?? direction),
        )}
        onSave={props.onSaveFlight}
        onDelete={editing ? props.onDeleteFlight : null}
        onCancel={onClose}
      />
    );
  }

  if (view === "lodging") {
    const editing = lodgings.find((l) => l.id === props.targetId) ?? null;
    return (
      <LodgingForm
        key={props.targetId ?? "new"}
        trip={trip}
        editingLodging={editing}
        pickMode={props.pickMode}
        onPickModeChange={props.onPickModeChange}
        onPreview={props.onFocusPlace}
        onSave={props.onSaveLodging}
        onDelete={editing ? props.onDeleteLodging : null}
        onCancel={onClose}
      />
    );
  }

  return (
    <TripEditForm
      trip={trip}
      stops={stops}
      onSave={props.onSaveTripEdit}
      onCancel={onClose}
      onGoToDay={props.onGoToDay}
    />
  );
}
