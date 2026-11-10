import { AppIcon } from "../../src/components/AppIcon";
import { VendorArtwork } from "../../src/components/VendorArtwork";
import { getVendorDetail } from "../../src/lib/api";
import type { VendorDetail } from "../../src/lib/api-types";
import { useEffect, useState } from "react";
import { request, useMember } from "../../src/lib/members";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { VendorReviews } from "../../src/components/VendorReviews";
import { color } from "../../src/components/theme";
import { useStores } from "../../src/hooks/useStores";
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
  const locationId = location || getSavedLocation() || "loc_ajou_main";
  const vendorCard = store?.vendor_card;
  const [details, setDetails] = useState<{ key: string; hours: VendorDetail["opening_hours"] }>();
  const detailKey = vendorCard ? vendorCard.vendor_id + "/" + locationId : "";
  const sample = vendorId ? sampleContacts[vendorId] : undefined;
  const hours = sample
    ? (Object.keys(dayLabels) as (keyof typeof dayLabels)[]).map((day) => ({
      day, display: day === "sun" ? "쉬는 날" : day === "sat" ? sample.saturday : sample.weekdays,
    }))
    : details?.key === detailKey ? details.hours : undefined;

  useEffect(() => {
    if (!vendorCard || sample) return;
    let active = true;
    void getVendorDetail(vendorCard.vendor_id, { item_id: "item_lettuce", location_id: locationId })
      .then((detail) => { if (active) setDetails({ key: detailKey, hours: detail.opening_hours }); })
      .catch(() => {});
    return () => { active = false; };
  }, [detailKey, locationId, vendorCard, sample]);
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
      <ScrollView contentContainerStyle={styles.page}>
        {store ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.title}>{store.name}</Text>
              <Text style={styles.meta}>{store.category} · {store.distance_m < 1000 ? store.distance_m + "m" : (store.distance_m / 1000).toFixed(1) + "km"}</Text>
              <VendorArtwork card={vendorCard} store={store} large />
            </View>
            <View style={styles.panel}>
              <Text style={styles.inquiryTitle}>업체 소개</Text>
              <Text style={styles.body}>{store.demo_service
                ? "제공 서비스 · " + store.demo_service
                : store.name + "은(는) 아주대 주변의 " + store.category + " 업체입니다."}</Text>
              {!store.demo_service && !!store.address && (
                <View style={styles.infoRow}>
                  <AppIcon name="locate" size={18} color={color.sub} />
                  <View style={styles.infoCopy}>
                    <Text style={styles.meta}>위치</Text>
                    <Text style={styles.body}>{store.address}</Text>
                    <Pressable accessibilityRole="link" onPress={() =>
                      void Linking.openURL("https://map.kakao.com/link/map/" + encodeURIComponent(store.name) + "," + store.lat + "," + store.lng)}>
                      <Text style={styles.link}>카카오맵에서 위치 보기</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <View style={styles.infoRow}>
                <AppIcon name="store" size={18} color={color.sub} />
                <View style={styles.infoCopy}>
                  <Text style={styles.meta}>{(sample || vendorCard?.is_example) && hours ? "예시 영업시간" : "영업시간"}</Text>
                  {hours ? hours.map((entry) => (
                    <View key={entry.day} style={styles.hoursRow}>
                      <Text style={styles.day}>{dayLabels[entry.day]}</Text>
                      <Text style={styles.body}>{entry.display}</Text>
                    </View>
                  )) : <Text style={styles.body}>등록된 영업시간이 없어요.</Text>}
                </View>
              </View>
              <View style={styles.infoRow}>
                <AppIcon name="user" size={18} color={color.sub} />
                <View style={styles.infoCopy}>
                  <Text style={styles.meta}>{sample ? "예시 업체 전화번호" : "연락처"}</Text>
                  {sample ? <Text style={styles.body}>{sample.phone}</Text> : vendorCard?.phone && !vendorCard.is_example ? (
                    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("tel:" + vendorCard.phone)}>
                      <Text style={styles.link}>{vendorCard.phone}</Text>
                    </Pressable>
                  ) : <Text style={styles.body}>등록된 전화번호가 없어요.</Text>}
                </View>
              </View>
              {!!store.source && <Text style={styles.meta}>정보 출처 · {store.source}</Text>}
            </View>
            <View style={styles.inquiryCard}>
              <Text style={styles.inquiryTitle}>사장님에게 문의</Text>
              <Text style={styles.inquiryDescription}>견적이나 이용 가능 시간을 메시지로 물어보세요. 답장은 하단 대화 탭에서 확인할 수 있어요.</Text>
              <Pressable accessibilityRole="button" disabled={opening || !canInquire} onPress={() => void inquire(store.store_id)} style={[styles.inquire, !canInquire && styles.unavailable]}>
                <Text style={styles.inquiryButtonText}>{!canInquire ? "메시지 문의 준비 중" : opening ? "대화 여는 중…" : "문의하기"}</Text>
              </Pressable>
              {!canInquire && <Text style={styles.inquiryDescription}>아직 문의를 받을 사장님 계정이 연결되지 않았어요.</Text>}
              {!!notice && <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>}
            </View>
            <VendorReviews key={store.store_id} vendorId={store.store_id} />
          </>
        ) : <Text style={styles.body}>{error ?? (stores.length ? "업체를 찾지 못했어요." : "업체 정보를 불러오는 중이에요.")}</Text>}
      </ScrollView>
    </>
  );
}

