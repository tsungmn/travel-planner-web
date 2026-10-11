"use client";

import { useSyncExternalStore } from "react";

const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

const subscribe = () => () => {};
const getClientSnapshot = () => configured ?? window.location.origin;
const getServerSnapshot = () => configured ?? "";

/**
 * 공유 링크처럼 절대 주소가 필요한 곳에서 쓰는 사이트 origin.
 *
 * `NEXT_PUBLIC_SITE_URL`이 있으면 그 값을, 없으면 현재 접속한 origin을 씁니다.
 * 서버 렌더에서는 빈 문자열이고, 하이드레이션 뒤에 실제 값으로 바뀝니다.
 */
export function useSiteOrigin(): string {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
