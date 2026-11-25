import { describe, expect, it } from "vitest";
import { hoursSummary } from "../../core/time";
import { groupRows } from "../../src/lib/store-groups";
import { activityText, displayName, toneOf } from "../../src/lib/store-tone";

// v3 화면 정리: 출처 구분·이름 정리·영업시간 한 줄·도매시장 묶음

const s = (id: string, category: string, lat = 37.2514, lng = 127.039) => ({ store: { store_id: id, category, lat, lng, address: "경기 수원시 권선구 세권로 243 수원시농수산물도매시장 (경기청과)" } });

describe("출처 구분과 이름", () => {
  it("업종·시연 여부로 출처를 나눈다", () => {
    expect(toneOf({ category: "도매시장 중도매인" })).toBe("wholesale");
    expect(toneOf({ category: "식자재 납품업체" })).toBe("supply");
    expect(toneOf({ category: "채소/과일" })).toBe("shop");
    expect(toneOf({ category: "청소·방역", demo_service: "주방 청소" })).toBe("demo");
  });
  it("원천 구분자를 공백으로 바꾼다", () => {
    expect(displayName("럭키;과일;야채")).toBe("럭키 과일 야채");
    expect(displayName("의림상회 · 경기청과")).toBe("의림상회 · 경기청과");
  });
  it("0인 사용·저장 수는 보여 주지 않는다", () => {
    expect(activityText(0, 0)).toBeNull();
    expect(activityText(undefined, undefined)).toBeNull();
    expect(activityText(3, 0)).toBe("사용 3명");
    expect(activityText(2, 1)).toBe("사용 2명 · 저장 1명");
  });
});

describe("영업시간 한 줄", () => {
  const day = { open: "03:00", close: "19:00" };
  it("같은 시간이 이어지면 묶고 휴무일을 붙인다", () => {
    expect(hoursSummary({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: "closed" })).toBe("월~토 03:00~19:00 · 일 휴무");
    expect(hoursSummary({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day })).toBe("매일 03:00~19:00");
  });
});

describe("도매시장 묶음", () => {
  it("같은 자리 중도매인 2곳 이상은 처음 자리에 한 묶음으로, 나머지 순서는 그대로", () => {
    const rows = groupRows([s("a", "채소/과일", 37.28, 127.04), s("w1", "도매시장 중도매인"), s("b", "슈퍼마켓", 37.29, 127.05), s("w2", "도매시장 중도매인")]);
    expect(rows.map((r) => (r.type === "single" ? r.item.store.store_id : `${r.title}:${r.items.length}`))).toEqual(["a", "수원 농수산물도매시장 중도매인:2", "b"]);
  });
  it("중도매인이 한 곳뿐이면 묶지 않는다", () => {
    expect(groupRows([s("w1", "도매시장 중도매인")])[0]!.type).toBe("single");
  });
});
