import type { Store } from "./api-types";

// 목록 묶기(v3 화면 정리): 같은 자리에 있는 도매시장 중도매인 2곳 이상을 한 줄로.
// 처음 나온 자리에 묶음을 두고 순서는 그대로 지킨다. 화면 상태에서 계산하는 순수 함수(테스트 대상)

export type Row<T> = { type: "single"; item: T } | { type: "group"; key: string; title: string; items: T[] };

const WHOLESALE = "도매시장 중도매인";

function marketTitle(address: string): string {
  return /수원시농수산물도매시장|수원시 농수산물도매시장/.test(address) ? "수원 농수산물도매시장 중도매인" : "도매시장 중도매인";
}

export function groupRows<T extends { store: Pick<Store, "category" | "lat" | "lng" | "address"> }>(items: T[]): Row<T>[] {
  const keyOf = (s: T["store"]) => (s.category === WHOLESALE ? `${s.lat.toFixed(4)},${s.lng.toFixed(4)}` : null);
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = keyOf(it.store);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const rows: Row<T>[] = [];
  const groups = new Map<string, Extract<Row<T>, { type: "group" }>>();
  for (const it of items) {
    const k = keyOf(it.store);
    if (!k || (counts.get(k) ?? 0) < 2) {
      rows.push({ type: "single", item: it });
      continue;
    }
    let g = groups.get(k);
    if (!g) {
      g = { type: "group", key: `market:${k}`, title: marketTitle(it.store.address), items: [] };
      groups.set(k, g);
      rows.push(g);
    }
    g.items.push(it);
  }
  return rows;
}
