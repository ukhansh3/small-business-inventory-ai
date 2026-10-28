import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Vendor, parseMapSelection, validMapUrl } from "../domain/vendors";
import { Action, colors, s } from "./ui";
export function KakaoMap({
  vendors,
  center,
  onSelect,
}: {
  vendors: Vendor[];
  center: { latitude: number; longitude: number };
  onSelect: (id: string) => void;
}) {
  const url = validMapUrl(process.env.EXPO_PUBLIC_KAKAO_MAP_URL);
  const ref = useRef<WebView<object>>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!loaded) return;
    ref.current?.postMessage(
      JSON.stringify({ type: "vendors", vendors, center }),
    );
  }, [vendors, center, loaded]);
  useEffect(() => {
    if (loaded || !url) return;
    const timer = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timer);
  }, [loaded, url, attempt]);
  if (!url)
    return (
      <View style={styles.fallback}>
        <Text style={s.title}>카카오 지도 연결 설정 대기</Text>
        <Text style={s.muted}>
          HTTPS 지도 주소를 설정하면 실제 지도가 표시됩니다. 아래 샘플 업체
          목록은 계속 확인할 수 있습니다.
        </Text>
      </View>
    );
  const origin = new URL(url).origin;
  return (
    <View style={styles.map}>
      <WebView<object>
        key={attempt}
        ref={ref}
        source={{ uri: url }}
        originWhitelist={[origin]}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) =>
          request.url === "about:blank" ||
          request.url === url ||
          request.url === url + "/"
        }
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        onMessage={(event) => {
          if (
            event.nativeEvent.url &&
            !event.nativeEvent.url.startsWith(origin + "/mobile-map")
          )
            return;
          let ready = false;
          try {
            ready = JSON.parse(event.nativeEvent.data)?.type === "ready";
          } catch {}
          if (ready) {
            setLoaded(true);
            setFailed(false);
            return;
          }
          const selection = parseMapSelection(
            event.nativeEvent.data,
            vendors.map((v) => v.id),
          );
          if (selection) onSelect(selection.vendorId);
        }}
      />
      {!loaded && !failed && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.orange} />
          <Text>카카오 지도 연결 중…</Text>
        </View>
      )}
      {failed && (
        <View style={styles.overlay}>
          <Text style={s.body}>지도를 불러오지 못했습니다.</Text>
          <Text style={s.muted}>
            네트워크와 지도 서버 설정을 확인해 주세요. 업체 목록은 사용할 수
            있습니다.
          </Text>
          <Action
            label="지도 다시 연결"
            onPress={() => {
              setLoaded(false);
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  map: {
    height: 330,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.cream,
  },
  fallback: {
    minHeight: 190,
    padding: 24,
    gap: 14,
    justifyContent: "center",
    backgroundColor: colors.cream,
    borderRadius: 20,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.cream,
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
});
