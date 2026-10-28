"use client";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { loadKakaoMaps, MapInstance, KakaoMaps } from "@/lib/kakao/sdk";
const coordinate = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
const payloadSchema = z.object({
  type: z.literal("vendors"),
  center: coordinate,
  vendors: z
    .array(
      coordinate.extend({ id: z.string().max(100), name: z.string().max(150) }),
    )
    .max(100),
});
type Payload = z.infer<typeof payloadSchema>;
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}
export default function MobileMap() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: MapInstance | null = null;
    let sdk: KakaoMaps | null = null;
    let pending: Payload | null = null;
    let markers: InstanceType<KakaoMaps["Marker"]>[] = [];
    let cleanups: (() => void)[] = [];
    const post = (value: unknown) =>
      window.ReactNativeWebView?.postMessage(JSON.stringify(value));
    const render = (data: Payload) => {
      if (!map || !sdk) return;
      cleanups.forEach((f) => f());
      cleanups = [];
      markers.forEach((m) => m.setMap(null));
      markers = [];
      map.setCenter(
        new sdk.LatLng(data.center.latitude, data.center.longitude),
      );
      for (const vendor of data.vendors) {
        const marker = new sdk.Marker({
          map,
          position: new sdk.LatLng(vendor.latitude, vendor.longitude),
          title: vendor.name,
          clickable: true,
        });
        const select = () => post({ type: "select", vendorId: vendor.id });
        sdk.event.addListener(marker, "click", select);
        const eventSdk = sdk;
        cleanups.push(() =>
          eventSdk.event.removeListener(marker, "click", select),
        );
        markers.push(marker);
      }
    };
    const receive = (event: Event) => {
      if (!("data" in event) || typeof event.data !== "string") return;
      try {
        const result = payloadSchema.safeParse(JSON.parse(event.data));
        if (!result.success) return;
        pending = result.data;
        render(result.data);
      } catch {}
    };
    window.addEventListener("message", receive);
    document.addEventListener("message", receive);
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY?.trim() ?? "";
    loadKakaoMaps(key)
      .then((value) => {
        if (cancelled || !container.current) return;
        sdk = value;
        map = new value.Map(container.current, {
          center: new value.LatLng(37.2834, 127.0465),
          level: 6,
        });
        if (pending) render(pending);
        post({ type: "ready" });
      })
      .catch(() => {
        if (container.current)
          container.current.textContent =
            "카카오 지도 연결 실패 · 키와 허용 도메인을 확인해 주세요.";
        post({ type: "error" });
      });
    const observer = new ResizeObserver(() => map?.relayout());
    if (container.current) observer.observe(container.current);
    return () => {
      cancelled = true;
      window.removeEventListener("message", receive);
      document.removeEventListener("message", receive);
      observer.disconnect();
      cleanups.forEach((f) => f());
      markers.forEach((m) => m.setMap(null));
    };
  }, []);
  return (
    <div
      ref={container}
      aria-label="모바일 앱 카카오 지도"
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff5ef",
        color: "#18283a",
      }}
    >
      카카오 지도 연결 중…
    </div>
  );
}
