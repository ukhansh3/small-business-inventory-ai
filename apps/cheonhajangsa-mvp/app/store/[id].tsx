import { useEffect, useState } from "react";
import { request, useMember } from "../../src/lib/members";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { VendorReviews } from "../../src/components/VendorReviews";
import { color } from "../../src/components/theme";
import { useStores } from "../../src/hooks/useStores";
import { displayName, toneOf, TONES } from "../../src/lib/store-tone";
import { getSavedLocation } from "../../src/lib/location";

export default function StoreDetail() {
  const { id, location } = useLocalSearchParams<{ id: string; location?: string }>();
  const { stores, error } = useStores(location || getSavedLocation());
  const store = stores.find((entry) => entry.store_id === id);

  const router = useRouter();
  const member = useMember();
  const [notice, setNotice] = useState("");
  const [opening, setOpening] = useState(false);

  const [availability, setAvailability] = useState<{ vendorId: string; available: boolean }>();
  const vendorId = store?.store_id;
  const tone = store ? toneOf(store) : "shop";
  const phone = store?.phone ?? (store?.vendor_card && !store.vendor_card.is_example ? store.vendor_card.phone : null);
  const canInquire = availability?.vendorId !== vendorId || availability?.available !== false;

  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    void request<{ available: boolean }>("/me/conversations/availability?vendor_id=" + encodeURIComponent(vendorId))
      .then(({ available }) => { if (active) setAvailability({ vendorId, available }); })
      .catch(() => {});
    return () => { active = false; };
  }, [vendorId]);

  async function inquire(vendorId: string) {
    if (!member.profile) {
      setNotice("내 정보 탭에서 로그인한 뒤 문의해 주세요.");
      return;
    }
    setOpening(true);
    setNotice("");
    try {
      const thread = await member.api<{ id: string }>("/me/conversations", "POST", { vendor_id: vendorId });
      router.push({ pathname: "/conversation/[id]", params: { id: thread.id } });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "문의를 열지 못했어요.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "업체 상세" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.page}>
        {store ? (
          <>
            <Text style={styles.title}>{displayName(store.name)}</Text>
            <View style={styles.toneRow}>
              <View style={[styles.dot, { backgroundColor: TONES[tone].color }]} />
              <Text style={styles.toneText}>{TONES[tone].label}{tone === "shop" ? ` · ${store.category}` : ""}</Text>
            </View>

            {/* 핵심 정보(v3): 거리·영업시간·전화·가격·주소·출처 */}
            <View style={styles.info}>
              <InfoRow label="거리" value={distanceText(store.distance_m)} />
              {(!!store.hours || !!store.vendor_card) && (
                <InfoRow label="영업" value={[store.vendor_card?.open_status.display, store.hours].filter(Boolean).join(" · ")} />
              )}
              {!!phone && <InfoRow label="전화" value={phone} />}
              {!!store.vendor_card && (
                <InfoRow label="가격" value={store.vendor_card.price.has_price ? store.vendor_card.price.display : "가격 미등록 · 전화로 확인"} />
              )}
              {!!store.address && <InfoRow label="주소" value={store.address} />}
              {!!store.source && <InfoRow label="출처" value={store.source + (store.source_date ? ` (${store.source_date} 기준)` : "")} muted />}
            </View>

            <View style={styles.actions}>
              {!!phone && (
                <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("tel:" + phone)} style={styles.primary}>
                  <Text style={styles.primaryText}>전화하기</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="link" onPress={() =>
                void Linking.openURL("https://map.kakao.com/link/map/" + encodeURIComponent(store.name) + "," + store.lat + "," + store.lng)} style={phone || canInquire ? styles.secondary : styles.primary}>
                <Text style={phone || canInquire ? styles.secondaryText : styles.primaryText}>카카오맵에서 위치 보기</Text>
              </Pressable>
            </View>

            {canInquire ? (
              <View style={styles.inquiryCard}>
                <Text style={styles.inquiryTitle}>사장님에게 문의</Text>
                <Text style={styles.inquiryDescription}>견적이나 이용 가능 시간을 메시지로 물어보세요. 답장은 하단 대화 탭에서 확인할 수 있어요.</Text>
                <Pressable accessibilityRole="button" disabled={opening} onPress={() => void inquire(store.store_id)} style={styles.inquire}>
                  <Text style={styles.inquiryButtonText}>{opening ? "대화 여는 중…" : "문의하기"}</Text>
                </Pressable>
                {!!notice && <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>}
              </View>
            ) : (
              <Text style={styles.note}>메시지 문의는 사장님 계정이 연결되면 열려요.{phone ? " 지금은 전화로 물어보세요." : ""}</Text>
            )}
            <VendorReviews key={store.store_id} vendorId={store.store_id} />
          </>
        ) : <Text style={styles.body}>{error ?? (stores.length ? "업체를 찾지 못했어요." : "업체 정보를 불러오는 중이에요.")}</Text>}
      </ScrollView>
    </>
  );
}

function distanceText(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function InfoRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, muted && styles.infoMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: color.bg },
  toneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  toneText: { fontSize: 14, color: color.sub },
  info: { borderWidth: 1, borderColor: color.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: color.surface },
  infoRow: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.soft },
  infoLabel: { width: 36, fontSize: 14, color: color.sub },
  infoValue: { flex: 1, fontSize: 15, lineHeight: 22, color: color.ink },
  infoMuted: { fontSize: 13, lineHeight: 19, color: color.sub },
  actions: { gap: 8 },
  primary: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color.green },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  secondaryText: { color: color.ink, fontSize: 15, fontWeight: "600" },
  note: { fontSize: 13, lineHeight: 19, color: color.sub },
  inquiryCard: { padding: 16, gap: 8, borderRadius: 16, backgroundColor: color.greenSoft },
  inquiryTitle: { fontSize: 17, fontWeight: "700", color: color.ink },
  inquiryDescription: { fontSize: 13, lineHeight: 20, color: color.sub },
  inquire: { marginTop: 4, minHeight: 44, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: color.green },
  unavailable: { opacity: 0.65 },
  inquiryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  page: { padding: 24, gap: 14 },
  title: { fontSize: 25, fontWeight: "700", color: color.ink },
  body: { fontSize: 15, lineHeight: 22, color: color.ink },
  link: { fontSize: 15, color: color.green },
});
