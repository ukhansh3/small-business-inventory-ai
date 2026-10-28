import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import * as Location from "expo-location";
import { publishedSearchSchema } from "@cheon/vendor-contracts";
import {
  Action,
  Brand,
  Card,
  Field,
  Heading,
  Note,
  Screen,
  s,
} from "../../components/ui";
import { KakaoMap } from "../../components/KakaoMap";
import {
  demoCenter,
  findVendors,
  fromPublishedVendor,
  won,
} from "../../domain/vendors";
import { useAuth } from "../../auth/provider";
import { useApiResource } from "../../lib/api";
import { backendConfigured } from "../../lib/supabase";
export default function Explore() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("전체");
  const [center, setCenter] = useState(demoCenter);
  const [offset, setOffset] = useState(0);
  const [hint, setHint] = useState("");
  const [locating, setLocating] = useState(false);
  const { session, loading: authLoading } = useAuth();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const path =
    backendConfigured && session
      ? "/vendors?" +
        new URLSearchParams({
          latitude: String(center.latitude),
          longitude: String(center.longitude),
          radius: "3000",
          query: debounced,
          category: category === "전체" ? "" : category,
          offset: String(offset),
        }).toString()
      : null;
  const live = useApiResource(path, publishedSearchSchema);
  const demo = useMemo(
    () => findVendors(debounced, category),
    [debounced, category],
  );
  const found = backendConfigured
    ? (live.data?.vendors.map(fromPublishedVendor) ?? [])
    : demo;
  async function locate() {
    setLocating(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.status !== "granted") {
        setHint("위치 권한 없이 기본 지역을 사용할 수 있습니다.");
        return;
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12000),
        ),
      ]);
      setCenter({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setOffset(0);
      setHint(
        backendConfigured
          ? "현재 위치 반경 3km의 승인 업체를 조회합니다."
          : "지도 중심만 이동했습니다. 현재 목록은 가상 샘플입니다.",
      );
    } catch {
      setHint("위치를 확인하지 못했습니다. 기본 지역으로 이용해 주세요.");
    } finally {
      setLocating(false);
    }
  }
  if (backendConfigured && !session)
    return (
      <Screen>
        <Brand />
        <Heading>업체 탐색</Heading>
        <Note>
          {authLoading
            ? "로그인을 확인하고 있습니다."
            : "승인된 업체를 보려면 로그인해 주세요. 비로그인 공개 범위는 아직 정하지 않았습니다."}
        </Note>
        <Action
          label="로그인"
          disabled={authLoading}
          onPress={() => router.push("/login")}
        />
      </Screen>
    );
  return (
    <Screen>
      <Brand />
      <Heading>가까운 업체를 만나보세요</Heading>
      <Note>
        {backendConfigured
          ? "운영자가 승인한 현재 공개본만 표시합니다. 가격은 업체 제공 정보이며 주문 전 확인이 필요합니다."
          : "서버 미연결 · 아래 업체·품목·가격은 가상 샘플입니다. 실제 DB 결과와 섞지 않습니다."}
      </Note>
      <Field
        label="업체·취급 품목"
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          setOffset(0);
        }}
        placeholder="업체명 또는 품목명을 입력하세요"
        maxLength={100}
        returnKeyType="search"
      />
      <View style={s.row}>
        {["전체", "식자재", "포장재"].map((c) => (
          <Action
            key={c}
            label={c}
            secondary={category !== c}
            onPress={() => {
              setCategory(c);
              setOffset(0);
            }}
          />
        ))}
      </View>
      <KakaoMap
        vendors={found}
        center={center}
        onSelect={(id) =>
          router.push({ pathname: "/vendor/[id]", params: { id } })
        }
      />
      <Action
        label={locating ? "위치 확인 중…" : "현재 위치로 지도 이동"}
        disabled={locating}
        secondary
        onPress={() => void locate()}
      />
      {!!hint && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {hint}
        </Text>
      )}
      <View style={s.row}>
        <Heading>업체 목록</Heading>
        <Text style={s.muted}>
          {backendConfigured ? "현재 페이지" : "샘플"} {found.length}곳
        </Text>
      </View>
      {backendConfigured && (
        <Action secondary label="업체 목록 새로고침" onPress={live.refresh} />
      )}
      {live.loading && <Note>승인된 업체를 DB에서 검색하는 중…</Note>}
      {live.error && <Note>{live.error}</Note>}
      {!live.loading && !live.error && !found.length && (
        <Note>일치하는 업체가 없습니다. 검색어·분류·위치를 바꿔보세요.</Note>
      )}
      {found.map((v) => (
        <Card key={v.id}>
          <Text style={s.title}>{v.name}</Text>
          <Text style={s.muted}>
            {v.district} · {v.category}
          </Text>
          {v.items.map((item) => (
            <View key={item.id} style={s.row}>
              <Text style={s.body}>
                {item.name} {item.quantity}
                {item.unit}
              </Text>
              <Text style={s.price}>{won(item.price)}</Text>
            </View>
          ))}
          <Action
            label="업체 상세 보기"
            onPress={() =>
              router.push({ pathname: "/vendor/[id]", params: { id: v.id } })
            }
          />
        </Card>
      ))}
      {backendConfigured && (
        <View style={s.row}>
          <Action
            label="이전"
            secondary
            disabled={offset === 0 || live.loading}
            onPress={() => setOffset((n) => Math.max(0, n - 20))}
          />
          <Action
            label="다음"
            secondary
            disabled={found.length < 20 || live.loading}
            onPress={() => setOffset((n) => n + 20)}
          />
        </View>
      )}
    </Screen>
  );
}
