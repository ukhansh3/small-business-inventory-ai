import { describe, expect, it } from "vitest";
import { loadDataset, rawDataset } from "../../core/data";
import { validateDataset } from "../../core/validate";

// 실제 데이터 파일을 깊은 복사한 뒤 결함 하나씩 넣는다.
function clone() {
  return structuredClone(rawDataset) as unknown as {
    items: Record<string, unknown>[];
    locations: Record<string, unknown>[];
    vendors: Record<string, unknown>[];
    offers: Record<string, unknown>[];
  };
}

function expectInvalid(raw: unknown, fragment: string) {
  const r = validateDataset(raw);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors.join("\n")).toContain(fragment);
}

describe("AC-16 데이터 형식 검사", () => {
  it("실제 데이터 파일은 통과한다", () => {
    const r = validateDataset(rawDataset);
    if (!r.ok) throw new Error(r.errors.join("\n"));
    expect(r.ok).toBe(true);
    expect(() => loadDataset()).not.toThrow();
  });

  it("필수 칸이 빠지면 실패한다", () => {
    const d = clone();
    delete d.vendors[0]!.phone;
    expectInvalid(d, "vendors.0.phone");
  });

  it("허용값 밖이면 실패한다(판매처 종류)", () => {
    const d = clone();
    d.vendors[0]!.kind = "편의점";
    expectInvalid(d, "vendors.0.kind");
  });

  it("영업시간 형식이 틀리면 실패한다", () => {
    const d = clone();
    d.vendors[0]!.opening_hours = { ...(d.vendors[0]!.opening_hours as object), mon: { open: "7:00", close: "20:00" } };
    expectInvalid(d, "opening_hours.mon");
  });

  it("요일이 빠지면 실패한다", () => {
    const d = clone();
    const hours = { ...(d.vendors[0]!.opening_hours as Record<string, unknown>) };
    delete hours.sun;
    d.vendors[0]!.opening_hours = hours;
    expectInvalid(d, "opening_hours.sun");
  });

  it("판매처 id가 중복되면 실패한다", () => {
    const d = clone();
    d.vendors[1]!.id = d.vendors[0]!.id;
    expectInvalid(d, "id 중복");
  });

  it("없는 판매처를 가리키는 판매 정보는 실패한다", () => {
    const d = clone();
    d.offers[0]!.vendor_id = "v_999";
    expectInvalid(d, "없는 판매처");
  });

  it("R-10 가격이 있는데 출처가 없으면 실패한다", () => {
    const d = clone();
    d.offers[0]!.price_source = null;
    expectInvalid(d, "단위·출처·확인일");
  });

  it("예시 판매처의 가격 출처가 예시가 아니면 실패한다", () => {
    const d = clone();
    d.offers[0]!.price_source = "현장확인";
    expectInvalid(d, "예시 판매처");
  });

  it("기본 위치가 2개면 실패한다", () => {
    const d = clone();
    d.locations[1]!.is_default = true;
    expectInvalid(d, "기본 위치");
  });

  it("active 품목이 없으면 실패한다", () => {
    const d = clone();
    for (const it of d.items) it.active = false;
    expectInvalid(d, "active 품목");
  });

  it("배달을 안 하는데 배달 동네가 있으면 실패한다", () => {
    const d = clone();
    const v = d.vendors.find((x) => x.delivery_available === false)!;
    v.delivery_dongs = ["원천동"];
    expectInvalid(d, "배달 동네");
  });

  it("입고 요일이 허용값 밖이면 실패한다", () => {
    const d = clone();
    d.offers[0]!.restock_days = ["monday"];
    expectInvalid(d, "restock_days");
  });
});
