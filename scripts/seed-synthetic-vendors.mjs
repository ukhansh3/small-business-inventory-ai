import { createClient } from "../apps/cheonhajangsa/node_modules/@supabase/supabase-js/dist/index.mjs";
import fs from "node:fs";

const notice = "가상 시연 데이터 · 실제 업체·위치·가격·거래 조건이 아닙니다.";
const cities = [
  ["수원시 영통구", 37.2834, 127.0465], ["용인시 기흥구", 37.241, 127.177],
  ["화성시 동탄", 37.201, 127.073], ["오산시", 37.149, 127.077],
  ["안양시 동안구", 37.394, 126.956], ["군포시", 37.361, 126.935],
  ["성남시 분당구", 37.378, 127.112], ["평택시", 36.992, 127.112],
  ["안성시", 37.008, 127.27], ["광주시", 37.429, 127.255],
  ["이천시", 37.279, 127.435], ["남양주시", 37.636, 127.214],
];
const prefixes = ["든든한", "바른", "새벽", "초록", "맑은", "온기", "반듯한", "한결", "빠른", "정다운", "산뜻한", "착한", "빛나는", "튼튼한", "시원한", "안심", "꼼꼼한", "참좋은", "마음", "오래가는"];
const suffixes = ["파트너스", "상회", "마켓", "솔루션", "케어", "공방", "기술", "서비스", "연구소", "협동소", "플러스", "전문점"];
const catalog = [
  ["식자재 도매", ["양파", "대파", "깐마늘", "식용유", "쌀"], [16000, 12000, 31000, 42000, 48000], ["10kg 망", "5kg 상자", "3kg 팩", "18L 말통", "20kg 포대"]],
  ["폐기물 수집·운반업", ["사업장 폐기물 수거", "재활용품 정기 수거", "폐유 회수", "박스·비닐 분리 수거"], [55000, 105000, 42000, 68000], ["1회", "월 4회", "20L", "1회"]],
  ["폐수·정화조 관리", ["그리스트랩 청소", "배수관 점검", "정화조 관리 방문", "폐수 설비 점검"], [85000, 70000, 125000, 110000], ["1회", "출장 1회", "1회", "1회"]],
  ["실내건축공사업", ["주방 벽면 부분 보수", "홀 바닥 부분 시공", "싱크대 하부장 교체", "매장 도장 리폼"], [280000, 430000, 520000, 360000], ["5㎡", "5㎡", "1세트", "10㎡"]],
  ["주방기기 수리", ["업소용 냉장고 점검", "식기세척기 점검", "후드 모터 교체", "제빙기 세척·점검"], [35000, 45000, 175000, 75000], ["출장 1회", "출장 1회", "1대", "1대"]],
  ["청소·위생관리", ["주방 바닥·홀 청소", "후드·덕트 세척", "개점 전 집중 청소", "정기 위생 관리"], [145000, 225000, 185000, 330000], ["30평 1회", "후드 1구", "1회", "월 4회"]],
  ["옥외광고업·간판", ["돌출 간판 조명 수리", "메뉴 보드 제작", "채널 간판 세척", "창문 시트지 시공"], [85000, 195000, 135000, 160000], ["1회", "1개", "1회", "1면"]],
  ["전기공사업", ["주방 콘센트 증설", "누전 점검", "간판 타이머 교체", "조명 레일 설치"], [115000, 50000, 72000, 180000], ["2구", "출장 1회", "1개", "5m"]],
  ["냉난방 설비", ["에어컨 필터·열교환기 세척", "업소용 에어컨 점검", "실외기 이전 설치", "환풍기 교체"], [90000, 38000, 310000, 115000], ["1대", "출장 1회", "1대", "1대"]],
  ["기계가스설비공사업", ["가스 배관 누설 점검", "주방 배기·급기 점검", "온수기 배관 정비", "가스 밸브 교체"], [62000, 130000, 155000, 95000], ["1회", "1회", "1회", "1개"]],
  ["소독·방역", ["주방 해충 방제", "정기 방역 관리", "개점 전 집중 방역", "바퀴벌레 집중 관리"], [78000, 198000, 115000, 95000], ["1회", "월 2회", "1회", "1회"]],
  ["포장재 도매", ["테이크아웃 용기", "크라프트 쇼핑백", "종이 도시락 용기", "배달용 컵·뚜껑"], [31000, 39000, 26000, 22000], ["100개", "200장", "100개", "100세트"]],
];
const terms = [
  "시연용 조건: 방문·배송 일정은 협의하는 것으로 가정했습니다.",
  "시연용 조건: 기본 작업 기준 가상 가격이며 추가 자재·부품은 별도라고 가정했습니다.",
  "시연용 조건: 평일 예약 기준이며 야간·주말은 추가 비용이 있다고 가정했습니다.",
  "시연용 조건: 묶음 이용 시 배송비를 별도 협의하는 것으로 가정했습니다.",
  "시연용 조건: 작업 범위·현장 상태에 따라 최종 견적이 달라지는 것으로 가정했습니다.",
];
const rows = Array.from({ length: 200 }, (_, index) => {
  const n = index + 1;
  const [category, services, prices, units] = catalog[index % catalog.length];
  const [city, baseLat, baseLng] = cities[(index * 5 + Math.floor(index / cities.length)) % cities.length];
  const angle = n * 2.399963229728653;
  const radius = 0.002 + (n % 7) * 0.001;
  const brand = `${prefixes[(n * 7 + Math.floor(n / prefixes.length)) % prefixes.length]}${suffixes[(n * 11 + Math.floor(n / suffixes.length)) % suffixes.length]}`;
  const base = index % services.length;
  return {
    demo_code: `fake-${String(n).padStart(4, "0")}`,
    name: `가상 ${brand} ${String(n).padStart(3, "0")}`,
    category,
    area: `${city} (가상 위치)` ,
    latitude: Number((baseLat + Math.cos(angle) * radius).toFixed(6)),
    longitude: Number((baseLng + Math.sin(angle) * radius * 1.15).toFixed(6)),
    service: services[(base + Math.floor(n / 12)) % services.length],
    price: prices[(base + Math.floor(n / 9)) % prices.length] + (n % 9) * (category.includes("도매") ? 700 : 5000),
    unit: units[(base + Math.floor(n / 12)) % units.length],
    terms: terms[n % terms.length],
    demo_notice: notice,
    data_kind: "synthetic_demo",
  };
});

