import { z } from "zod";
import type { Dataset } from "../../core/types";
import { hasExampleData } from "../condition";
import { handle, HttpError, isTestDevice, isUuid, json, readJson, requireDevice } from "../http";
import type { Logger } from "../log/logger";
import { noopLogger } from "../log/noop";

// API-06 기기 등록: POST /api/v1/devices. 앱이 열릴 때 한 번(WF-01, 기록 E-05·E-10 app_open)

const bodySchema = z.strictObject({
  device_id: z.string().refine(isUuid, "uuid여야 함"),
  screen_width: z.number().int().min(0).max(10000).optional(),
});

export type DevicesDeps = { data: Dataset; log?: Logger };

export function toLocation(data: Dataset, id: string | null) {
  const loc = data.locations.find((l) => l.id === id) ?? data.locations.find((l) => l.is_default)!;
  return { location_id: loc.id, name: loc.name, dong: loc.dong, lat: loc.lat, lng: loc.lng, is_default: loc.is_default };
}

export function handleRegisterDevice(req: Request, deps: DevicesDeps): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success || parsed.data.device_id !== deviceId) {
      throw new HttpError("INVALID_INPUT", "기기 정보가 올바르지 않아요.");
    }
    // 기록 저장소가 없으면(A8) 등록 여부를 알 수 없어 기본값으로 응답한다
    const row = await (deps.log ?? noopLogger).registerDevice(deviceId, isTestDevice(req));
    return json(row?.is_new ? 201 : 200, {
      device_id: deviceId,
      is_new: row?.is_new ?? false,
      location: toLocation(deps.data, row?.location_id ?? null),
      business_type: row?.business_type ?? null,
      example_data: hasExampleData(deps.data),
    });
  });
}

// API-07 내 위치·업종 저장: PATCH /api/v1/devices/me (WF-02)
const updateSchema = z
  .strictObject({
    location_id: z.string().min(1).max(40).optional(),
    business_type: z.string().trim().max(30).nullable().optional(),
  })
  .refine((b) => b.location_id !== undefined || b.business_type !== undefined, { message: "location_id 또는 business_type 필요" });

export function handleUpdateDevice(req: Request, deps: DevicesDeps): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const parsed = updateSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError("INVALID_INPUT", "바꿀 내용이 올바르지 않아요.");
    const b = parsed.data;
    if (b.location_id !== undefined && !deps.data.locations.some((l) => l.id === b.location_id)) {
      throw new HttpError("NOT_FOUND", "위치를 찾을 수 없어요.");
    }
    const saved = await (deps.log ?? noopLogger).setDevice({
      device_id: deviceId,
      is_test: isTestDevice(req),
      ...(b.location_id !== undefined ? { location_id: b.location_id } : {}),
      ...(b.business_type !== undefined ? { business_type: b.business_type } : {}),
    });
    if (!saved) throw new HttpError("STORAGE_UNAVAILABLE", "위치를 저장하지 못했어요. 이 기기에서만 적용돼요.");
    return json(200, { location: toLocation(deps.data, b.location_id ?? null), business_type: b.business_type ?? null });
  });
}

// API-14 위치 프리셋 목록: GET /api/v1/locations
export function handleLocations(req: Request, deps: DevicesDeps): Promise<Response> {
  return handle(async () => {
    requireDevice(req);
    return json(200, { locations: deps.data.locations.map((l) => toLocation(deps.data, l.id)) });
  });
}
