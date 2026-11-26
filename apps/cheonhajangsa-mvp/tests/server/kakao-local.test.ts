import { describe, expect, it, vi } from "vitest";
import type { PublicStoresFile } from "../../core/public-stores";
import { readEnv } from "../../server/env";
import { handleStores } from "../../server/handlers/stores";
import { createKakaoLookup, normalizeName, pickMatch } from "../../server/kakao-local";
import { baseDataset, MON_1000 } from "../fixtures/dataset";

// 카카오 로컬 조회(2026-11-26): 같은 가게만 붙이고, 키가 없거나 실패하면 조용히 빠진다
const doc = (place_name: string, distance: string, phone = "031-111-2222") =>
  ({ place_name, distance, phone, place_url: "http://place.map.kakao.com/1", x: "127.04", y: "37.28" });

describe("카카오 로컬 조회", () => {
  it("이름 비교는 공백·괄호·법인 표기를 뺀다", () => {
    expect(normalizeName("(주)럭키 과일 야채")).toBe("럭키과일야채");
    expect(normalizeName("진성마트 본점")).toBe("진성마트");
  });

  it("가깝고 이름이 맞는 곳만 고른다", () => {
    expect(pickMatch("럭키 과일 야채", [doc("다른가게", "10"), doc("럭키과일야채", "40")])?.place_name).toBe("럭키과일야채");
    expect(pickMatch("럭키 과일 야채", [doc("럭키과일야채", "500")])).toBeNull(); // 멀면 다른 가게
    expect(pickMatch("럭키 과일 야채", [doc("행운마트", "5")])).toBeNull();
  });

  it("키가 없으면 조회하지 않는다", () => {
    expect(createKakaoLookup(null)).toBeUndefined();
  });

  it("응답에서 전화·장소 링크를 꺼내고, 실패하면 null", async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ documents: [doc("럭키과일야채", "30")] })));
    const lookup = createKakaoLookup("k", { fetchImpl: ok as unknown as typeof fetch })!;
    await expect(lookup({ name: "럭키 과일 야채", lat: 37.28, lng: 127.04 })).resolves.toEqual({ phone: "031-111-2222", place_url: "http://place.map.kakao.com/1" });
    const url = String((ok.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("x=127.04");
    expect(url).toContain("y=37.28");

    const fail = createKakaoLookup("k", { fetchImpl: (async () => { throw new Error("net"); }) as typeof fetch })!;
    await expect(fail({ name: "럭키 과일 야채", lat: 37.28, lng: 127.04 })).resolves.toBeNull();
    const denied = createKakaoLookup("k", { fetchImpl: (async () => new Response("{}", { status: 401 })) as typeof fetch })!;
    await expect(denied({ name: "럭키 과일 야채", lat: 37.28, lng: 127.04 })).resolves.toBeNull();
  });
});

describe("업체 상세 연락처 GET /api/v1/stores?store_id=", () => {
  const publicStores: PublicStoresFile = {
    source: "소상공인시장진흥공단 상가(상권)정보", source_date: "2026-09-30", rule: "테스트",
    stores: [{ store_id: "ps_A1", name: "럭키 과일 야채", category: "채소/과일", gu: "수원시 팔달구", dong: "우만동", address: "주소", lat: 37.28, lng: 127.04 }],
  };
  const data = baseDataset([], []);
  const get = (id: string, lookupPlace?: Parameters<typeof handleStores>[1]["lookupPlace"]) =>
    handleStores(new Request(`http://test/api/v1/stores?store_id=${id}`, { headers: { "x-device-id": "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c" } }),
      { data, publicStores, env: readEnv({}), clock: () => MON_1000, lookupPlace });

  it("찾으면 전화·장소 링크와 출처를 준다", async () => {
    const res = await get("ps_A1", async () => ({ phone: "031-111-2222", place_url: "http://place.map.kakao.com/1" }));
    expect(await res.json()).toEqual({ store_id: "ps_A1", phone: "031-111-2222", place_url: "http://place.map.kakao.com/1", source: "카카오맵" });
  });

  it("조회가 없으면 빈 값, 없는 업체는 404", async () => {
    expect(await (await get("ps_A1")).json()).toEqual({ store_id: "ps_A1", phone: null, place_url: null, source: null });
    expect((await get("ps_none")).status).toBe(404);
  });
});
