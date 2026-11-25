import { writeFileSync } from "node:fs";
import type { Offer, Vendor } from "../core/types";
import { validateDataset } from "../core/validate";
import { rawDataset } from "../core/data";

// 수원 농수산물도매시장 채소류 중도매인 명단 → data/vendors.json, data/offers.json
// 사용: npx tsx scripts/build-wholesalers.ts
// 출처: 수원시 "입주법인 소개 · 중도매인 현황"(공개 명단). 상호·취급부류·전화번호만 쓴다(성명은 쓰지 않는다).

const SOURCE_URL = "https://www.suwon.go.kr/sw-www/sw-agr/sw-agr-06/sw-agr-06-01/sw-agr-06-03-04.jsp";
const LIST_UPDATED_ON = "2026-10-28"; // 명단 페이지 수정일
// 표 순서대로의 법인. 앞의 셋이 청과 법인이다.
const CORPS = ["경기청과", "수원청과물", "수원원예농협", "수원수산시장", "경기남부수협"];
const ITEMS = ["item_lettuce", "item_onion", "item_green_onion", "item_potato"];
// 수원시 권선구 세권로 243(권선동). 좌표는 세권로 권선동 구간 근사값(OpenStreetMap)
const MARKET = { address: "경기 수원시 권선구 세권로 243 수원시농수산물도매시장", dong: "권선동", lat: 37.2514, lng: 127.039 };
// 청과부류 개장 03:00~19:00, 매주 일요일 휴업(수원시 도매시장 이용안내, 2026-10-15 수정)
const HOURS = { open: "03:00", close: "19:00" } as const;

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

async function main() {
  const html = await (await fetch(SOURCE_URL, { signal: AbortSignal.timeout(60_000) })).text();
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map((m) => m[1]!);
  const lists = tables
    .map((t) => [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => strip(c[1]!))))
    .map((rows) => rows.filter((cells) => /^\d+$/.test(cells[0] ?? "")))
    .filter((rows) => rows.length > 0);
  if (lists.length !== CORPS.length) throw new Error(`명단 표 수가 예상과 다릅니다: ${lists.length}`);

  const vendors: Vendor[] = [];
  const offers: Offer[] = [];
  let n = 301;
  lists.forEach((rows, i) => {
    const corp = CORPS[i]!;
    for (const cells of rows) {
      const name = cells[1]!;
      const category = cells[cells.length - 2]!;
      const tel = cells[cells.length - 1]!;
      if (category !== "채소류" || !tel) continue;
      const id = `v_${n++}`;
      vendors.push({
        id,
        name: `${name} · ${corp}`, // 같은 상호가 법인마다 있어 법인을 붙인다
        kind: "도매시장 중도매인",
        address: `${MARKET.address} (${corp})`,
        dong: MARKET.dong,
        lat: MARKET.lat,
        lng: MARKET.lng,
        phone: tel.startsWith("0") ? tel : `031-${tel}`,
        opening_hours: { mon: HOURS, tue: HOURS, wed: HOURS, thu: HOURS, fri: HOURS, sat: HOURS, sun: "closed" },
        delivery_available: null,
        delivery_dongs: [],
        delivery_note: null,
        data_status: "공공명단",
        checked_on: LIST_UPDATED_ON,
      });
      // 채소류 중도매인이 다루는 품목으로 연결한다. 실제 취급 여부와 가격은 전화로 확인(화면에 표시)
      for (const item_id of ITEMS) {
        offers.push({
          vendor_id: id, item_id, price: null, price_unit_label: null, unit_kg: null, price_source: null,
          price_checked_on: null, min_sale_kg: null, restock_days: null, restock_time: null, last_restocked_on: null, available: true,
        });
      }
    }
  });

  const check = validateDataset({ ...rawDataset, vendors, offers });
  if (!check.ok) throw new Error(`형식 오류:\n${check.errors.join("\n")}`);
  writeFileSync("data/vendors.json", JSON.stringify(vendors, null, 2) + "\n");
  writeFileSync("data/offers.json", JSON.stringify(offers, null, 2) + "\n");
  console.log(`중도매인 ${vendors.length}곳, 판매 정보 ${offers.length}건`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
