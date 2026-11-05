import { describe, expect, it } from "vitest";
import type { PublicStoresFile } from "../../core/public-stores";
import { readEnv } from "../../server/env";
import { handleStores, type Store } from "../../server/handlers/stores";
import { baseDataset, MON_1000, northOf, offer, vendor } from "../fixtures/dataset";

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const data = baseDataset(
  [vendor("v_601", "판매처먼", northOf(900)), vendor("v_602", "판매처가까운", northOf(50))],
  [offer("v_601", { price: 4000, price_unit_label: "1kg", unit_kg: 1, price_source: "현장확인", price_checked_on: "2026-11-03" }), offer("v_602")],
);
const at = (m: number) => ({ lat: northOf(m).lat, lng: 127.04 });
const publicStores: PublicStoresFile = {
  source: "소상공인시장진흥공단 상가(상권)정보",
  source_date: "2026-09-30",
  rule: "테스트",
  stores: [
    { store_id: "ps_A1", name: "공공가게중간", category: "채소/과일", gu: "수원시 영통구", dong: "원천동", address: "주소1", ...at(300) },
    { store_id: "ps_A2", name: "공공가게아주먼", category: "슈퍼마켓", gu: "수원시 팔달구", dong: "우만1동", address: "주소2", ...at(3000) },
  ],
};
const get = (q: string, headers: Record<string, string> = { "x-device-id": DEVICE }) =>
  handleStores(new Request(`http://test/api/v1/stores?${q}`, { headers }), { data, publicStores, env: readEnv({}), clock: () => MON_1000 });

describe("API-18 지도용 가게", () => {
  it("AC-28 판매처와 공공데이터 가게를 거리순으로", async () => {
    const res = await get("location_id=loc_test");
    expect(res.status).toBe(200);
    const b = (await res.json()) as { stores: Store[] };
    expect(b.stores.map((s) => s.name)).toEqual(["판매처가까운", "공공가게중간", "판매처먼", "공공가게아주먼"]);
    expect(b.stores[0]).toMatchObject({ kind: "vendor", vendor_card: { vendor_id: "v_602" } });
  });

  it("AC-29 공공데이터 가게는 가격·입고·번호 없이 출처와 기준일만", async () => {
    const b = (await (await get("location_id=loc_test")).json()) as { stores: Store[] };
    const p = b.stores.find((s) => s.store_id === "ps_A1")!;
    expect(p).toMatchObject({ kind: "public", source: "소상공인시장진흥공단 상가(상권)정보", source_date: "2026-09-30" });
    expect(p.vendor_card).toBeUndefined();
    expect(JSON.stringify(p)).not.toMatch(/phone|price|restock/);
  });

  it("bbox로 화면 영역 안만, 잘못된 bbox는 400, 기기 id 없으면 401", async () => {
    const box = `127.0,37.28,127.1,${(northOf(1000).lat).toFixed(5)}`;
    const b = (await (await get(`location_id=loc_test&bbox=${box}`)).json()) as { stores: Store[] };
    expect(b.stores.map((s) => s.name)).toEqual(["판매처가까운", "공공가게중간", "판매처먼"]);
    expect((await get("bbox=1,2,3")).status).toBe(400);
    expect((await get("location_id=loc_test", {})).status).toBe(401);
  });
});
