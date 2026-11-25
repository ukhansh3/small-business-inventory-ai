import { existsSync, writeFileSync } from "node:fs";
import { epsg5174ToWgs84 } from "../core/epsg5174";
import { SUPPLY_SOURCE, validateSupplyVendors, type SupplyVendor, type SupplyVendorsFile } from "../core/supply-vendors";

// 수원 식자재 납품업체 저장본: npx tsx scripts/build-supply-vendors.ts
// 원천: 행정안전부 인허가정보 집단급식소 식품판매업(data.go.kr 1741000/group_meal_food_retailers)
// 키는 .env.local의 DATA_GO_KR_KEY에서 읽고 출력하지 않는다. 결과는 data/supply_vendors.json.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) throw new Error("DATA_GO_KR_KEY가 없습니다(.env.local).");

const RULE = "도로명주소에 '수원시'가 들어가고 영업상태가 '영업/정상'인 곳. 좌표는 EPSG:5174를 WGS84로 변환";

type Row = Record<string, string | null | undefined>;

async function page(no: number): Promise<{ total: number; items: Row[] }> {
  const q = new URLSearchParams({ serviceKey: KEY!, returnType: "json", pageNo: String(no), numOfRows: "100", "cond[ROAD_NM_ADDR::LIKE]": "수원시" });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`https://apis.data.go.kr/1741000/group_meal_food_retailers/info?${q}`, { signal: AbortSignal.timeout(60_000) });
      const body = (await res.json()).response.body;
      const raw = body.items?.item ?? body.items ?? [];
      return { total: Number(body.totalCount ?? 0), items: Array.isArray(raw) ? raw : [raw] };
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
}

function phone(v: string | null | undefined): string | null {
  const d = (v ?? "").replace(/[^0-9]/g, "");
  if (d.length < 9) return null;
  if (d.startsWith("02")) return d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : `02-${d.slice(2, 6)}-${d.slice(6)}`;
  if (!d.startsWith("0")) return null;
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : null;
}

async function main() {
  const rows: Row[] = [];
  for (let no = 1; ; no++) {
    const { total, items } = await page(no);
    rows.push(...items);
    if (rows.length >= total || items.length === 0) break;
  }
  const stores: SupplyVendor[] = [];
  let noCoord = 0;
  for (const r of rows) {
    if (r.SALS_STTS_NM !== "영업/정상" || !(r.ROAD_NM_ADDR ?? "").includes("수원시")) continue;
    const x = Number(r.CRD_INFO_X), y = Number(r.CRD_INFO_Y);
    if (!(x > 0 && y > 0)) { noCoord++; continue; }
    const { lat, lng } = epsg5174ToWgs84(x, y);
    stores.push({
      store_id: `sv_${(r.MNG_NO ?? "").replace(/[^0-9]/g, "").slice(0, 7)}_${(r.MNG_NO ?? "").replace(/[^0-9]/g, "").slice(7)}`,
      name: (r.BPLC_NM ?? "").trim(),
      address: (r.ROAD_NM_ADDR ?? "").trim(),
      phone: phone(r.TELNO),
      licensed_on: /^\d{4}-\d{2}-\d{2}$/.test(r.LCPMT_YMD ?? "") ? r.LCPMT_YMD! : null,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    });
  }
  stores.sort((a, b) => a.store_id.localeCompare(b.store_id));
  const file: SupplyVendorsFile = {
    source: SUPPLY_SOURCE,
    source_date: new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10),
    rule: RULE,
    stores,
  };
  const checked = validateSupplyVendors(file);
  if (!checked.ok) throw new Error(`형식 오류:\n${checked.errors.join("\n")}`);
  writeFileSync("data/supply_vendors.json", JSON.stringify(file, null, 1) + "\n");
  console.log(`전체 ${rows.length}건 중 영업 ${stores.length}곳 저장(좌표 없음 ${noCoord}), 전화 있음 ${stores.filter((s) => s.phone).length}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
