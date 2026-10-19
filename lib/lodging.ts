import type { HiddenStop, Lodging, SharedStop, Stop } from "@/types";

type Located = Pick<Stop, "lat" | "lng" | "provider_place_id">;

/**
 * 이 장소가 등록된 숙소인지 찾습니다.
 * 숙소에서 만든 장소는 숙소와 같은 좌표(또는 같은 장소 id)를 갖기 때문에 그걸로 알아봅니다.
 */
export function findLodgingFor(
  place: Located,
  lodgings: Lodging[],
): Lodging | undefined {
  return lodgings.find(
    (lodging) =>
      (lodging.lat === place.lat && lodging.lng === place.lng) ||
      (lodging.provider_place_id !== null &&
        lodging.provider_place_id === place.provider_place_id),
  );
}

/** 숙소를 공개하지 않아 위치 없이 자리만 남은 숙소 장소인지. */
export function isHiddenStop(stop: SharedStop): stop is HiddenStop {
  return "hidden" in stop && stop.hidden === true;
}

/**
 * 장소 목록(한 일차)에 번호를 붙입니다.
 * 숙소(숨겨진 것 포함)는 번호를 차지하지 않고 null을 돌려주며, 나머지는 1부터 이어서 셉니다.
 */
export function numberStops(
  stops: SharedStop[],
  lodgings: Lodging[],
): (number | null)[] {
  let count = 0;
  return stops.map((stop) =>
    isHiddenStop(stop) || findLodgingFor(stop, lodgings) ? null : ++count,
  );
}
