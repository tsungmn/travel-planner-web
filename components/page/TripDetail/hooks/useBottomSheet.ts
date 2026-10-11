"use client";

import { useRef, useState } from "react";
import type { RefObject, TouchEvent } from "react";

/** 0: 접힘, 1: 절반, 2: 거의 전체 */
export type SheetSnap = 0 | 1 | 2;

// TripDetail.module.css의 .panel[data-snap]와 같은 값이어야 합니다.
export const SHEET_COLLAPSED_PX = 96;
export const SHEET_HALF_RATIO = 0.5;
export const SHEET_FULL_RATIO = 0.92;

const DRAG_THRESHOLD_PX = 40;

/** 스냅 단계의 높이(px). `containerHeight`는 시트가 놓인 영역의 높이. */
export function getSheetHeight(snap: SheetSnap, containerHeight: number) {
  if (snap === 0) return SHEET_COLLAPSED_PX;
  return containerHeight * (snap === 1 ? SHEET_HALF_RATIO : SHEET_FULL_RATIO);
}

/**
 * 모바일 바텀시트의 스냅 단계와 핸들 드래그를 관리합니다.
 * `sheetRef`는 시트 요소에 붙여 주세요. 드래그 중에는 DOM 높이를 직접 바꾸고, 손을 떼면 가장 가까운 단계로 돌려놓습니다.
 */
export function useBottomSheet(
  sheetRef: RefObject<HTMLElement | null>,
  containerHeight: number,
) {
  const [snap, setSnap] = useState<SheetSnap>(1);
  const drag = useRef({ startY: 0, startHeight: 0, active: false });

  function onTouchStart(event: TouchEvent) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    drag.current = {
      startY: event.touches[0].clientY,
      startHeight: sheet.getBoundingClientRect().height,
      active: true,
    };
    sheet.style.transition = "none";
  }

  function onTouchMove(event: TouchEvent) {
    const sheet = sheetRef.current;
    if (!sheet || !drag.current.active) return;
    const delta = drag.current.startY - event.touches[0].clientY;
    const next = Math.max(
      SHEET_COLLAPSED_PX,
      Math.min(containerHeight, drag.current.startHeight + delta),
    );
    sheet.style.height = `${next}px`;
  }

  function onTouchEnd(event: TouchEvent) {
    const sheet = sheetRef.current;
    if (!sheet || !drag.current.active) return;
    drag.current.active = false;

    const delta = drag.current.startY - event.changedTouches[0].clientY;
    sheet.style.transition = "";
    sheet.style.height = "";

    if (delta > DRAG_THRESHOLD_PX) {
      setSnap((current) => Math.min(2, current + 1) as SheetSnap);
    } else if (delta < -DRAG_THRESHOLD_PX) {
      setSnap((current) => Math.max(0, current - 1) as SheetSnap);
    }
  }

  /** 핸들을 탭하면 접힘 → 절반 → 전체 → 절반 순으로 바뀝니다. */
  function cycle() {
    setSnap((current) => (current === 0 ? 1 : current === 1 ? 2 : 1));
  }

  return {
    snap,
    setSnap,
    handleProps: { onTouchStart, onTouchMove, onTouchEnd, onClick: cycle },
  };
}
