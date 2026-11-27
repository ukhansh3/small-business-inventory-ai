import { useEffect, useRef, useState } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import type { MapProps } from "./map-types";
import { type StoreTone, TONE_ORDER, TONES } from "../lib/store-tone";
import { color, font } from "./theme";

// 카카오맵(웹, v2 4절). 공개용 JavaScript 키는 등록된 도메인에서만 동작한다(EXPO_PUBLIC_KAKAO_JS_KEY).
// 지도를 못 불러와도 목록은 그대로 쓸 수 있게 안내만 띄운다.
const KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? "";

// 쓰는 기능만 좁힌 카카오맵 타입
type LatLng = object;
type KMap = { getProjection(): { containerPointFromCoords(p: LatLng): { x: number; y: number } }; setCenter(p: LatLng): void; setBounds(b: object, top?: number, right?: number, bottom?: number, left?: number): void; relayout(): void };
type Overlay = { setMap(m: KMap | null): void };
type Marker = Overlay & { setOpacity(opacity: number): void };
type MarkerImage = object;
type Kakao = {
  maps: {
    load(cb: () => void): void;
    LatLng: new (lat: number, lng: number) => LatLng;
    Map: new (el: HTMLElement, o: { center: LatLng; level: number }) => KMap;
    LatLngBounds: new () => { extend(p: LatLng): void };
    Marker: new (o: { position: LatLng; title: string; zIndex: number; clickable: boolean; image?: MarkerImage }) => Marker;
    MarkerImage: new (src: string, size: object, o: { offset: object }) => MarkerImage;
    Size: new (w: number, h: number) => object;
    Point: new (x: number, y: number) => object;
    event: { addListener(target: Marker, event: "click", listener: () => void): void; addListener(target: KMap, event: "idle", listener: () => void): void; removeListener(target: KMap, event: "idle", listener: () => void): void };
    CustomOverlay: new (o: { position: LatLng; content: HTMLElement; yAnchor?: number; zIndex?: number; clickable?: boolean }) => Overlay;
  };
};

