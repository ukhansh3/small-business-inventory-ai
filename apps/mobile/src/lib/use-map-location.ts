import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { demoCenter } from "../domain/vendors";

type MapLocation = { center: typeof demoCenter; current: boolean; message: string };
let cached: MapLocation | null = null;
let pending: Promise<MapLocation> | null = null;
const fallback: MapLocation = { center: demoCenter, current: false, message: "아주대를 기본 위치로 표시합니다." };

async function readLocation(): Promise<MapLocation> {
  if (pending) return pending;
  pending = (async () => {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return { ...fallback, message: "위치 권한을 허용하면 내 위치로 이동합니다. 지금은 아주대 기준입니다." };
    const recent = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 300 });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = recent ?? await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), 8000); }),
      ]);
      return { center: { latitude: position.coords.latitude, longitude: position.coords.longitude }, current: true, message: "현재 위치를 기준으로 표시합니다." };
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
  try { return await pending; } finally { pending = null; }
}

export function useMapLocation() {
  const [location, setLocation] = useState(cached ?? fallback);
  const [locating, setLocating] = useState(true);
  const [recenterKey, setRecenterKey] = useState(0);
  const locate = useCallback(async () => {
    setLocating(true);
    try {
      cached = await readLocation();
      setLocation(cached);
    } catch {
      setLocation((previous) => ({ ...previous, message: "위치를 확인하지 못했습니다. 현재 지도 위치를 유지합니다." }));
    } finally { setLocating(false); setRecenterKey((value) => value + 1); }
  }, []);
  useEffect(() => {
    let active = true;
    void readLocation().then((next) => {
      if (!active) return;
      cached = next;
      setLocation(next);
    }).catch(() => {
      if (active) setLocation((previous) => ({ ...previous, message: "위치를 확인하지 못했습니다. 현재 지도 위치를 유지합니다." }));
    }).finally(() => {
      if (active) { setLocating(false); setRecenterKey((value) => value + 1); }
    });
    return () => { active = false; };
  }, []);
  return { ...location, locating, locate, recenterKey };
}