const kmFromAjou = (row) => {
  const rad = (n) => n * Math.PI / 180;
  const a = rad(row.latitude - 37.2834);
  const b = rad(row.longitude - 127.0465);
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(a / 2) ** 2 + Math.cos(rad(37.2834)) * Math.cos(rad(row.latitude)) * Math.sin(b / 2) ** 2));
};
if (process.argv.includes("--write-sql")) {
  const columns = Object.keys(rows[0]);
  const literal = (value) => typeof value === "number" ? String(value) : "'" + value.replaceAll("'", "''") + "'";
  const values = rows.map((row) => "(" + columns.map((key) => literal(row[key])).join(",") + ")").join(",\n");
  const migration = fs.readFileSync("supabase/migrations/202611040002_synthetic_demo_vendors.sql", "utf8").replace(/\ncommit;\s*$/, "");
  fs.mkdirSync("private", { recursive: true });
  const file = "private/synthetic-demo-setup.sql";
  fs.writeFileSync(file, migration + "\ninsert into public.mvp_synthetic_vendors (" + columns.join(",") + ") values\n" + values + ";\ncommit;\nselect count(*) as synthetic_vendor_count from public.mvp_synthetic_vendors;\n", { mode: 0o600 });
  console.log(JSON.stringify({ file, vendors: rows.length }));
  process.exit(0);
}
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ generated: rows.length, uniqueCodes: new Set(rows.map((v) => v.demo_code)).size, categories: [...new Set(rows.map((v) => v.category))].length, farthestKm: Math.max(...rows.map(kmFromAjou)).toFixed(1), notice }));
  process.exit(0);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("apps/cheonhajangsa/.env.local에 Supabase 서버 설정이 필요합니다.");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (let i = 0; i < rows.length; i += 50) {
  const { error } = await db.from("mvp_synthetic_vendors").upsert(rows.slice(i, i + 50), { onConflict: "demo_code" });
  if (error) throw new Error(`시연 업체 ${i + 1}~${Math.min(i + 50, rows.length)} 등록 실패: ${error.message}`);
}
const { count, error } = await db.from("mvp_synthetic_vendors").select("id", { count: "exact", head: true });
if (error) throw new Error(`등록 수 확인 실패: ${error.message}`);
console.log(JSON.stringify({ upserted: rows.length, tableTotal: count, area: "아주대 중심 약 50km 이내", categories: [...new Set(rows.map((v) => v.category))].length, warning: notice }));
