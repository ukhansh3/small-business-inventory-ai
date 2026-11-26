import { describe, expect, it } from "vitest";
import { routeSearch } from "../../src/lib/search-route";

// 첫 화면 검색창: 사는 문장은 AI 도우미로, 가게 이름·업종은 지도 검색으로
describe("routeSearch", () => {
  it("품목이나 양·가격이 든 문장은 AI 도우미로 보낸다", () => {
    for (const text of ["상추 2키로 급해요", "상추", "대파 한 박스", "양파 한 망 만원", "깐양파 2키로", "5kg 오늘 배달"]) {
      expect(routeSearch(text), text).toBe("assistant");
    }
  });
  it("가게 이름·업종과 빈 입력은 지도 업체 검색으로 둔다", () => {
    for (const text of ["", "럭키 과일 야채", "진성마트", "채소", "파리바게뜨", "슈퍼마켓"]) {
      expect(routeSearch(text), text).toBe("stores");
    }
  });
});
