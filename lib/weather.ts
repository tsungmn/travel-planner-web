/**
 * 일차별 날씨를 다시 받아야 하는지 판단하는 서명.
 *
 * 서버가 날씨 기준 위치를 정할 때 쓰는 값(목적지, 날짜, 장소·영역의 일차와 좌표, 숙소의 좌표와 날짜)만
 * 담습니다. 메모, 별명, 장소 순서처럼 위치 추정에 영향이 없는 변경은 서명이 같아서 다시 받지 않습니다.
 */
type SignatureInput = {
  trip: {
    start_date: string;
    end_date: string;
    dest_lat: number | null;
    dest_lng: number | null;
  };
  stops: {
    id: string;
    day_index: number;
    lat: number | null;
    lng: number | null;
  }[];
  lodgings: {
    id: string;
    lat: number;
    lng: number;
    check_in: string | null;
    check_out: string | null;
  }[];
  areas: { id: string; day_index: number | null; lat: number; lng: number }[];
};

export function weatherSignature({
  trip,
  stops,
  lodgings,
  areas,
}: SignatureInput): string {
  const part = (items: (string | number | null)[][]) =>
    items
      .map((item) => item.join(","))
      .sort()
      .join(";");
  return [
    [trip.start_date, trip.end_date, trip.dest_lat, trip.dest_lng].join(","),
    part(stops.map((s) => [s.id, s.day_index, s.lat, s.lng])),
    part(lodgings.map((l) => [l.id, l.lat, l.lng, l.check_in, l.check_out])),
    part(areas.map((a) => [a.id, a.day_index, a.lat, a.lng])),
  ].join("|");
}