const sampleContacts: Record<string, { weekdays: string; saturday: string; phone: string }> = {
  "demo-oil": { weekdays: "08:30~18:00", saturday: "09:00~13:00", phone: "000-0000-0101" },
  v_001: { weekdays: "06:30~20:00", saturday: "06:30~18:00", phone: "000-0000-0102" },
  "demo-interior": { weekdays: "10:00~18:30", saturday: "10:00~15:00", phone: "000-0000-0103" },
  ps_MA0101202607A0141762: { weekdays: "09:00~21:00", saturday: "09:00~20:00", phone: "000-0000-0104" },
  "demo-repair": { weekdays: "09:00~18:00", saturday: "09:00~14:00", phone: "000-0000-0105" },
  "demo-produce": { weekdays: "07:00~19:00", saturday: "07:00~17:00", phone: "000-0000-0106" },
  v_005: { weekdays: "08:00~19:30", saturday: "08:00~18:00", phone: "000-0000-0107" },
  v_003: { weekdays: "08:00~22:00", saturday: "08:00~21:00", phone: "000-0000-0108" },
  v_002: { weekdays: "07:30~18:30", saturday: "07:30~17:00", phone: "000-0000-0109" },
};

const dayLabels = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

const styles = StyleSheet.create({
  panel: { padding: 16, gap: 10, borderRadius: 16, borderWidth: 1, borderColor: color.line, backgroundColor: "#fff" },
  meta: { fontSize: 13, lineHeight: 19, color: color.sub },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line },
  infoCopy: { flex: 1, gap: 3 },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  day: { width: 18, color: color.ink, fontWeight: "700" },
  inquiryCard: { padding: 16, gap: 8, borderRadius: 16, backgroundColor: color.greenSoft },
  inquiryTitle: { fontSize: 17, fontWeight: "700", color: color.ink },
  inquiryDescription: { fontSize: 13, lineHeight: 20, color: color.sub },
  inquire: { marginTop: 4, minHeight: 44, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: color.green },
  unavailable: { opacity: 0.65 },
  inquiryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  page: { padding: 16, gap: 14, backgroundColor: color.soft },
  title: { fontSize: 25, fontWeight: "700", color: color.ink },
  body: { fontSize: 15, lineHeight: 22, color: color.ink },
  link: { fontSize: 15, color: color.green },
});
