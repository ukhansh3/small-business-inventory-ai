import type { AskSlot, ChoiceValue, FieldSourceMap, Location, PartialCondition, PriceCheck, SearchResponse, Slot, Store, TurnResponse, VendorDetail } from "./api-types";
import { getDeviceId, isTestDevice } from "./device";

// API 클라이언트. 배포는 같은 출처(BASE 비움). 로컬 개발(expo start, __DEV__)은 값이 비어 있으면 로컬 API 서버로 보낸다.
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ ? "http://localhost:8787" : "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export class NetworkError extends Error {}

async function post<T>(path: string, body: unknown, keepalive = false): Promise<T> {
  return request<T>("POST", path, body, keepalive);
}

async function request<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown, keepalive = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-device-id": getDeviceId(), ...(isTestDevice() ? { "x-test-device": "true" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive, // 전화 앱으로 넘어가도 기록 요청이 끊기지 않게
    });
  } catch {
    throw new NetworkError("연결이 끊겼어요.");
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.status, "INTERNAL", "잠시 문제가 있어요. 다시 시도해 주세요.");
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; detail?: unknown } }).error;
    throw new ApiError(res.status, err?.code ?? "INTERNAL", err?.message ?? "잠시 문제가 있어요. 다시 시도해 주세요.", err?.detail);
  }
  return data as T;
}

type TurnState = { session_id: string | null; turn_seq: number; condition: PartialCondition; field_source: FieldSourceMap };

// API-01
export function sendTurn(state: TurnState, input: { type: "text"; text: string } | { type: "choice"; slot: AskSlot; value: ChoiceValue }) {
  return post<TurnResponse>("/api/v1/assist/turns", { ...state, input });
}

// API-02
export function searchByCondition(body: {
  session_id: string;
  condition: PartialCondition & { version: number; field_source: FieldSourceMap };
  changed: Slot[];
}) {
  return post<SearchResponse>("/api/v1/search", body);
}

// API-05
export function requestItem(body: { requested_text: string; matched_item_id: string | null; session_id: string | null }) {
  return post<{ request_id: string; message: string }>("/api/v1/item-requests", body);
}

// API-06: 앱을 열 때 한 번. 기록용이라 실패해도 화면은 그대로 쓴다.
export function registerDevice(screenWidth: number) {
  const device_id = getDeviceId();
  return post<{ device_id: string; is_new: boolean; location: Location }>("/api/v1/devices", { device_id, screen_width: Math.round(screenWidth) });
}

// API-04
export function sendEvent(body: {
  client_event_id: string;
  type: "call_click" | "restart";
  session_id: string | null;
  vendor_id?: string;
  payload?: Record<string, unknown>;
}) {
  return post<{ accepted: boolean }>("/api/v1/events", body, true);
}

// API-14
export function getLocations() {
  return request<{ locations: Location[] }>("GET", "/api/v1/locations");
}

// API-07
export function updateMyLocation(location_id: string) {
  return request<{ location: Location }>("PATCH", "/api/v1/devices/me", { location_id });
}

// API-03
export function getVendorDetail(vendorId: string, q: { item_id: string; location_id: string; session_id?: string; rank?: string }) {
  const params = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => !!e[1]));
  return request<VendorDetail>("GET", `/api/v1/vendors/${encodeURIComponent(vendorId)}?${params}`);
}

// API-15 사진 진단(사진은 photo.ts에서 줄여 3MB 이하)
export function postPhotoCheck(body: { image: { media_type: "image/jpeg"; data: string }; session_id: string | null; location_id: string | null }) {
  return post<PriceCheck>("/api/v1/price-checks", { image: body.image, session_id: body.session_id, ...(body.location_id ? { location_id: body.location_id } : {}) });
}

// API-16 시세에 보태기(동의)
export function sharePriceCheck(checkId: string) {
  return request<{ shared_lines: number }>("PATCH", `/api/v1/price-checks/${encodeURIComponent(checkId)}`, { share: true });
}

// API-18 지도용 가게(판매처 + 공공데이터), 내 위치 기준 거리순
export function getStores(locationId: string | null) {
  const q = locationId ? `?location_id=${encodeURIComponent(locationId)}` : "";
  return request<{ location_id: string; stores: Store[] }>("GET", `/api/v1/stores${q}`);
}
