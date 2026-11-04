import { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { syntheticVendorSearchSchema, type SyntheticVendor } from "@cheon/vendor-contracts";
import { useAuth } from "../auth/provider";
import { Action, Card, Field, Heading, Note, colors, s } from "../components/ui";
import { KakaoMap } from "../components/KakaoMap";
import { won, type Vendor } from "../domain/vendors";
import { useApiResource } from "../lib/api";
import { backendConfigured } from "../lib/supabase";
import { useMapLocation } from "../lib/use-map-location";

const categories = ["전체", "식자재 도매", "폐기물 수집·운반업", "폐수·정화조 관리", "실내건축공사업", "주방기기 수리", "청소·위생관리", "옥외광고업·간판", "전기공사업", "냉난방 설비", "기계가스설비공사업", "소독·방역", "포장재 도매"];
const noVendors: SyntheticVendor[] = [];

function toMapVendor(v: SyntheticVendor): Vendor {
  return {
    id: v.id,
    name: v.name,
    category: v.category,
    district: v.area,
    latitude: v.latitude,
    longitude: v.longitude,
    delivery: v.terms,
    checkedAt: "시연용 가상 정보",
    items: [],
    dataKind: "fixture",
  };
}

export default function DemoVendors() {
  const { session } = useAuth();
  const { center, current, message, locating, locate, recenterKey } = useMapLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [selected, setSelected] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ko-KR"));
  const path = backendConfigured && session ? "/synthetic-vendors" : null;
  const resource = useApiResource(path, syntheticVendorSearchSchema);
  const result = resource.data;
  const allRows = result?.vendors ?? noVendors;
  const rows = useMemo(() => allRows.filter((vendor) =>
    (category === "전체" || vendor.category === category) &&
    (!deferredQuery || [vendor.name, vendor.category, vendor.area, vendor.service].some((value) => value.toLocaleLowerCase("ko-KR").includes(deferredQuery))),
  ), [allRows, category, deferredQuery]);
  const pins = useMemo(() => rows.map(toMapVendor), [rows]);
  const data = selected ? rows.filter((vendor) => vendor.id === selected) : rows;
  const header = <View style={{ gap: 14 }}>
    <Heading>아주대 주변 가상 업체 200곳</Heading>
    <Note>200곳 모두 아주대 반경 8km 안의 가상 업체입니다. 업체명·위치·가격·조건은 시연용으로 만들었습니다.</Note>
    <Field label="업체·업종·품목 검색" value={query} onChangeText={(value) => { setQuery(value); setSelected(null); }} placeholder="예: 후드, 간판, 폐기물" maxLength={100} returnKeyType="search" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
      {categories.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => { setCategory(item); setSelected(null); }} style={{ backgroundColor: category === item ? colors.orange : colors.cream, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 18 }}>
        <Text style={{ color: category === item ? colors.white : colors.ink, fontWeight: "700" }}>{item}</Text>
      </Pressable>)}
    </ScrollView>
    <Text style={s.muted}>{resource.loading ? "업체 불러오는 중…" : `${rows.length}곳 · 가상 시연 자료`}</Text>
    {!!resource.error && <Note>{resource.error}</Note>}
    <KakaoMap vendors={pins} center={center} currentLocation={current} recenterKey={recenterKey} onSelect={setSelected} />
    <Action secondary label={locating ? "현재 위치 확인 중…" : "내 위치로 이동"} disabled={locating} onPress={() => void locate()} />
    <Text style={s.muted}>{message}</Text>
    {selected && <Action secondary label="업체 전체 보기" onPress={() => setSelected(null)} />}
  </View>;
  if (!backendConfigured || !session) return <View style={{ flex: 1, backgroundColor: colors.white, padding: 20, gap: 16 }}>
    <Heading>가상 업체 시연</Heading>
    <Note>{!backendConfigured ? "Supabase 서버 설정을 확인해 주세요." : "가상 업체 시연 자료를 보려면 로그인해 주세요."}</Note>
    <Action label="로그인" onPress={() => router.push("/login")} />
  </View>;
  return <FlatList
    data={data}
    keyExtractor={(item) => item.id}
    ListHeaderComponent={header}
    renderItem={({ item }) => <Card>
      <Text style={s.title}>{item.name}</Text>
      <Text style={s.body}>{item.category} · {item.area}</Text>
      <Text style={s.body}>{item.service} · {item.unit}</Text>
      <Text style={s.price}>{won(item.price)} <Text style={s.muted}>/ {item.unit}</Text></Text>
      <Text style={s.body}>{item.terms}</Text>
      <Note>{item.demo_notice}</Note>
    </Card>}
    ListEmptyComponent={resource.loading ? undefined : <Note>검색 조건에 맞는 가상 업체가 없습니다.</Note>}
    contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 14, maxWidth: 760, width: "100%", alignSelf: "center" }}
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    windowSize={7}
    keyboardShouldPersistTaps="handled"
  />;
}
