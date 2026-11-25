import { z } from "zod";

// 수원 도매 시세 주간 추이(data/market_history.json). scripts/build-market-history.ts가 만든다.
// 한 주(월~일) 동안의 kg당 경매 낙찰가 중앙값. 화면의 작은 막대그래프에만 쓴다(판정에는 쓰지 않음).

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const marketHistorySchema = z.strictObject({
  region: z.string().min(1),
  built_on: isoDate,
  source: z.string().min(1),
  items: z.array(z.strictObject({
    item_id: z.string().regex(/^item_[a-z_]+$/),
    weeks: z.array(z.strictObject({ week_start: isoDate, per_kg: z.number().int().positive(), trades: z.number().int().positive() })),
  })),
});

export type MarketHistoryFile = z.infer<typeof marketHistorySchema>;
export type WeekPoint = { week_start: string; per_kg: number };

export function validateMarketHistory(raw: unknown): { ok: true; data: MarketHistoryFile } | { ok: false; errors: string[] } {
  const r = marketHistorySchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}

// 월요일 날짜(YYYY-MM-DD)
export function weekStart(iso: string): string {
  const t = new Date(`${iso}T00:00:00Z`);
  const back = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - back);
  return t.toISOString().slice(0, 10);
}

// 저장된 주간 값 + (있으면) 지금 도매가를 이번 주 점으로 덧붙인다. 최근 maxWeeks주만
export function weeksFor(file: MarketHistoryFile | null, itemId: string, latest: { date: string; per_kg: number } | null, maxWeeks = 6): WeekPoint[] {
  const weeks: WeekPoint[] = (file?.items.find((i) => i.item_id === itemId)?.weeks ?? []).map((w) => ({ week_start: w.week_start, per_kg: w.per_kg }));
  if (latest) {
    const ws = weekStart(latest.date);
    const i = weeks.findIndex((w) => w.week_start === ws);
    if (i >= 0) weeks[i] = { week_start: ws, per_kg: latest.per_kg };
    else if (!weeks.length || weeks.at(-1)!.week_start < ws) weeks.push({ week_start: ws, per_kg: latest.per_kg });
  }
  return weeks.slice(-maxWeeks);
}
