import { z } from "zod";
import { handle, HttpError, isTestDevice, isUuid, json, readJson, requireDevice } from "../http";
import type { Logger } from "../log/logger";
import { noopLogger } from "../log/noop";

// API-04 행동 기록: POST /api/v1/events. 같은 client_event_id는 한 번만 남는다(DB unique).
// call_click은 앱이 tel:을 열기 전에 보내지만, 기록 실패가 전화를 막지 않도록 항상 202로 답한다.

const TYPES = ["call_click", "vendor_view", "condition_edit", "restart", "app_open", "location_set"] as const;

const bodySchema = z
  .strictObject({
    client_event_id: z.string().refine(isUuid, "uuid여야 함"),
    type: z.enum(TYPES),
    session_id: z.string().refine(isUuid, "uuid여야 함").nullable().optional(),
    vendor_id: z.string().min(1).max(20).nullable().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => !(b.type === "call_click" || b.type === "vendor_view") || !!b.vendor_id, { message: "vendor_id 필요", path: ["vendor_id"] });

export function handleEvent(req: Request, deps: { log?: Logger }): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new HttpError("INVALID_INPUT", "기록 형식이 올바르지 않아요.", parsed.error.issues.map((i) => i.path.join(".")));
    }
    const b = parsed.data;
    const accepted = await (deps.log ?? noopLogger).logEvent({
      device_id: deviceId,
      is_test: isTestDevice(req),
      client_event_id: b.client_event_id,
      type: b.type,
      session_id: b.session_id ?? null,
      vendor_id: b.vendor_id ?? null,
      payload: b.payload ?? {},
    });
    if (!accepted) throw new HttpError("RATE_LIMITED", "잠시 후 다시 시도해 주세요.");
    return json(202, { accepted: true });
  });
}
