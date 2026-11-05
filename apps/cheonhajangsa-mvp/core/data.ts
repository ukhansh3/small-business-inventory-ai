import items from "../data/items.json";
import locations from "../data/locations.json";
import offers from "../data/offers.json";
import vendors from "../data/vendors.json";
import type { Dataset } from "./types";
import { validateDataset } from "./validate";

// 데이터 파일을 정적으로 불러온다(서버 함수 번들에 함께 들어간다). 형식이 틀리면 시작할 때 실패한다.
export function loadDataset(): Dataset {
  const result = validateDataset({ items, locations, vendors, offers });
  if (!result.ok) {
    throw new Error(`데이터 파일 형식 오류:\n${result.errors.join("\n")}`);
  }
  return result.data;
}

export const rawDataset = { items, locations, vendors, offers };
