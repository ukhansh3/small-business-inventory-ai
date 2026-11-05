import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { color, font, radius } from "../src/components/theme";
import { ApiError, getLocations, updateMyLocation } from "../src/lib/api";
import type { Location } from "../src/lib/api-types";
import { getSavedLocation, saveLocation } from "../src/lib/location";

// S-06 내 위치 고르기(WF-02, API-14·API-07). 고르면 이 기기에 먼저 두고 서버에 저장한다.
// 서버 저장이 안 되면 이 기기에서만 적용된다고 알린다.
export default function LocationScreen() {
  const router = useRouter();
  const [list, setList] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const current = getSavedLocation();

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const load = () => {
    setError(null);
    getLocations()
      .then((r) => setList(r.locations))
      .catch(() => setError("위치 목록을 불러오지 못했어요."));
  };
  useEffect(load, []);

  const choose = async (loc: Location) => {
    saveLocation(loc.location_id);
    setSaving(true);
    try {
      await updateMyLocation(loc.location_id);
      back();
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "위치를 저장하지 못했어요. 이 기기에서만 적용돼요.");
    } finally {
      setSaving(false);
    }
  };

  const selectedId = current ?? list?.find((l) => l.is_default)?.location_id;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={back} style={styles.backBtn}>
          <Text style={styles.backLabel}>← 돌아가기</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>내 가게 위치를 골라 주세요</Text>
        <Text style={styles.sub}>판매처까지 거리와 배달 지역을 이 위치로 계산해요.</Text>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
              <Text style={styles.retryLabel}>다시 시도</Text>
            </Pressable>
          </View>
        )}
        {!list && !error && <Text style={styles.sub}>불러오는 중…</Text>}
        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
            <Pressable accessibilityRole="button" onPress={back} style={styles.ok}>
              <Text style={styles.okLabel}>확인</Text>
            </Pressable>
          </View>
        ) : (
          list?.map((l) => {
            const on = l.location_id === selectedId;
            return (
              <Pressable
                key={l.location_id}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: saving }}
                disabled={saving}
                onPress={() => choose(l)}
                style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && styles.pressed]}
              >
                <Text style={[styles.name, on && styles.nameOn]}>{l.name}</Text>
                <Text style={styles.dong}>
                  {l.dong}
                  {l.is_default ? " · 기본" : ""}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 4 },
  backLabel: { fontSize: font.body, color: color.green, fontWeight: "700" },
  content: { padding: 16, gap: 10 },
  title: { fontSize: font.title, fontWeight: "800", color: color.ink },
  sub: { fontSize: font.body, color: color.sub, marginBottom: 6 },
  item: { padding: 16, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.line, gap: 2 },
  itemOn: { borderColor: color.green, backgroundColor: color.greenSoft },
  pressed: { opacity: 0.7 },
  name: { fontSize: font.large, fontWeight: "700", color: color.ink },
  nameOn: { color: color.green },
  dong: { fontSize: font.small, color: color.sub },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius, backgroundColor: color.redSoft },
  errorText: { flex: 1, fontSize: font.body, color: color.red },
  retry: { backgroundColor: color.red, borderRadius: radius, paddingVertical: 8, paddingHorizontal: 14 },
  retryLabel: { color: "#ffffff", fontWeight: "700" },
  noticeBox: { gap: 12, padding: 14, borderRadius: radius, backgroundColor: color.amberSoft },
  noticeText: { fontSize: font.body, color: color.amber, lineHeight: 22 },
  ok: { alignSelf: "flex-start", backgroundColor: color.green, borderRadius: radius, paddingVertical: 10, paddingHorizontal: 18 },
  okLabel: { color: "#ffffff", fontWeight: "700", fontSize: font.body },
});
