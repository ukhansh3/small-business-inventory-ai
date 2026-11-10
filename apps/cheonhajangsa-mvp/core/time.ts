import { DAYS } from "./schema";
import type { Day, DayHours, OpeningHours } from "./types";

// 한국 시간 계산. 서버 시간대(Vercel은 UTC)와 상관없이 Asia/Seoul로 판정한다.

export type SeoulNow = {
  date: string; // YYYY-MM-DD
  day: Day;
  minutes: number; // 0~1439
};

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

export function seoulNow(now: Date): SeoulNow {
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const day = (parts.weekday ?? "").toLowerCase().slice(0, 3) as Day;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    day,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function dayAfter(day: Day, offset: number): Day {
  const i = DAYS.indexOf(day);
  return DAYS[(i + offset + 7 * 10) % 7] as Day;
}

type Window = { start: number; end: number }; // 그날 0시 기준 분. end가 1440을 넘으면 다음 날까지

function windowOf(h: DayHours): Window | null {
  if (h === "closed") return null;
  const start = toMinutes(h.open);
  let end = toMinutes(h.close);
  if (end <= start) end += 1440; // 자정 넘김(E-02a)
  return { start, end };
}

// R-04: 지금 영업 중인가(전날 자정 넘김 영업 포함)
export function isOpenNow(hours: OpeningHours, now: SeoulNow): boolean {
  const today = windowOf(hours[now.day]);
  if (today && now.minutes >= today.start && now.minutes < today.end) return true;
  const yesterday = windowOf(hours[dayAfter(now.day, -1)]);
  return !!yesterday && yesterday.end > 1440 && now.minutes < yesterday.end - 1440;
}

// 오늘 남은 시간 안에 여는가(지금 영업 중 포함)
export function opensLaterToday(hours: OpeningHours, now: SeoulNow): boolean {
  const today = windowOf(hours[now.day]);
  return isOpenNow(hours, now) || (!!today && today.start > now.minutes);
}

export function opensOnDay(hours: OpeningHours, day: Day): boolean {
  return hours[day] !== "closed";
}

// 영업 중이면 닫는 시각, 아니면 다음에 여는 때
export function closingTime(hours: OpeningHours, now: SeoulNow): string | null {
  const today = hours[now.day];
  const tw = windowOf(today);
  if (today !== "closed" && tw && now.minutes >= tw.start && now.minutes < tw.end) return today.close;
  const yday = hours[dayAfter(now.day, -1)];
  return yday === "closed" ? null : yday.close;
}

export function nextOpening(hours: OpeningHours, now: SeoulNow): { offset: number; time: string } | null {
  const today = hours[now.day];
  if (today !== "closed" && toMinutes(today.open) > now.minutes) return { offset: 0, time: today.open };
  for (let offset = 1; offset <= 7; offset++) {
    const h = hours[dayAfter(now.day, offset)];
    if (h !== "closed") return { offset, time: h.open };
  }
  return null;
}

const DAY_KO: Record<Day, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

export function dayLabel(offset: number, day: Day): string {
  if (offset === 0) return "오늘";
  if (offset === 1) return "내일";
  return `${DAY_KO[day]}요일`;
}

export function dayKo(day: Day): string {
  return DAY_KO[day];
}
