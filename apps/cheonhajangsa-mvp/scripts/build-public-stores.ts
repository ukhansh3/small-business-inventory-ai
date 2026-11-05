import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { PUBLIC_GUS, validatePublicStores, type PublicStore } from "../core/public-stores";

// 공공데이터 → data/public_stores.json (v2 13단계, AC-27)
// 사용: npx tsx scripts/build-public-stores.ts <상가정보_경기_YYYYMM.csv 경로> <기준일 YYYY-MM-DD>
// 업종(2026-11-04 사용자 결정): 채소/과일 소매업(G20506) 전부 + 슈퍼마켓(G20404) 중 이름에 아래 낱말이 있는 곳
const SUPERMARKET_WORDS = ["마트", "식자재", "도매", "공판장", "청과", "야채", "채소"];
// 이름에 '마트'가 있어도 사장님 구매처가 아닌 곳(2026-11-05 사용자 결정): 회사 안 매점·카페, 편의점
const EXCLUDE_WORDS = ["삼성전자", "매점", "카페", "이마트24", "편의점"];
const RULE = `업종 채소/과일 소매업(G20506) 전부 + 슈퍼마켓(G20404) 중 이름에 ${SUPERMARKET_WORDS.join("·")} 포함, ${EXCLUDE_WORDS.join("·")} 포함 제외. 지역 ${PUBLIC_GUS.join("·")}`;

// 따옴표로 감싼 CSV 한 줄 나누기(칸 안의 쉼표·이중 따옴표 처리)
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function main() {
  const [file, sourceDate] = process.argv.slice(2);
  if (!file || !sourceDate) throw new Error("사용: npx tsx scripts/build-public-stores.ts <csv> <YYYY-MM-DD>");
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let header: string[] | null = null;
  const stores: PublicStore[] = [];
  let read = 0;
  for await (const raw of rl) {
    const line = header ? raw : raw.replace(/^﻿/, "");
    const cols = splitCsv(line);
    if (!header) {
      header = cols;
      continue;
    }
    read++;
    const get = (name: string) => cols[header!.indexOf(name)] ?? "";
    const gu = get("시군구명");
    if (!(PUBLIC_GUS as readonly string[]).includes(gu)) continue;
    const code = get("상권업종소분류코드");
    const name = [get("상호명"), get("지점명")].filter(Boolean).join(" ").trim();
    let category: PublicStore["category"] | null = null;
    if (code === "G20506") category = "채소/과일";
    else if (code === "G20404" && SUPERMARKET_WORDS.some((w) => name.includes(w)) && !EXCLUDE_WORDS.some((w) => name.includes(w))) category = "슈퍼마켓";
    if (!category) continue;
    const lat = Number(get("위도"));
    const lng = Number(get("경도"));
    stores.push({
      store_id: `ps_${get("상가업소번호")}`,
      name,
      category,
      gu: gu as PublicStore["gu"],
      dong: get("행정동명"),
      address: get("도로명주소") || get("지번주소"),
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    });
  }
  stores.sort((a, b) => a.store_id.localeCompare(b.store_id));
  const out = { source: "소상공인시장진흥공단 상가(상권)정보" as const, source_date: sourceDate, rule: RULE, stores };
  const v = validatePublicStores(out);
  if (!v.ok) throw new Error(`형식 검사 실패:\n${v.errors.join("\n")}`);
  writeFileSync("data/public_stores.json", JSON.stringify(out, null, 1) + "\n");
  const by = (k: keyof PublicStore) => Object.entries(stores.reduce<Record<string, number>>((m, s) => ((m[String(s[k])] = (m[String(s[k])] ?? 0) + 1), m), {}));
  console.log(`읽은 행 ${read}, 저장 ${stores.length}곳`, by("gu"), by("category"));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
