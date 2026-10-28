import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
import { Action, Card, Heading, Note, Screen, s } from "../../components/ui";
import { vendors, won } from "../../domain/vendors";
export default function VendorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendor = vendors.find((v) => v.id === id);
  if (!vendor)
    return (
      <Screen>
        <Heading>업체를 찾을 수 없습니다</Heading>
        <Action label="목록으로" onPress={() => router.replace("/")} />
      </Screen>
    );
  return (
    <Screen>
      <Note>가상 업체 · 실제 운영자 승인이나 판매 정보가 아닙니다.</Note>
      <Heading>{vendor.name}</Heading>
      <Text style={s.body}>{vendor.district}</Text>
      <Card>
        <Text style={s.title}>취급 품목과 가격</Text>
        {vendor.items.map((item) => (
          <View key={item.id} style={{ gap: 5, paddingVertical: 10 }}>
            <Text style={s.title}>
              {item.name} · {item.quantity}
              {item.unit}
            </Text>
            <Text style={s.price}>{won(item.price)}</Text>
            <Text style={s.muted}>{item.tax} · 최소 주문 1포장</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.title}>거래 조건</Text>
        <Text style={s.body}>{vendor.delivery}</Text>
        <Text style={s.muted}>가상 정보 확인일: {vendor.checkedAt}</Text>
        <Text style={s.muted}>
          가격과 배송 조건은 주문 전에 업체에 확인해야 합니다.
        </Text>
      </Card>
      <Action label="가상 업체 · 연락처 없음" disabled onPress={() => {}} />
    </Screen>
  );
}
