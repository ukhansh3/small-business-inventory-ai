import { describe, expect, it } from "vitest";
import { epsg5174ToWgs84 } from "../../core/epsg5174";
import { SUPPLY_SOURCE, validateSupplyVendors, type SupplyVendorsFile } from "../../core/supply-vendors";
import supplyVendors from "../../data/supply_vendors.json";
import { readEnv } from "../../server/env";
import { handleStores, type Store } from "../../server/handlers/stores";
import { baseDataset, MON_1000, northOf } from "../fixtures/dataset";

// v3 식자재 납품업체(R-26): 인허가 좌표 변환과 지도 표시

describe("EPSG:5174 → WGS84", () => {
  it("proj4 결과와 1m 안으로 같다", () => {
    // 기대값: proj4 2.12.1, EPSG:5174 정의(towgs84 포함)로 계산
    const cases: [number, number, number, number][] = [
      [200661.86853376, 416704.413771515, 37.2522696, 127.0082515],
      [205000, 420000, 37.2819511, 127.0571717],
      [195000, 412000, 37.2098674, 126.9444644],
    ];
    for (const [x, y, lat, lng] of cases) {
      const r = epsg5174ToWgs84(x, y);
      expect(Math.abs(r.lat - lat) * 111_000).toBeLessThan(1);
      expect(Math.abs(r.lng - lng) * 88_000).toBeLessThan(1);
    }
  });
});

describe("식자재 납품업체 저장본", () => {
  it("형식이 맞고 모두 수원 범위 안이다", () => {
    const v = validateSupplyVendors(supplyVendors);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.data.stores.length).toBeGreaterThan(0);
  });
  it("id가 겹치면 실패한다", () => {
    const one = { store_id: "sv_1_1", name: "가", address: "수원", phone: null, licensed_on: null, lat: 37.28, lng: 127.04 };
    const v = validateSupplyVendors({ source: SUPPLY_SOURCE, source_date: "2026-11-25", rule: "r", stores: [one, one] });
    expect(v.ok).toBe(false);
  });
});

describe("지도용 가게에 납품업체가 들어간다", () => {
  const supply: SupplyVendorsFile = {
    source: SUPPLY_SOURCE, source_date: "2026-11-25", rule: "테스트",
    stores: [
      { store_id: "sv_1_1", name: "납품가까운", address: "주소", phone: "031-111-2222", licensed_on: null, ...{ lat: northOf(200).lat, lng: 127.04 } },
      { store_id: "sv_1_2", name: "납품번호없음", address: "주소", phone: null, licensed_on: null, ...{ lat: northOf(600).lat, lng: 127.04 } },
    ],
  };
  it("출처·기준일·전화와 함께 거리순으로, 가격 카드는 없이", async () => {
    const res = await handleStores(new Request("http://test/api/v1/stores?location_id=loc_test", { headers: { "x-device-id": "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c" } }),
      { data: baseDataset([], []), publicStores: { source: "소상공인시장진흥공단 상가(상권)정보", source_date: "2026-09-30", rule: "t", stores: [] }, supplyVendors: supply, env: readEnv({}), clock: () => MON_1000 });
    const b = (await res.json()) as { stores: Store[] };
    expect(b.stores.map((s) => s.name)).toEqual(["납품가까운", "납품번호없음"]);
    expect(b.stores[0]).toMatchObject({ kind: "public", category: "식자재 납품업체", source: SUPPLY_SOURCE, source_date: "2026-11-25", phone: "031-111-2222" });
    expect(b.stores[0]!.vendor_card).toBeUndefined();
    expect(b.stores[1]!.phone).toBeNull();
  });
});
