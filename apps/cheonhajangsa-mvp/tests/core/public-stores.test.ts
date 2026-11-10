import { describe, expect, it } from "vitest";
import publicStores from "../../data/public_stores.json";
import { validatePublicStores } from "../../core/public-stores";

const ok = {
  store_id: "ps_MA0101",
  name: "영통청과",
  category: "채소/과일",
  gu: "수원시 영통구",
  dong: "영통1동",
  address: "경기도 수원시 영통구 예시로 1",
  lat: 37.25,
  lng: 127.05,
};
const file = (stores: unknown[]) => ({ source: "소상공인시장진흥공단 상가(상권)정보", source_date: "2026-09-30", rule: "규칙", stores });

describe("AC-27 공공데이터 가게", () => {
  it("실제 파일이 통과한다(영통·팔달만, 필수 칸 있음)", () => {
    const r = validatePublicStores(publicStores);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.stores.length).toBeGreaterThan(0);
  });
  it("영통·팔달 밖, 필수 칸 누락, 수원 밖 좌표, 허용 밖 업종, id 중복은 실패", () => {
    expect(validatePublicStores(file([ok])).ok).toBe(true);
    expect(validatePublicStores(file([{ ...ok, gu: "수원시 장안구" }])).ok).toBe(false);
    const { name: _n, ...noName } = ok;
    expect(validatePublicStores(file([noName])).ok).toBe(false);
    expect(validatePublicStores(file([{ ...ok, lat: 35.1 }])).ok).toBe(false);
    expect(validatePublicStores(file([{ ...ok, category: "편의점" }])).ok).toBe(false);
    expect(validatePublicStores(file([ok, ok])).ok).toBe(false);
  });
  it("R-22: 가격·번호 같은 칸을 넣으면 실패(공개 정보만)", () => {
    expect(validatePublicStores(file([{ ...ok, phone: "031-000-0000" }])).ok).toBe(false);
    expect(validatePublicStores(file([{ ...ok, price: 3000 }])).ok).toBe(false);
  });
});
