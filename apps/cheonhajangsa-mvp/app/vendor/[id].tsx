import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CallSheet } from "../../src/components/CallSheet";
import { ExampleBanner } from "../../src/components/ExampleBanner";
import { color, font, radius } from "../../src/components/theme";
import { getVendorDetail, sendEvent } from "../../src/lib/api";
import type { VendorDetail } from "../../src/lib/api-types";
import { type CallPlan, isPhoneUserAgent, planCall } from "../../src/lib/call";
import { newUuid } from "../../src/lib/device";
import { SaveVendorButton } from '../../src/components/SaveVendorButton';

// S-04 판매처 상세(WF-06, API-03). 카드 정보 + 주소·요일별 영업시간·입고 일정·배달 지역·확인일·출처.
const DAY_LABEL = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" } as const;
const IS_PHONE = Platform.OS !== "web" || isPhoneUserAgent(globalThis.navigator?.userAgent ?? "");

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function VendorScreen() {
  const router = useRouter();
  const p = useLocalSearchParams<{ id: string; item_id?: string; location_id?: string; session_id?: string; rank?: string }>();
  const id = one(p.id) ?? "";
  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Exclude<CallPlan, { kind: "dial" }> | null>(null);

  const load = () => {
    setError(null);
    getVendorDetail(id, { item_id: one(p.item_id) ?? "item_lettuce", location_id: one(p.location_id) ?? "", session_id: one(p.session_id), rank: one(p.rank) })
      .then(setDetail)
      .catch((e: Error) => setError(e.message || "정보를 불러오지 못했어요."));
  };
  useEffect(() => {
    let active = true;
    getVendorDetail(id, { item_id: one(p.item_id) ?? 'item_lettuce', location_id: one(p.location_id) ?? '', session_id: one(p.session_id), rank: one(p.rank) })
      .then((next) => { if (active) { setDetail(next); setError(null); } })
      .catch((e: Error) => { if (active) setError(e.message || '정보를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [id, p.item_id, p.location_id, p.session_id, p.rank]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const call = () => {
    if (!detail) return;
    const c = detail.card;
    sendEvent({ client_event_id: newUuid(), type: "call_click", session_id: one(p.session_id) ?? null, vendor_id: c.vendor_id, payload: { rank: c.rank, from: "detail", is_example: c.is_example } }).catch(() => {});
    const pl = planCall(c, IS_PHONE);
    if (pl.kind === "dial") void Linking.openURL(pl.url);
    else setPlan(pl);
  };

  const c = detail?.card;
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={back} style={styles.backBtn}>
          <Text style={styles.backLabel}>← 결과로</Text>
        </Pressable>
      </View>
      {detail?.example_data && <ExampleBanner />}
      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
              <Text style={styles.retryLabel}>다시 시도</Text>
            </Pressable>
          </View>
        )}
        {!detail && !error && <Text style={styles.muted}>불러오는 중…</Text>}
        {detail && c && (
          <>
            <View style={styles.head}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.kind}>{c.kind}</Text>
              {c.is_example && <Text style={styles.example}>예시</Text>}
            </View>
            <Text style={styles.main}>
              {c.distance.display} · <Text style={c.open_status.state === "open" ? styles.open : styles.closed}>{c.open_status.display}</Text>
            </Text>
            <Text style={styles.sub}>{detail.address}</Text>

            <Section title="영업시간">
              {detail.opening_hours.map((h) => (
                <View key={h.day} style={styles.row}>
                  <Text style={styles.day}>{DAY_LABEL[h.day]}</Text>
                  <Text style={[styles.value, h.display === "쉬는 날" && styles.muted]}>{h.display}</Text>
                </View>
              ))}
            </Section>

            <Section title="입고">
              {c.restock.display && <Text style={[styles.value, c.restock.state === "restocked_today" && styles.open]}>{c.restock.display}</Text>}
              <Text style={styles.value}>
                {detail.restock_days && detail.restock_days.length > 0
                  ? `${detail.restock_days.map((d) => DAY_LABEL[d as keyof typeof DAY_LABEL] ?? d).join("·")}${detail.restock_time ? ` ${detail.restock_time}` : ""}`
                  : "입고 일정 정보 없음"}
              </Text>
            </Section>

            <Section title="배달">
              <Text style={styles.value}>{detail.delivery_dongs ? `${detail.delivery_dongs.join(", ")}` : "배달 안 함"}</Text>
              {detail.delivery_note && <Text style={styles.sub}>{detail.delivery_note}</Text>}
            </Section>

            <Section title="가격·최소 판매량">
              <Text style={styles.value}>
                {c.price.display}
                {c.price.per_kg_display ? ` ${c.price.per_kg_display}` : ""}
              </Text>
              <Text style={styles.value}>{c.min_sale.display}</Text>
            </Section>

            <Section title="정보 출처">
              <Text style={styles.value}>
                {detail.data_status}
                {detail.checked_on ? ` · ${detail.checked_on} 확인` : " · 확인일 없음"}
              </Text>
            </Section>
            <SaveVendorButton id={c.vendor_id}/>

            <Pressable accessibilityRole="button" onPress={call} style={({ pressed }) => [styles.call, pressed && styles.pressed]}>
              <Text style={styles.callLabel}>전화하기</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      {plan && c && <CallSheet card={c} plan={plan} onClose={() => setPlan(null)} />}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 4 },
  backLabel: { fontSize: font.body, color: color.green, fontWeight: "700" },
  content: { padding: 16, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: 22, fontWeight: "800", color: color.ink },
  kind: { fontSize: font.small, color: color.sub },
  example: { fontSize: 12, color: color.amber, backgroundColor: color.amberSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  main: { fontSize: font.body, color: color.ink },
  open: { color: color.green, fontWeight: "600" },
  closed: { color: color.red },
  sub: { fontSize: font.body, color: color.sub },
  muted: { color: color.faint, fontSize: font.body },
  section: { marginTop: 8, padding: 14, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, gap: 4 },
  sectionTitle: { fontSize: font.small, fontWeight: "700", color: color.sub, marginBottom: 2 },
  row: { flexDirection: "row", gap: 12 },
  day: { width: 20, fontSize: font.body, color: color.sub },
  value: { fontSize: font.body, color: color.ink },
  call: { marginTop: 12, backgroundColor: color.green, borderRadius: radius, paddingVertical: 14, alignItems: "center" },
  pressed: { opacity: 0.8 },
  callLabel: { color: "#ffffff", fontSize: font.large, fontWeight: "700" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius, backgroundColor: color.redSoft },
  errorText: { flex: 1, fontSize: font.body, color: color.red },
  retry: { backgroundColor: color.red, borderRadius: radius, paddingVertical: 8, paddingHorizontal: 14 },
  retryLabel: { color: "#ffffff", fontWeight: "700" },
});
