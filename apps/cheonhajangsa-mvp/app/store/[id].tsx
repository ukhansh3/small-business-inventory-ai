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
            <Text style={styles.title}>{store.name}</Text>
            <Text style={styles.body}>{store.category}</Text>
            <Text style={styles.body}>{store.demo_service
              ? "시연용 업체예요. 제공 서비스는 " + store.demo_service + "입니다."
              : store.name + "은(는) " + store.category + " 업체예요."}</Text>
            {!store.demo_service && !!store.address && <Text style={styles.body}>{store.address}</Text>}
            {!!store.source && <Text style={styles.body}>정보 출처 · {store.source}</Text>}
            {!store.demo_service && (
              <Pressable accessibilityRole="link" onPress={() =>
                void Linking.openURL("https://map.kakao.com/link/map/" + encodeURIComponent(store.name) + "," + store.lat + "," + store.lng)}>
                <Text style={styles.link}>카카오맵에서 위치 보기</Text>
              </Pressable>
            )}
            {!!store.vendor_card?.phone && !store.vendor_card.is_example && (
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("tel:" + store.vendor_card?.phone)}>
                <Text style={styles.link}>업체에 전화하기</Text>
              </Pressable>
            )}
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

const styles = StyleSheet.create({
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