let loading: Promise<Kakao> | null = null;
function loadKakao(): Promise<Kakao> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!KEY) return reject(new Error("카카오맵 키 없음"));
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KEY)}&autoload=false`;
    s.async = true;
    s.onload = () => {
      const k = (window as unknown as { kakao?: Kakao }).kakao;
      if (!k) return reject(new Error("카카오맵 SDK 없음"));
      k.maps.load(() => resolve(k));
    };
    s.onerror = () => reject(new Error("카카오맵 SDK를 불러오지 못함"));
    document.head.appendChild(s);
  });
  loading.catch(() => (loading = null));
  return loading;
}

export function KakaoMap({ center, pins, focusIds, selectedId, height, onPinPress, coveredBottom = 0, onVisibleCountChange, recenterKey = 0 }: MapProps) {
  const box = useRef<HostInstance>(null); // 웹에서는 DOM 요소
  const kakao = useRef<Kakao | null>(null);
  const map = useRef<KMap | null>(null);
  const overlays = useRef<Overlay[]>([]);
  const press = useRef(onPinPress);
  useEffect(() => { press.current = onPinPress; }, [onPinPress]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initialCenter] = useState(center);

  // 지도 만들기(한 번)
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((k) => {
        if (cancelled || !box.current) return;
        kakao.current = k;
        map.current = new k.maps.Map(box.current as unknown as HTMLElement, { center: new k.maps.LatLng(initialCenter.lat, initialCenter.lng), level: 4 });
        setReady(true);
      })
      .catch(() => !cancelled && setError("지도를 불러오지 못했어요. 아래 목록을 이용해 주세요."));
    return () => {
      cancelled = true;
    };
  }, [initialCenter]); // 지도는 한 번만 만든다. 이후 중심은 아래 효과에서 맞춘다

  // 핀 다시 그리기 + 강조 핀이 보이게 맞추기
  useEffect(() => {
    const k = kakao.current;
    const m = map.current;
    if (!ready || !k || !m) return;
    for (const o of overlays.current) o.setMap(null);
    const focus = new Set(selectedId ? [selectedId] : focusIds);
    const anyFocus = focus.size > 0;
    overlays.current = pins.map((p) => {
      const position = new k.maps.LatLng(p.lat, p.lng);
      if (p.kind === "me") {
        const dot = document.createElement("div");
        dot.title = p.name;
        Object.assign(dot.style, {
          width: "16px", height: "16px", boxSizing: "border-box",
          borderRadius: "50%", background: "#2b6de8", border: "2px solid #fff",
        });
        const overlay = new k.maps.CustomOverlay({ position, content: dot, yAnchor: 0.5, zIndex: 4 });
        overlay.setMap(m);
        return overlay;
      }
      const focused = focus.has(p.id);
      const marker = new k.maps.Marker({
        position, title: p.name, zIndex: focused ? 3 : p.kind === "public" ? 1 : 2, clickable: true,
        image: pinImage(k, p.tone ?? "shop"),
      });
      if (anyFocus && !focused) marker.setOpacity(0.3);
      k.maps.event.addListener(marker, "click", () => press.current(p.id));
      marker.setMap(m);
      return marker;
    });
  }, [ready, pins, focusIds, selectedId]);

  // 지도 위치는 꼭 필요할 때만 맞춘다(2026-11-26): 처음, 내 위치가 15m 넘게 바뀔 때, 강조할 핀이 바뀔 때, 내 위치 버튼.
  // 핀 목록을 다시 받거나 목록 시트 높이가 바뀔 때마다 맞추면, 사장님이 끌어 놓은 지도가 제자리로 튕겨 돌아간다.
  const placed = useRef<{ lat: number; lng: number; focusKey: string; recenterKey: number } | null>(null);
  useEffect(() => {
    const k = kakao.current;
    const m = map.current;
    if (!ready || !k || !m) return;
    const focus = new Set(focusIds);
    const focusKey = pins.filter((p) => focus.has(p.id)).map((p) => p.id).sort().join(","); // 실제로 그려진 강조 핀 기준(핀이 늦게 와도 맞춤)
    const last = placed.current;
    const moved = !last || Math.hypot((center.lat - last.lat) * 111_000, (center.lng - last.lng) * 88_000) >= 15;
    if (last && !moved && last.focusKey === focusKey && last.recenterKey === recenterKey) return;
    placed.current = { lat: center.lat, lng: center.lng, focusKey, recenterKey };
    if (focus.size > 0) {
      const b = new k.maps.LatLngBounds();
      for (const p of pins) if (focus.has(p.id) || p.kind === "me") b.extend(new k.maps.LatLng(p.lat, p.lng));
      m.setBounds(b, 30, 30, 30 + Math.min(coveredBottom, Math.round(height * 0.6)), 30); // 아래 목록 시트에 가려지지 않게(v3)
    } else {
      m.setCenter(new k.maps.LatLng(center.lat, center.lng));
    }
  }, [ready, pins, focusIds, center.lat, center.lng, coveredBottom, height, recenterKey]);

  // 높이가 바뀌면(목록 시트 펼침) 지도 크기를 다시 잰다
  useEffect(() => {
    map.current?.relayout();
  }, [height]);

  useEffect(() => {
    const sdk = kakao.current;
    const instance = map.current;
    const element = box.current as unknown as HTMLElement | null;
    if (!ready || !sdk || !instance || !element || !onVisibleCountChange) return;

    const updateCount = () => {
      const projection = instance.getProjection();
      const width = element.clientWidth;
      const visibleHeight = Math.max(0, element.clientHeight - coveredBottom);
      // 검색 결과를 강조 중이면 결과 핀만 센다(v3: 결과 78곳인데 화면 속 117곳으로 나오던 문제)
      const focus = new Set(focusIds);
      const count = pins.filter((pin) => {
        if (pin.kind === "me") return false;
        if (focus.size > 0 && !focus.has(pin.id)) return false;
        const point = projection.containerPointFromCoords(new sdk.maps.LatLng(pin.lat, pin.lng));
        return point.x >= 0 && point.x < width && point.y >= 0 && point.y < visibleHeight;
      }).length;
      onVisibleCountChange(count);
    };

    sdk.maps.event.addListener(instance, "idle", updateCount);
    updateCount();
    return () => sdk.maps.event.removeListener(instance, "idle", updateCount);
  }, [ready, pins, height, coveredBottom, onVisibleCountChange, focusIds]);

  useEffect(() => {
    return () => onVisibleCountChange?.(null);
  }, [onVisibleCountChange]);

  const tones = TONE_ORDER.filter((t) => pins.some((p) => p.kind !== "me" && (p.tone ?? "shop") === t));
  return (
    <View style={[styles.wrap, { height }]}>
      <View ref={box} style={StyleSheet.absoluteFill} />
      {ready && tones.length > 1 && (
        <View style={styles.legend} accessibilityLabel={"핀 색: " + tones.map((t) => TONES[t].label).join(", ")}>
          {tones.map((t) => (
            <View key={t} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TONES[t].color }]} />
              <Text style={styles.legendText}>{TONES[t].label}</Text>
            </View>
          ))}
        </View>
      )}
      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// 출처별 색 핀(물방울 모양 SVG). 같은 색은 한 번만 만든다
const pinImageCache = new Map<StoreTone, MarkerImage>();
function pinImage(k: Kakao, tone: StoreTone): MarkerImage {
  const hit = pinImageCache.get(tone);
  if (hit) return hit;
  const c = TONES[tone].color;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38"><path d="M14 37s12-13.2 12-22.5C26 6.9 20.6 1 14 1S2 6.9 2 14.5C2 23.8 14 37 14 37Z" fill="${c}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>`;
  const img = new k.maps.MarkerImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), new k.maps.Size(28, 38), { offset: new k.maps.Point(14, 37) });
  pinImageCache.set(tone, img);
  return img;
}

const styles = StyleSheet.create({
  legend: { position: "absolute", top: 8, left: 8, right: 8, alignSelf: "flex-start", flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.9)" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, color: color.ink },
  wrap: { width: "100%", backgroundColor: color.greenSoft, overflow: "hidden" },
  error: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 16 },
  errorText: { fontSize: font.small, color: color.sub, textAlign: "center" },
});
