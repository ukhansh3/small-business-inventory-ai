import { describe, expect, it } from "vitest";
import { testParamChange } from "../../src/lib/device";

describe("테스트 기기 표시(?test=1)", () => {
  it("?test=1이면 켜고 기기 번호를 새로 받는다", () => {
    expect(testParamChange("?test=1", false)).toEqual({ test: true, rotate: true });
  });
  it("이미 켜져 있으면 다시 바꾸지 않는다", () => {
    expect(testParamChange("?test=1", true)).toEqual({ test: true, rotate: false });
    expect(testParamChange("", true)).toEqual({ test: true, rotate: false });
  });
  it("?test=0이면 끄고 기기 번호를 새로 받는다", () => {
    expect(testParamChange("?test=0", true)).toEqual({ test: false, rotate: true });
  });
  it("값이 없거나 다른 값이면 그대로", () => {
    expect(testParamChange("", false)).toEqual({ test: false, rotate: false });
    expect(testParamChange("?test=yes", false)).toEqual({ test: false, rotate: false });
  });
});
