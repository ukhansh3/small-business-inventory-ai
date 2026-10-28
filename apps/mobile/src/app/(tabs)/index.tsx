import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import * as Location from "expo-location";
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
import { demoCenter, findVendors, won } from "../../domain/vendors";
export default function Explore() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [center, setCenter] = useState(demoCenter);
  const [hint, setHint] = useState("");
  const [locating, setLocating] = useState(false);
  const found = useMemo(() => findVendors(query, category), [query, category]);
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
      setHint(
        "현재 위치로 지도 중심을 옮겼습니다. 샘플 업체는 지역 검색 결과가 아닙니다.",
      );
    } catch {
      setHint("위치를 확인하지 못했습니다. 기본 지역으로 이용해 주세요.");
    } finally {
      setLocating(false);
    }
  }
  return (
    <Screen>
      <Brand />
      <Heading>가까운 업체를 만나보세요</Heading>
      <Note>
        모바일 앱 미리보기 · 아래 업체·품목·가격은 가상 자료입니다. 실제 승인
        업체 DB는 아직 연결하지 않았습니다.
      </Note>
      <Field
        label="업체·취급 품목"
        value={query}
        onChangeText={setQuery}
        placeholder="업체명 또는 품목명을 입력하세요"
        returnKeyType="search"
      />
      <View style={s.row}>
        {["전체", "식자재", "포장재"].map((c) => (
          <Action
            key={c}
            label={c}
            secondary={category !== c}
            onPress={() => setCategory(c)}
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
        <Text style={s.muted}>샘플 {found.length}곳</Text>
      </View>
      {!found.length && (
        <Note>
          일치하는 샘플 업체가 없습니다. 품목명이나 분류를 바꿔보세요.
        </Note>
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
    </Screen>
  );
}
