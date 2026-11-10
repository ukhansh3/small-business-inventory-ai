import { z } from "zod";
import type { Dataset } from "../../core/types";
import { seoulNow } from "../../core/time";
import { findCandidates } from "../ai/retrieval";
import { AiUnavailableError } from "../ai/types";
import type { VisionClient } from "../ai/vision";
import type { ServerEnv } from "../env";
import { handle, HttpError, isTestDevice, isUuid, json, readJson, requestNow, requireDevice } from "../http";
import { LIMITS, type Logger } from "../log/logger";
import { noopLogger } from "../log/noop";
import { buildPriceCheck, marketFor } from "../price-check";

// v2 단가 진단 API(docs/feature-v2.md, API 명세 3.5)
// API-15 POST /price-checks(사진), API-16 PATCH /price-checks/{id}(시세 보태기), API-17 GET /market

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // base64로 약 4MB. Vercel 함수 본문 한도 4.5MB

export type PriceChecksDeps = { data: Dataset; env: ServerEnv; vision: VisionClient; clock?: () => Date; log?: Logger };

const photoSchema = z.strictObject({
  image: z.strictObject({ media_type: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().min(1) }),
  session_id: z.string().refine(isUuid, "uuid여야 함").nullable().optional(),
  location_id: z.string().min(1).max(40).optional(),
});

// 파일 앞부분으로 실제 이미지인지 확인
function looksLikeImage(bytes: Buffer, mediaType: string): boolean {
  if (mediaType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mediaType === "image/png") return bytes.subarray(0, 4).toString("hex") === "89504e47";
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export function handlePhotoCheck(req: Request, deps: PriceChecksDeps): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const parsed = photoSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError("INVALID_INPUT", "사진을 다시 골라 주세요.");
    const b = parsed.data;
    const bytes = Buffer.from(b.image.data, "base64");
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !looksLikeImage(bytes, b.image.media_type)) {
      throw new HttpError("INVALID_INPUT", "사진을 다시 골라 주세요.");
    }
    const locationId = deps.data.locations.some((l) => l.id === b.location_id) ? b.location_id! : deps.data.locations.find((l) => l.is_default)!.id;
    const log = deps.log ?? noopLogger;
    const now = requestNow(req, deps.env, deps.clock);

    // 호출 한도(API 명세 1.5): 사진도 AI 호출로 센다
    const gate = await log.aiGate({
      device_id: deviceId,
      session_id: b.session_id ?? null,
      usage_date: seoulNow(now).date,
      ai_call: true,
      hour_limit: LIMITS.hourTurnsPerDevice,
      session_limit: LIMITS.aiCallsPerSession,
    });
    if (gate && gate.hour_turns >= LIMITS.hourTurnsPerDevice) throw new HttpError("RATE_LIMITED", "요청이 많아요. 잠시 후 다시 시도해 주세요.");

    let read;
    try {
      if (gate && (gate.session_ai_calls >= LIMITS.aiCallsPerSession || gate.daily_calls > deps.env.aiDailyLimit)) throw new AiUnavailableError("호출 한도");
      read = await deps.vision.read(b.image, findCandidates("", deps.data.items));
    } catch (e) {
      if (e instanceof AiUnavailableError) throw new HttpError("AI_UNAVAILABLE", "사진을 읽지 못했어요. 다시 찍거나 가격을 글로 적어 주세요. 예: 상추 2kg 1만원");
      throw e;
    }

    const check = await buildPriceCheck(
      { data: deps.data, log },
      {
        device_id: deviceId,
        is_test: isTestDevice(req),
        session_id: b.session_id ?? null,
        location_id: locationId,
        now,
        ai_mode: deps.vision.mode,
        model: deps.vision.model,
        source: "photo",
        doc_type: read.doc_type,
        seller_type: read.seller_type,
        purchased_on: read.purchased_on,
        delivery_fee_won: read.delivery_fee_won,
        lines: read.lines.map((l) => ({ raw_name: l.raw_name, item_id: l.item_id, qty_kg: l.weight_kg_total, amount_won: l.amount_won })),
      },
    );
    return json(200, check);
  });
}

// API-16: 같은 기기가 만든 진단의 비교 가능한 줄만 시세에 보탠다(동의)
export function handleSharePriceCheck(req: Request, deps: { log?: Logger }): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const checkId = decodeURIComponent(new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "");
    const parsed = z.strictObject({ share: z.literal(true) }).safeParse(await readJson(req));
    if (!isUuid(checkId) || !parsed.success) throw new HttpError("INVALID_INPUT", "요청 형식이 올바르지 않아요.");
    const n = await (deps.log ?? noopLogger).sharePriceCheck({ device_id: deviceId, check_id: checkId });
    if (n === null) throw new HttpError("STORAGE_UNAVAILABLE", "지금은 저장할 수 없어요. 잠시 뒤 다시 눌러 주세요.");
    if (n < 0) throw new HttpError("NOT_FOUND", "진단 기록을 찾을 수 없어요.");
    return json(200, { shared_lines: n });
  });
}

// API-17 동네 시세
export function handleMarket(req: Request, deps: { data: Dataset; log?: Logger }): Promise<Response> {
  return handle(async () => {
    requireDevice(req);
    const itemId = new URL(req.url).searchParams.get("item_id");
    const item = deps.data.items.find((i) => i.id === itemId);
    if (!item) throw new HttpError("INVALID_INPUT", "품목이 필요해요.");
    if (!item.active) throw new HttpError("ITEM_NOT_ACTIVE", "아직 상추만 준비돼 있어요.");
    return json(200, await marketFor(deps, item.id));
  });
}
