import { useLocalSearchParams, router } from "expo-router";
import { Linking, Text, View } from "react-native";
import {
  PublishedVendor,
  publishedVendorSchema,
} from "@cheon/vendor-contracts";
import { Action, Card, Heading, Note, Screen, s } from "../../components/ui";
import { vendors, won } from "../../domain/vendors";
import { useApiResource } from "../../lib/api";
import { backendConfigured } from "../../lib/supabase";
import { useAuth } from "../../auth/provider";
import { ProtectedPhoto } from "../../components/ProtectedPhoto";
export default function VendorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const resource = useApiResource(
    backendConfigured ? `/vendors/${id}` : null,
    publishedVendorSchema,
  );
  if (backendConfigured) {
    if (!session)
      return (
        <Screen>
          <Note>로그인이 필요합니다.</Note>
          <Action label="로그인" onPress={() => router.push("/login")} />
        </Screen>
      );
    if (resource.loading)
      return (
        <Screen>
          <Note>승인 업체를 불러오는 중…</Note>
        </Screen>
      );
    if (resource.error || !resource.data)
      return (
        <Screen>
          <Note>{resource.error ?? "공개된 업체를 찾을 수 없습니다."}</Note>
          <Action label="다시 확인" onPress={resource.refresh} />
        </Screen>
      );
    return <LiveDetail vendor={resource.data} />;
  }
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
      </Card>
      <Action label="가상 업체 · 연락처 없음" disabled onPress={() => {}} />
    </Screen>
  );
}
function LiveDetail({ vendor }: { vendor: PublishedVendor }) {
  const phone = vendor.contact.replace(/[\s()-]/g, "");
  const callable = /^\+?[0-9]{7,15}$/.test(phone);
  return (
    <Screen>
      <Note>
        운영자 승인 정보 · 가격 출처는 업체 직접 제공입니다. 가격과 거래 조건은
        주문 전 다시 확인해 주세요.
      </Note>
      <Heading>{vendor.name}</Heading>
      <Text style={s.body}>{vendor.description}</Text>
      {vendor.image_ids.map((id) => (
        <ProtectedPhoto key={id} id={id} />
      ))}
      <Card>
        <Text style={s.body}>
          {vendor.address}
          {"\n"}공개 연락처: {vendor.contact}
          {"\n"}영업시간: {vendor.opening_hours || "업체 문의"}
        </Text>
        {callable && (
          <Action
            label="업체에 전화하기"
            onPress={() => {
              void Linking.openURL("tel:" + phone);
            }}
          />
        )}
      </Card>
      <Card>
        <Text style={s.title}>취급 품목과 가격</Text>
        {vendor.items.map((item) => (
          <View key={item.id} style={{ gap: 6, paddingVertical: 12 }}>
            <Text style={s.title}>
              {item.name} · {item.specification}
            </Text>
            <Text style={s.price}>{won(item.price)}</Text>
            <Text style={s.body}>
              {item.quantity}
              {item.unit} / 포장 · 최소 {item.minimum_packages}포장
            </Text>
            <Text style={s.muted}>
              {
                {
                  included: "부가세 포함",
                  excluded: "부가세 별도",
                  exempt: "면세",
                  "": "세금 확인 필요",
                }[item.tax]
              }
              {"\n"}배송비:{" "}
              {item.delivery_fee === null ? "미확정" : won(item.delivery_fee)} ·{" "}
              {item.delivery_fee_basis || "배송 적용 없음"}
              {"\n"}업체 확인일: {item.checked_on}
            </Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.title}>거래 조건</Text>
        <Text style={s.body}>{vendor.delivery_terms}</Text>
      </Card>
    </Screen>
  );
}
