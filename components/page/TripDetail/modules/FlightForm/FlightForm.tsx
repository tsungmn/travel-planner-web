"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { OptionsFilter } from "@mantine/core";
import { DatePickerInput, TimePicker } from "@mantine/dates";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconClock,
} from "@tabler/icons-react";
import "dayjs/locale/ko";

import type { Flight } from "@/types";
import {
  airportCity,
  formatAirportLabel,
  searchAirports,
  useAirports,
  type Airport,
} from "@/lib/airports";
import {
  flightDurationLabel,
  isArrivalBeforeDeparture,
  isDepartureBeforePrevArrival,
  layoverLabel,
  tzOffsetLabel,
} from "@/lib/flightTime";
import { PanelSubScreen } from "../PanelSubScreen";
import classes from "./FlightForm.module.css";

export type FlightFormData = {
  flight_no: string;
  dep_airport: string;
  arr_airport: string;
  dep_local: string;
  arr_local: string;
  dep_tz: string | null;
  arr_tz: string | null;
};

type FlightFormProps = {
  direction: Flight["direction"];
  editingFlight: Flight | null;
  allFlightsInDirection: Flight[];
  onSave: (data: FlightFormData) => void;
  onDelete: (() => void) | null;
  onCancel: () => void;
};

const toOption = (airport: Airport) => ({
  value: airport.iata,
  label: formatAirportLabel(airport),
});

const dateOf = (localIso: string | null) =>
  localIso ? localIso.slice(0, 10) : "";
const timeOf = (localIso: string | null) =>
  localIso ? localIso.slice(11, 16) : "";
const combine = (date: string, time: string) =>
  date && time ? `${date}T${time}:00` : "";

