import { describe, expect, it } from "vitest";
import { readEnv } from "../../server/env";
import { handleSearch } from "../../server/handlers/search";
import { parseHere, withHere } from "../../server/here";
import { A, baseDataset, E, MON_1000, offer } from "../fixtures/dataset";

// v3 실시간 내 위치(R-25): x-here 머리글은 거리 계산에만 쓰고, 틀린 값은 무시한다

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const SESSION = "9e21f0a2-7b3c-4d5e-8f60-112233445566";

describe("x-here 머리글 읽기", () => {
  it("위도,경도를 읽고 약 10m 단위로 반올림한다", () => {
    expect(parseHere("37.279512,127.043833")).toEqual({ lat: 37.2795, lng: 127.0438 });
    expect(parseHere(" 37.28 , 127.04 ")).toEqual({ lat: 37.28, lng: 127.04 });
  });
  it("형식이 틀리거나 국내 범위 밖이면 무시한다", () => {
    for (const v of [null, "", "abc", "37.28", "37.28;127.04", "51.5,-0.12", "37.28,127.04,1", "99,127"]) {
      expect(parseHere(v)).toBeNull();
    }
  });
  it("머리글이 있으면 모든 위치의 좌표만 바꾸고 동네 이름은 그대로 둔다", () => {
    const data = baseDataset([], []);
    const req = new Request("http://test", { headers: { "x-here": "37.25,127.00" } });
    const out = withHere(data, req);
    expect(out.locations[0]).toMatchObject({ id: "loc_test", dong: "원천동", lat: 37.25, lng: 127.0 });
    expect(data.locations[0]!.lat).toBe(37.28); // 원본은 바뀌지 않는다
    expect(withHere(data, new Request("http://test"))).toBe(data);
  });
});

describe("검색 거리가 실시간 위치를 따른다", () => {
  const data = baseDataset([A, E], [offer("v_101"), offer("v_105")]);
  const deps = { data, env: readEnv({}), clock: () => MON_1000 };
  const post = (headers: Record<string, string>) =>
    new Request("http://test/api/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-device-id": DEVICE, ...headers },
      body: JSON.stringify({ session_id: SESSION, condition: { item_id: "item_lettuce", qty_kg: null, urgency: "now", fulfillment: "pickup", location_id: "loc_test" } }),
    });
  const distances = async (headers: Record<string, string>) => {
    const body = await (await handleSearch(post(headers), deps)).json();
    return body.results.groups.flatMap((g: { items: { vendor_id: string; distance: { meters: number } }[] }) => g.items.map((c) => [c.vendor_id, c.distance.meters]));
  };
  it("머리글이 없으면 고른 위치 기준, 있으면 지금 위치 기준으로 거리가 바뀐다", async () => {
    const base = await distances({});
    const moved = await distances({ "x-here": "37.30,127.06" });
    expect(base.length).toBe(2);
    expect(moved).not.toEqual(base);
  });
  it("조건(condition)과 기록 대상 값에는 좌표가 들어가지 않는다", async () => {
    const body = await (await handleSearch(post({ "x-here": "37.30,127.06" }), deps)).json();
    expect(JSON.stringify(body.condition)).not.toMatch(/37\.3|127\.06/);
  });
});
