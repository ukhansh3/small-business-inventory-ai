import { useEffect, useRef, useState } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import type { MapProps, Pin } from "./map-types";
import { color, font } from "./theme";

// 카카오맵(웹, v2 4절). 공개용 JavaScript 키는 등록된 도메인에서만 동작한다(EXPO_PUBLIC_KAKAO_JS_KEY).
// 지도를 못 불러와도 목록은 그대로 쓸 수 있게 안내만 띄운다.
const KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? "";

// 쓰는 기능만 좁힌 카카오맵 타입
type LatLng = object;
type KMap = { setCenter(p: LatLng): void; setBounds(b: object, top?: number, right?: number, bottom?: number, left?: number): void; relayout(): void };
type Overlay = { setMap(m: KMap | null): void };
type Kakao = {
  maps: {
    load(cb: () => void): void;
    LatLng: new (lat: number, lng: number) => LatLng;
    Map: new (el: HTMLElement, o: { center: LatLng; level: number }) => KMap;
    LatLngBounds: new () => { extend(p: LatLng): void };
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

const STYLE: Record<Pin["kind"], { size: number; fill: string; border: string }> = {
  vendor: { size: 14, fill: color.green, border: "#ffffff" },
  example: { size: 14, fill: "#d9a21b", border: "#ffffff" },
  public: { size: 9, fill: "#7f9c86", border: "#ffffff" },
  me: { size: 16, fill: "#2b6de8", border: "#ffffff" },
};

function pinElement(pin: Pin, focused: boolean, dimmed: boolean, onPress: () => void): HTMLElement {
  const st = STYLE[pin.kind];
  const size = focused ? st.size + 6 : st.size;
  const el = document.createElement("div");
  el.title = pin.name;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", pin.name);
  Object.assign(el.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: st.fill,
    border: `2px solid ${st.border}`,
    boxShadow: focused ? `0 0 0 3px ${st.fill}55` : "0 1px 2px rgba(0,0,0,.35)",
    opacity: dimmed ? "0.3" : "1",
    cursor: pin.kind === "me" ? "default" : "pointer",
  });
  if (pin.kind !== "me") el.onclick = onPress;
  return el;
}

export function KakaoMap({ center, pins, focusIds, height, onPinPress }: MapProps) {
  const box = useRef<HostInstance>(null); // 웹에서는 DOM 요소
  const kakao = useRef<Kakao | null>(null);
  const map = useRef<KMap | null>(null);
  const overlays = useRef<Overlay[]>([]);
  const press = useRef(onPinPress);
  press.current = onPinPress;
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 지도 만들기(한 번)
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((k) => {
        if (cancelled || !box.current) return;
        kakao.current = k;
        map.current = new k.maps.Map(box.current as unknown as HTMLElement, { center: new k.maps.LatLng(center.lat, center.lng), level: 5 });
        setReady(true);
      })
      .catch(() => !cancelled && setError("지도를 불러오지 못했어요. 아래 목록을 이용해 주세요."));
    return () => {
      cancelled = true;
    };
  }, []); // 지도는 한 번만 만든다. 이후 중심은 아래 효과에서 맞춘다

  // 핀 다시 그리기 + 강조 핀이 보이게 맞추기
  useEffect(() => {
    const k = kakao.current;
    const m = map.current;
    if (!ready || !k || !m) return;
    for (const o of overlays.current) o.setMap(null);
    const focus = new Set(focusIds);
    const anyFocus = focus.size > 0;
    overlays.current = pins.map((p) => {
      const f = focus.has(p.id);
      const o = new k.maps.CustomOverlay({
        position: new k.maps.LatLng(p.lat, p.lng),
        content: pinElement(p, f, anyFocus && !f && p.kind !== "me", () => press.current(p.id)),
        yAnchor: 0.5,
        zIndex: p.kind === "me" ? 4 : f ? 3 : p.kind === "public" ? 1 : 2,
        clickable: true,
      });
      o.setMap(m);
      return o;
    });
    if (anyFocus) {
      const b = new k.maps.LatLngBounds();
      for (const p of pins) if (focus.has(p.id) || p.kind === "me") b.extend(new k.maps.LatLng(p.lat, p.lng));
      m.setBounds(b, 30, 30, 30, 30);
    } else {
      m.setCenter(new k.maps.LatLng(center.lat, center.lng));
    }
  }, [ready, pins, focusIds, center.lat, center.lng]);

  // 높이가 바뀌면(목록 시트 펼침) 지도 크기를 다시 잰다
  useEffect(() => {
    map.current?.relayout();
  }, [height]);

  return (
    <View style={[styles.wrap, { height }]}>
      <View ref={box} style={StyleSheet.absoluteFill} />
      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", backgroundColor: color.greenSoft, overflow: "hidden" },
  error: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 16 },
  errorText: { fontSize: font.small, color: color.sub, textAlign: "center" },
});
