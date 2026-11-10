import { describe, expect, it } from "vitest";
import { isPhoneUserAgent, planCall } from "../../src/lib/call";

describe("AC-13 전화하기", () => {
  it("예시 판매처는 휴대폰에서도 tel:을 열지 않고 안내만", () => {
    expect(planCall({ is_example: true, phone: "000-0000-0001" }, true)).toEqual({ kind: "example", phone: "000-0000-0001" });
    expect(planCall({ is_example: true, phone: "000-0000-0001" }, false).kind).toBe("example");
  });
  it("실제 판매처: 휴대폰이면 tel:, PC면 번호 표시", () => {
    expect(planCall({ is_example: false, phone: "031-123-4567" }, true)).toEqual({ kind: "dial", url: "tel:0311234567" });
    expect(planCall({ is_example: false, phone: "031-123-4567" }, false)).toEqual({ kind: "show", phone: "031-123-4567" });
  });
  it("휴대폰 판별", () => {
    expect(isPhoneUserAgent("Mozilla/5.0 (Linux; Android 14) Mobile Safari")).toBe(true);
    expect(isPhoneUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140")).toBe(false);
  });
});
