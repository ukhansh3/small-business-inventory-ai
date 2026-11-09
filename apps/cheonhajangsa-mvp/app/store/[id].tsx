import { Stack, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { VendorReviews } from "../../src/components/VendorReviews";
import { SaveVendorButton } from "../../src/components/SaveVendorButton";
import { color } from "../../src/components/theme";
import { useStores } from "../../src/hooks/useStores";
import { getSavedLocation } from "../../src/lib/location";

export default function StoreDetail() {
  const { id, location } = useLocalSearchParams<{ id: string; location?: string }>();
  const { stores, error } = useStores(location || getSavedLocation());
  const store = stores.find((entry) => entry.store_id === id);

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
            {!!store.address && <Text style={styles.body}>{store.address}</Text>}
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
            <SaveVendorButton id={store.store_id} location={location || getSavedLocation() || "loc_ajou_main"} />
            <VendorReviews key={store.store_id} vendorId={store.store_id} />
          </>
        ) : <Text style={styles.body}>{error ?? (stores.length ? "업체를 찾지 못했어요." : "업체 정보를 불러오는 중이에요.")}</Text>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 14 },
  title: { fontSize: 25, fontWeight: "700", color: color.ink },
  body: { fontSize: 15, lineHeight: 22, color: color.ink },
  link: { fontSize: 15, color: color.green },
});
