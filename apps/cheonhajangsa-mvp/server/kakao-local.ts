// 카카오 로컬 API(키워드로 장소 검색)로 동네 가게의 전화번호·카카오맵 장소 링크를 찾는다(2026-11-26 사용자 승인).
// - 공공 상가정보에는 전화·영업시간이 없다. 영업시간은 API로 받을 수 없어 장소 링크(카카오맵 장소 페이지)로 보여 준다.
// - 카카오 이용정책상 검색 결과를 따로 저장하지 않는다: 화면을 열 때마다 조회하고, 파일·DB·캐시에 남기지 않는다.
// - 키(KAKAO_REST_KEY)는 서버에만 둔다. 키가 없거나 조회가 실패·지연되면 null → 화면은 원래대로(응답을 막지 않음).
// 문서: docs/data-sources/store-hours-phone-plan.md

export type PlaceContact = { phone: string | null; place_url: string | null };
export type PlaceLookup = (p: { name: string; lat: number; lng: number }) => Promise<PlaceContact | null>;

type KakaoDoc = { place_name: string; phone?: string; place_url?: string; distance?: string; x: string; y: string };

const ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";
const MAX_DISTANCE_M = 120; // 공공데이터 좌표와 카카오 좌표가 이만큼 안에 있어야 같은 가게로 본다

// 이름 비교용: 공백·괄호·법인 표기·지점 표기를 뺀다
export function normalizeName(name: string): string {
  return name
    .replace(/\((주|유|합)\)|주식회사|농업회사법인|유한회사/g, "")
    .replace(/[\s()[\]·.,\-_/|;]/g, "")
    .replace(/(본점|지점|점)$/g, "")
    .toLowerCase();
}

// 같은 가게인지: 거리가 가깝고 이름 한쪽이 다른 쪽을 품는다
export function pickMatch(name: string, docs: KakaoDoc[]): KakaoDoc | null {
  const target = normalizeName(name);
  if (target.length < 2) return null;
  const close = docs.filter((d) => d.distance === undefined || d.distance === "" || Number(d.distance) <= MAX_DISTANCE_M);
  return close.find((d) => {
    const n = normalizeName(d.place_name);
    return n.length >= 2 && (n.includes(target) || target.includes(n));
  }) ?? null;
}

export function createKakaoLookup(key: string | null, opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): PlaceLookup | undefined {
  if (!key) return undefined;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 1500;
  return async ({ name, lat, lng }) => {
    try {
      const url = `${ENDPOINT}?${new URLSearchParams({ query: name, x: String(lng), y: String(lat), radius: String(MAX_DISTANCE_M * 2), sort: "distance", size: "5" })}`;
      const res = await fetchImpl(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) return null;
      const body = (await res.json()) as { documents?: KakaoDoc[] };
      const doc = pickMatch(name, body.documents ?? []);
      if (!doc) return null;
      return { phone: doc.phone?.trim() || null, place_url: doc.place_url?.trim() || null };
    } catch {
      return null; // 조회 실패는 응답을 막지 않는다
    }
  };
}
