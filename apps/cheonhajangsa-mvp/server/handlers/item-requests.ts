import { z } from "zod";
import { handle, HttpError, isTestDevice, isUuid, json, readJson, requireDevice } from "../http";
import { ItemRequestUnavailableError, type Logger } from "../log/logger";
import { noopLogger } from "../log/noop";

// API-05 품목 요청: POST /api/v1/item-requests (WF-10, AC-10).
// 같은 기기·같은 품목이면 새로 만들지 않고 200 + 기존 request_id.
// 저장이 목적이라 기록 저장소가 없거나 실패하면 저장한 척하지 않고 503으로 알린다(consistency-report C12).

const MESSAGE = "알려 주셔서 고마워요. 준비되면 먼저 보여 드릴게요.";

const bodySchema = z.strictObject({
  requested_text: z.string().trim().min(1).max(50),
  matched_item_id: z.string().min(1).max(40).nullable().optional(),
  session_id: z.string().refine(isUuid, "uuid여야 함").nullable().optional(),
});

export function handleItemRequest(req: Request, deps: { log?: Logger }): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new HttpError("INVALID_INPUT", "요청 내용이 올바르지 않아요.", parsed.error.issues.map((i) => i.path.join(".")));
    }
    const b = parsed.data;
    try {
      const r = await (deps.log ?? noopLogger).requestItem({
        device_id: deviceId,
        is_test: isTestDevice(req),
        requested_text: b.requested_text,
        matched_item_id: b.matched_item_id ?? null,
        session_id: b.session_id ?? null,
      });
      return json(r.created ? 201 : 200, { request_id: r.request_id, message: MESSAGE });
    } catch (e) {
      if (e instanceof ItemRequestUnavailableError) {
        throw new HttpError("STORAGE_UNAVAILABLE", "지금은 요청을 저장할 수 없어요. 잠시 뒤 다시 눌러 주세요.");
      }
      throw e;
    }
  });
}
