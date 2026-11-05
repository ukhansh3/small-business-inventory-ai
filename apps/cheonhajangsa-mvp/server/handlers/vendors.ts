import { randomUUID } from "node:crypto";
import { vendorDetail } from "../../core/detail";
import { SearchInputError } from "../../core/search";
import type { Dataset } from "../../core/types";
import { hasExampleData } from "../condition";
import type { ServerEnv } from "../env";
import { handle, HttpError, isTestDevice, isUuid, json, requestNow, requireDevice } from "../http";
import type { Logger } from "../log/logger";
import { noopLogger } from "../log/noop";

// API-03 판매처 상세: GET /api/v1/vendors/{vendorId}?item_id=&location_id=&session_id=&rank= (S-04, 기록 vendor_view)
// location_id가 비면 기본 위치(MVP는 서버가 기기 위치를 읽지 않는다. 앱이 내 위치를 늘 보낸다)

export type VendorsDeps = { data: Dataset; env: ServerEnv; clock?: () => Date; log?: Logger };

export function handleVendorDetail(req: Request, deps: VendorsDeps): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const url = new URL(req.url);
    const vendorId = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
    const q = url.searchParams;
    const itemId = q.get("item_id");
    if (!itemId) throw new HttpError("INVALID_INPUT", "품목이 필요해요.");
    const locationId = q.get("location_id") || deps.data.locations.find((l) => l.is_default)!.id;
    const sessionId = q.get("session_id");
    const rank = Number(q.get("rank"));

    let detail;
    try {
      detail = vendorDetail(deps.data, vendorId, itemId, locationId, requestNow(req, deps.env, deps.clock), Number.isInteger(rank) && rank > 0 ? rank : 1);
    } catch (e) {
      if (e instanceof SearchInputError) throw new HttpError(e.code, e.message);
      throw e;
    }
    await (deps.log ?? noopLogger).logEvent({
      device_id: deviceId,
      is_test: isTestDevice(req),
      client_event_id: randomUUID(),
      type: "vendor_view",
      session_id: isUuid(sessionId) ? sessionId : null,
      vendor_id: vendorId,
      payload: { rank: detail.card.rank, item_id: itemId, location_id: locationId },
    });
    return json(200, { ...detail, example_data: hasExampleData(deps.data) });
  });
}
