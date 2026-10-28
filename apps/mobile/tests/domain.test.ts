import { describe, expect, it } from "vitest";
import {
  findVendors,
  parseMapSelection,
  validMapUrl,
  trustedMapMessageOrigin,
} from "../src/domain/vendors";
import { validateRegistration } from "../src/domain/registration";
const draft = {
  name: "테스트 업체",
  contact: "테스트 연락처",
  address: "공개용 테스트 주소",
  items: [{ name: "양파", quantity: 10, unit: "kg", price: 18000 }],
};
describe("모바일 업체 등록 필수값", () => {
  it("업체와 품목 가격을 입력하면 형식 검증을 통과한다", () =>
    expect(validateRegistration(draft).success).toBe(true));
  it("품목이 없으면 거부한다", () =>
    expect(validateRegistration({ ...draft, items: [] }).success).toBe(false));
  it.each([0, -1, NaN, Infinity, 1.5])("잘못된 가격 %s를 거부한다", (price) =>
    expect(
      validateRegistration({ ...draft, items: [{ ...draft.items[0], price }] })
        .success,
    ).toBe(false),
  );
  it("빈 업체명과 연락처를 거부한다", () =>
    expect(
      validateRegistration({ ...draft, name: " ", contact: "" }).success,
    ).toBe(false));
  it("규격 수량과 단위를 필수로 받는다", () =>
    expect(
      validateRegistration({
        ...draft,
        items: [{ ...draft.items[0], quantity: 0, unit: "" }],
      }).success,
    ).toBe(false));
});
describe("지도와 샘플 목록", () => {
  it("업체가 취급하는 두 번째 품목도 찾는다", () =>
    expect(findVendors("감자").map((v) => v.id)).toEqual(["mobile-demo-a"]));
  it("분류와 품목을 함께 적용한다", () =>
    expect(findVendors("양파", "포장재")).toHaveLength(0));
  it("없는 검색 결과는 빈 배열이다", () =>
    expect(findVendors("없는 품목")).toEqual([]));
  it("표시한 업체 ID의 지도 선택만 허용한다", () => {
    expect(
      parseMapSelection('{"type":"select","vendorId":"other"}', [
        "mobile-demo-a",
      ]),
    ).toBeNull();
    expect(
      parseMapSelection('{"type":"select","vendorId":"mobile-demo-a"}', [
        "mobile-demo-a",
      ])?.vendorId,
    ).toBe("mobile-demo-a");
  });
  it.each([
    "bad json",
    "null",
    '{"type":"navigate","vendorId":"mobile-demo-a"}',
  ])("잘못된 브리지 메시지 %s를 무시한다", (raw) =>
    expect(parseMapSelection(raw, ["mobile-demo-a"])).toBeNull(),
  );
  it.each([
    "http://host/mobile-map",
    "https://host/wrong",
    "https://user:pass@host/mobile-map",
    "https://host/mobile-map?token=bad",
  ])("허용되지 않는 지도 URL %s를 거부한다", (url) =>
    expect(validMapUrl(url)).toBeNull(),
  );
  it("HTTPS 전용 지도 경로만 허용한다", () =>
    expect(validMapUrl("https://example.com/mobile-map")).toBe(
      "https://example.com/mobile-map",
    ));
});

describe("플랫폼별 지도 메시지 origin", () => {
  it.each(["https://example.com", "https://example.com/mobile-map"])(
    "Android origin 및 iOS URL %s를 허용한다",
    (url) =>
      expect(
        trustedMapMessageOrigin(url, "https://example.com/mobile-map"),
      ).toBe(true),
  );
  it.each([
    "https://example.com.evil.test/mobile-map",
    "http://example.com/mobile-map",
    "about:blank",
    "invalid",
  ])("다른 보안 origin %s를 거부한다", (url) =>
    expect(trustedMapMessageOrigin(url, "https://example.com/mobile-map")).toBe(
      false,
    ),
  );
});
