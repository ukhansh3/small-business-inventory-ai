import { useEffect, useState } from "react";

// v3 실시간 내 위치(R-25). 브라우저 위치 기능(Geolocation)으로 무료로 받는다.
// 좌표는 이 기기 메모리에만 두고, API 요청의 x-here 머리글로 거리 계산에만 보낸다(저장하지 않음).
// 허용하지 않거나 못 받으면 사장님이 고른 위치를 그대로 쓴다.

export type Here = { lat: number; lng: number; accuracy_m: number; at: number };
export type HereStatus = "idle" | "asking" | "on" | "denied" | "unavailable";

let latest: Here | null = null;
let status: HereStatus = "idle";
let watchId: number | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const MIN_MOVE_M = 15; // 이보다 적게 움직이면 화면을 다시 그리지 않는다

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function geo(): Geolocation | null {
  return typeof navigator !== "undefined" && navigator.geolocation ? navigator.geolocation : null;
}

export function startHere(): void {
  const g = geo();
  if (!g) { status = "unavailable"; notify(); return; }
  if (watchId !== null) return;
  status = latest ? "on" : "asking";
  notify();
  watchId = g.watchPosition(
    (p) => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: Math.round(p.coords.accuracy), at: p.timestamp };
      const moved = !latest || metersBetween(latest, next) >= MIN_MOVE_M;
      latest = next;
      if (moved || status !== "on") { status = "on"; notify(); }
    },
    (e) => {
      status = e.code === e.PERMISSION_DENIED ? "denied" : latest ? "on" : "unavailable";
      if (e.code === e.PERMISSION_DENIED) stopHere();
      notify();
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
  );
}

export function stopHere(): void {
  const g = geo();
  if (g && watchId !== null) g.clearWatch(watchId);
  watchId = null;
}

// API 요청 머리글. 위치가 없으면 빈 객체
export function hereHeader(): Record<string, string> {
  return latest && status === "on" ? { "x-here": `${latest.lat.toFixed(5)},${latest.lng.toFixed(5)}` } : {};
}

export function useHere(): { here: Here | null; status: HereStatus } {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    startHere();
    return () => { listeners.delete(l); };
  }, []);
  return { here: status === "on" ? latest : null, status };
}
