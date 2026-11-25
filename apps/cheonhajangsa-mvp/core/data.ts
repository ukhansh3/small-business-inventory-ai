import items from "../data/items.json";
import locations from "../data/locations.json";
import offers from "../data/offers.json";
import vendors from "../data/vendors.json";
import marketPrices from "../data/market_prices.json";
import { validateMarketPrices, type MarketPricesFile } from "./market-prices";
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

// v3: 수원 실제 시세 저장본. 형식이 틀리면 시작할 때 실패한다
export function loadMarketPrices(): MarketPricesFile {
  const result = validateMarketPrices(marketPrices);
  if (!result.ok) throw new Error(`시세 저장본 형식 오류:\n${result.errors.join("\n")}`);
  return result.data;
}
