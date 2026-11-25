import type { Dataset } from "../core/types";

// v3 실시간 내 위치(R-25). 앱이 기기 위치를 받으면 요청 머리글 `x-here: 위도,경도`로 보낸다.
// 서버는 거리 계산에만 쓰고 기록(DB·로그)에 남기지 않는다. 형식이 틀리거나 국내 범위 밖이면 무시하고
// 사장님이 고른 위치(location_id)를 그대로 쓴다.

export const HERE_HEADER = "x-here";
const KOREA = { latMin: 33, latMax: 39, lngMin: 124, lngMax: 132 };

export type Here = { lat: number; lng: number };

export function parseHere(value: string | null): Here | null {
  if (!value) return null;
  const m = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(value);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  if (!(lat >= KOREA.latMin && lat <= KOREA.latMax && lng >= KOREA.lngMin && lng <= KOREA.lngMax)) return null;
  // 약 10m 단위로 반올림해 쓴다
  return { lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4 };
}

// 이번 요청에서만 쓰는 데이터 사본: 모든 위치의 좌표를 지금 위치로 바꾼다.
// 동네(dong) 이름은 고른 위치 것을 유지한다(배송 동네 판정용).
export function withHere(data: Dataset, req: Request): Dataset {
  const here = parseHere(req.headers.get(HERE_HEADER));
  if (!here) return data;
  return { ...data, locations: data.locations.map((l) => ({ ...l, lat: here.lat, lng: here.lng })) };
}
