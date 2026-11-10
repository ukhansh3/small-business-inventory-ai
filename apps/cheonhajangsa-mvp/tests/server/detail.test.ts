import { describe, expect, it } from "vitest";
import { search } from "../../core/search";
import { readEnv } from "../../server/env";
import { handleLocations, handleUpdateDevice } from "../../server/handlers/devices";
import { handleVendorDetail } from "../../server/handlers/vendors";
import type { DeviceSettingsLog, EventLog, Logger } from "../../server/log/logger";
import { noopLogger } from "../../server/log/noop";
import { A, baseDataset, C, MON_1000, offer } from "../fixtures/dataset";

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const data = baseDataset([A, C], [offer("v_101", { min_sale_kg: 1 }), offer("v_103")]);
const env = readEnv({});

function recorder() {
  const seen = { events: [] as EventLog[], settings: [] as DeviceSettingsLog[] };
  const log: Logger = {
    ...noopLogger,
    enabled: true,
    async logEvent(e) {
      seen.events.push(e);
      return true;
    },
    async setDevice(e) {
      seen.settings.push(e);
      return true;
    },
  };
  return { log, seen };
}

const get = (path: string, headers: Record<string, string> = { "x-device-id": DEVICE }) => new Request(`http://test/api/v1/${path}`, { headers });
const patch = (body: unknown) =>
  new Request("http://test/api/v1/devices/me", { method: "PATCH", headers: { "content-type": "application/json", "x-device-id": DEVICE }, body: JSON.stringify(body) });

describe("API-03 판매처 상세", () => {
  it("카드 값이 결과 목록 카드와 같고, 요일별 영업시간 7개와 출처를 준다(AC-4·AC-6)", async () => {
    const { log, seen } = recorder();
    const res = await handleVendorDetail(get("vendors/v_103?item_id=item_lettuce&location_id=loc_test&rank=2&session_id=9e21aa00-1111-4222-8333-444455556666"), {
      data, env, clock: () => MON_1000, log,
    });
    expect(res.status).toBe(200);
    const d = await res.json();
    const fromSearch = search(data, { item_id: "item_lettuce", qty_kg: null, urgency: "now", fulfillment: "pickup", location_id: "loc_test" }, MON_1000)
      .groups.flatMap((g) => g.items)
      .find((c) => c.vendor_id === "v_103")!;
    expect({ ...d.card, rank: 0 }).toEqual({ ...fromSearch, rank: 0 });
    expect(d.card.rank).toBe(2);
    expect(d.opening_hours).toHaveLength(7);
    expect(d.opening_hours[0].day).toBe("mon");
    expect(d).toMatchObject({ address: C.address, dong: C.dong, data_status: C.data_status, example_data: expect.any(Boolean) });
    expect(seen.events[0]).toMatchObject({ type: "vendor_view", vendor_id: "v_103", session_id: "9e21aa00-1111-4222-8333-444455556666" });
  });

  it("없는 판매처·그 품목을 안 파는 곳은 404, 품목이 없으면 400, 기기 id가 없으면 401", async () => {
    const deps = { data, env, clock: () => MON_1000 };
    expect((await handleVendorDetail(get("vendors/v_999?item_id=item_lettuce"), deps)).status).toBe(404);
    expect((await handleVendorDetail(get("vendors/v_101?item_id=item_green_onion"), deps)).status).toBe(404);
    expect((await handleVendorDetail(get("vendors/v_101"), deps)).status).toBe(400);
    expect((await handleVendorDetail(get("vendors/v_101?item_id=item_lettuce", {}), deps)).status).toBe(401);
  });

  it("위치가 비면 기본 위치로 거리를 잰다", async () => {
    const res = await handleVendorDetail(get("vendors/v_101?item_id=item_lettuce"), { data, env, clock: () => MON_1000 });
    expect(res.status).toBe(200);
  });
});

describe("API-14·API-07 내 위치", () => {
  it("위치 목록은 Location 모양", async () => {
    const res = await handleLocations(get("locations"), { data });
    const b = await res.json();
    expect(b.locations[0]).toMatchObject({ location_id: "loc_test", is_default: true });
  });

  it("위치를 바꾸면 저장하고 Location을 돌려준다", async () => {
    const { log, seen } = recorder();
    const res = await handleUpdateDevice(patch({ location_id: "loc_test" }), { data, log });
    expect(res.status).toBe(200);
    expect((await res.json()).location.location_id).toBe("loc_test");
    expect(seen.settings[0]).toMatchObject({ device_id: DEVICE, location_id: "loc_test" });
  });

  it("없는 위치 404, 빈 요청 400", async () => {
    const { log } = recorder();
    expect((await handleUpdateDevice(patch({ location_id: "loc_nowhere" }), { data, log })).status).toBe(404);
    expect((await handleUpdateDevice(patch({}), { data, log })).status).toBe(400);
  });

  it("저장소가 없으면 503(WF-02: 앱이 이 기기에서만 적용하고 알린다)", async () => {
    const res = await handleUpdateDevice(patch({ location_id: "loc_test" }), { data, log: noopLogger });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("STORAGE_UNAVAILABLE");
  });
});
