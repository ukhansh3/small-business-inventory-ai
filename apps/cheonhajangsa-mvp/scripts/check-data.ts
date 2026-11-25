import publicStores from "../data/public_stores.json";
import supplyVendors from "../data/supply_vendors.json";
import { rawDataset } from "../core/data";
import { validatePublicStores } from "../core/public-stores";
import { validateSupplyVendors } from "../core/supply-vendors";
import { validateDataset } from "../core/validate";

// npm run check:data — AC-16(판매처 데이터), AC-27(공공데이터 가게)
let failed = false;
const result = validateDataset(rawDataset);
if (result.ok) {
  const d = result.data;
  console.log(`데이터 형식 검사 통과: 품목 ${d.items.length}, 위치 ${d.locations.length}, 판매처 ${d.vendors.length}, 판매 정보 ${d.offers.length}`);
} else {
  failed = true;
  console.error(`데이터 형식 검사 실패 (${result.errors.length}건)`);
  for (const e of result.errors) console.error(`- ${e}`);
}
const ps = validatePublicStores(publicStores);
if (ps.ok) {
  console.log(`공공데이터 가게 검사 통과: ${ps.data.stores.length}곳(기준일 ${ps.data.source_date})`);
} else {
  failed = true;
  console.error(`공공데이터 가게 검사 실패 (${ps.errors.length}건)`);
  for (const e of ps.errors) console.error(`- ${e}`);
}
const sv = validateSupplyVendors(supplyVendors);
if (sv.ok) {
  console.log(`식자재 납품업체 검사 통과: ${sv.data.stores.length}곳(기준일 ${sv.data.source_date})`);
} else {
  failed = true;
  console.error(`식자재 납품업체 검사 실패 (${sv.errors.length}건)`);
  for (const e of sv.errors) console.error(`- ${e}`);
}
if (failed) process.exit(1);
