// 날짜는 모두 "YYYY-MM-DD" 문자열로 주고받습니다.
// - 날짜 간 계산(더하기/차이)은 UTC 자정 기준 → 서머타임 영향 없음
// - 사용자에게 보이는 값(오늘, 요일)은 로컬 기준

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const MS_PER_DAY = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

/* ───────── 계산 ───────── */

/** 로컬 Date → "YYYY-MM-DD" */
export function toDateString(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

export const todayLocal = () => toDateString(new Date());

/** "YYYY-MM-DD"에 n일을 더합니다. */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** end - start (일). 같은 날이면 0 → 박 수와 같습니다. */
export function diffDays(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

/** 시작일과 종료일을 모두 포함한 일수 (당일치기 = 1). */
export const inclusiveDays = (start: string, end: string) =>
  diffDays(start, end) + 1;

/* ───────── 표시 ───────── */

/** "10.04 (일)" */
export function formatDateShort(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${WEEKDAYS_KO[date.getDay()]})`;
}

/** 시작일 기준 n번째 날(0부터)의 "10.04 (일)" */
export function formatDayDate(startDate: string, dayIndex: number): string {
  return formatDateShort(addDays(startDate, dayIndex));
}

/** "10.04 (일) – 10.07 (수) · 3박 4일" */
export function formatPeriod(startDate: string, endDate: string): string {
  const nights = diffDays(startDate, endDate);
  return `${formatDateShort(startDate)} – ${formatDateShort(endDate)} · ${nights}박 ${nights + 1}일`;
}

/** "2026-10-04T09:30:00" → "09:30" */
export function formatTime(isoLocal: string | null): string {
  if (!isoLocal) return "--:--";
  const date = new Date(isoLocal);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