export function FlightForm({
  direction,
  editingFlight,
  allFlightsInDirection,
  onSave,
  onDelete,
  onCancel,
}: FlightFormProps) {
  const isEdit = !!editingFlight;
  const dirLabel = direction === "outbound" ? "출국" : "귀국";

  // 같은 방향의 다른 구간들(출발 시각 순)과, 바로 앞 구간
  const others = allFlightsInDirection
    .filter((f) => f.id !== editingFlight?.id)
    .sort((a, b) => (a.dep_local ?? "").localeCompare(b.dep_local ?? ""));
  const prevFlight = editingFlight
    ? (others
        .filter((f) => (f.dep_local ?? "") < (editingFlight.dep_local ?? ""))
        .at(-1) ?? null)
    : (others.at(-1) ?? null);

  const title = isEdit
    ? "항공편 수정"
    : prevFlight
      ? `${dirLabel} · ${others.length + 1}번째 구간 추가`
      : `${dirLabel} 항공편 추가`;

  // 새 구간이면 앞 구간의 도착 공항·시각을 출발 쪽 기본값으로 둡니다.
  const [initial] = useState(() => ({
    flightNo: editingFlight?.flight_no ?? "",
    depIata:
      editingFlight?.dep_airport ??
      (isEdit ? "" : (prevFlight?.arr_airport ?? "")),
    arrIata: editingFlight?.arr_airport ?? "",
    depDate: dateOf(
      isEdit ? editingFlight.dep_local : (prevFlight?.arr_local ?? null),
    ),
    depTime: timeOf(
      isEdit ? editingFlight.dep_local : (prevFlight?.arr_local ?? null),
    ),
    arrDate: dateOf(editingFlight?.arr_local ?? null),
    arrTime: timeOf(editingFlight?.arr_local ?? null),
  }));

  const { status, index, retry } = useAirports();
  const airportOptions = useMemo(
    () => index?.airports.map(toOption) ?? [],
    [index],
  );
  // 목록에 없는 공항(예전에 저장한 항공편 등)도 선택된 값으로는 보이게 합니다.
  const optionsWith = (iata: string) =>
    iata && !index?.byIata.has(iata)
      ? [{ value: iata, label: iata }, ...airportOptions]
      : airportOptions;
  const filterAirports: OptionsFilter = ({ search }) =>
    index ? searchAirports(index, search).map(toOption) : [];

  const [flightNo, setFlightNo] = useState(initial.flightNo);
  const [depIata, setDepIata] = useState(initial.depIata);
  const [arrIata, setArrIata] = useState(initial.arrIata);
  const [depDate, setDepDate] = useState(initial.depDate);
  const [depTime, setDepTime] = useState(initial.depTime);
  const [arrDate, setArrDate] = useState(initial.arrDate);
  const [arrTime, setArrTime] = useState(initial.arrTime);

  const depLocal = combine(depDate, depTime);
  const arrLocal = combine(arrDate, arrTime);
  const depAirport = index?.byIata.get(depIata) ?? null;
  const arrAirport = index?.byIata.get(arrIata) ?? null;
  // 목록을 아직 못 불러왔거나 목록에 없는 공항이면 저장돼 있던 시간대를 씁니다.
  const depTz =
    depAirport?.tz ??
    (editingFlight?.dep_airport === depIata ? editingFlight.dep_tz : null);
  const arrTz =
    arrAirport?.tz ??
    (editingFlight?.arr_airport === arrIata ? editingFlight.arr_tz : null);

  const isDirty =
    flightNo.trim() !== initial.flightNo ||
    depIata !== initial.depIata ||
    arrIata !== initial.arrIata ||
    depDate !== initial.depDate ||
    depTime !== initial.depTime ||
    arrDate !== initial.arrDate ||
    arrTime !== initial.arrTime;

  const current: Flight = {
    id: editingFlight?.id ?? "draft",
    trip_id: editingFlight?.trip_id ?? "",
    direction,
    flight_no: flightNo.trim(),
    dep_airport: depIata || null,
    arr_airport: arrIata || null,
    dep_local: depLocal || null,
    arr_local: arrLocal || null,
    dep_tz: depTz,
    arr_tz: arrTz,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!flightNo.trim()) errors.push("편명을 입력해 주세요.");
  if (!depIata) errors.push("출발 공항을 선택해 주세요.");
  if (!arrIata) errors.push("도착 공항을 선택해 주세요.");
  if (!depDate || !depTime) errors.push("출발 날짜와 시간을 입력해 주세요.");
  if (depIata && depIata === arrIata) {
    errors.push("출발지와 도착지가 같아요.");
  }
  if (isArrivalBeforeDeparture(current)) {
    errors.push("도착 시각이 출발보다 빨라요. 날짜와 시간을 확인해 주세요.");
  }
  if (prevFlight && depLocal && depTz) {
    if (isDepartureBeforePrevArrival(prevFlight, current)) {
      errors.push("앞 구간이 도착하기 전에 출발해요.");
    }
    if (
      prevFlight.arr_airport &&
      depIata &&
      prevFlight.arr_airport !== depIata
    ) {
      warnings.push(`앞 구간 도착 공항(${prevFlight.arr_airport})과 달라요.`);
    }
  }

  const duration = flightDurationLabel(current);
  const layover = prevFlight ? layoverLabel(prevFlight, current) : null;

  function handleSave() {
    if (errors.length > 0 || !depIata || !arrIata) return;
    onSave({
      flight_no: flightNo.trim().toUpperCase(),
      dep_airport: depIata,
      arr_airport: arrIata,
      dep_local: depLocal,
      arr_local: arrLocal,
      dep_tz: depTz,
      arr_tz: arrTz,
    });
  }

  return (
    <PanelSubScreen
      title={title}
      dirty={isDirty}
      saveDisabled={errors.length > 0}
      onBack={onCancel}
      onSave={handleSave}
      onDelete={isEdit && onDelete ? onDelete : undefined}
    >
      <Stack gap="md">
        <TextInput
          label="편명"
          value={flightNo}
          onChange={(event) =>
            setFlightNo(event.currentTarget.value.toUpperCase())
          }
          placeholder="KE 861"
          autoCapitalize="characters"
          autoCorrect="off"
        />

        {status === "error" && (
          <Group gap="xs" wrap="nowrap" c="red" role="alert">
            <IconAlertCircle size={16} aria-hidden="true" />
            <Text size="sm" inherit>
              공항 목록을 불러오지 못했어요.
            </Text>
            <Button size="compact-sm" variant="light" onClick={retry}>
              다시 시도
            </Button>
          </Group>
        )}

        <Select
          label="출발 공항"
          placeholder={
            status === "loading" || status === "idle"
              ? "공항 목록을 불러오는 중…"
              : "ICN, 인천, 칭다오…"
          }
          searchable
          allowDeselect={false}
          nothingFoundMessage="검색 결과가 없어요"
          data={optionsWith(depIata)}
          filter={filterAirports}
          value={depIata || null}
          onChange={(iata) => setDepIata(iata ?? "")}
        />

        <Select
          label="도착 공항"
          placeholder={
            status === "loading" || status === "idle"
              ? "공항 목록을 불러오는 중…"
              : "TAO, 칭다오…"
          }
          searchable
          allowDeselect={false}
          nothingFoundMessage="검색 결과가 없어요"
          data={optionsWith(arrIata)}
          filter={filterAirports}
          value={arrIata || null}
          onChange={(iata) => setArrIata(iata ?? "")}
        />

        <DateTimeField
          label="출발 날짜 · 시간"
          date={depDate}
          time={depTime}
          maxDate={arrDate || undefined}
          cityLabel={depAirport ? airportCity(depAirport) : depIata}
          tz={depTz}
          localIso={depLocal}
          onDateChange={setDepDate}
          onTimeChange={setDepTime}
        />

        <DateTimeField
          label="도착 날짜 · 시간"
          date={arrDate}
          time={arrTime}
          minDate={depDate || undefined}
          cityLabel={arrAirport ? airportCity(arrAirport) : arrIata}
          tz={arrTz}
          localIso={arrLocal}
          onDateChange={setArrDate}
          onTimeChange={setArrTime}
        />

        {duration && (
          <Paper radius="md" p="sm" className={classes.summary}>
            <Group gap={6} wrap="nowrap">
              <IconClock size={14} aria-hidden="true" />
              <Text size="sm">비행 {duration}</Text>
            </Group>
            {layover && (
              <Group gap={6} wrap="nowrap" mt={4} c="dimmed">
                <IconClock size={14} aria-hidden="true" />
                <Text size="sm" inherit>
                  이전 구간과의 대기 시간 {layover}
                </Text>
              </Group>
            )}
          </Paper>
        )}

        {isDirty && errors.length > 0 && (
          <Stack gap={4} role="alert">
            {errors.map((message) => (
              <Group key={message} gap={6} wrap="nowrap" c="red">
                <IconAlertCircle size={16} aria-hidden="true" />
                <Text size="sm" inherit>
                  {message}
                </Text>
              </Group>
            ))}
          </Stack>
        )}

        {warnings.length > 0 && (
          <Stack gap={4}>
            {warnings.map((message) => (
              <Group key={message} gap={6} wrap="nowrap" c="orange.8">
                <IconAlertTriangle size={16} aria-hidden="true" />
                <Text size="sm" inherit>
                  {message}
                </Text>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </PanelSubScreen>
  );
}

function DateTimeField({
  label,
  date,
  time,
  cityLabel,
  tz,
  localIso,
  minDate,
  maxDate,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  date: string;
  time: string;
  cityLabel: string;
  tz: string | null;
  localIso: string;
  minDate?: string;
  maxDate?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <DatePickerInput
          className={classes.date}
          locale="ko"
          valueFormat="YYYY.MM.DD (dd)"
          placeholder="날짜 선택"
          aria-label={`${label} - 날짜`}
          value={date || null}
          minDate={minDate}
          maxDate={maxDate}
          defaultDate={date || minDate || maxDate}
          onChange={(value) => onDateChange(value ?? "")}
        />
        {/* 24시간제. 시·분을 직접 입력하거나 드롭다운에서 고릅니다. (AM/PM 없음) */}
        <TimePicker
          className={classes.time}
          format="24h"
          withDropdown
          minutesStep={5}
          hoursInputLabel={`${label} - 시`}
          minutesInputLabel={`${label} - 분`}
          value={time}
          onChange={onTimeChange}
        />
      </Group>
      <Text size="xs" c="dimmed">
        {cityLabel && tz && localIso
          ? `현지 시각 · ${cityLabel} (${tzOffsetLabel(tz, localIso)})`
          : "공항을 먼저 선택해 주세요"}
      </Text>
    </Stack>
  );
}
