import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { VendorCard } from "../core/search-types";
import { AskOptions } from "../src/components/AskOptions";
import { CallSheet } from "../src/components/CallSheet";
import { ChatInput } from "../src/components/ChatInput";
import { ChatLog } from "../src/components/ChatLog";
import { ChipEditor } from "../src/components/ChipEditor";
import { ConditionChips } from "../src/components/ConditionChips";
import { ExampleBanner } from "../src/components/ExampleBanner";
import { KakaoMap } from "../src/components/KakaoMap";
import { MarketLine } from "../src/components/MarketLine";
import { NoticeCard } from "../src/components/NoticeCard";
import { PriceCheckCard } from "../src/components/PriceCheckCard";
import { ResultList } from "../src/components/ResultList";
import { StoreCard, StoreList } from "../src/components/StoreList";
import { color, font, radius } from "../src/components/theme";
import { useAssist } from "../src/hooks/useAssist";
import { useStores } from "../src/hooks/useStores";
import { type CallPlan, isPhoneUserAgent, planCall } from "../src/lib/call";
import { isTestDevice } from "../src/lib/device";
import { focusFor, pinsFor } from "../src/lib/map-pins";

// 지도 홈(v2 S-10): 위 입력창 + 카카오맵 + 아래 목록 시트. 대화·결과·진단·상세 흐름은 시트 안에(component-map 1·7절)
const IS_PHONE = Platform.OS !== "web" || isPhoneUserAgent(globalThis.navigator?.userAgent ?? "");

export default function HomeScreen() {
  const a = useAssist();
  const s = a.state;
  const router = useRouter();

  // 위치 화면(S-06)에서 돌아오면 바뀐 위치를 반영한다(WF-02)
  useFocusEffect(useCallback(() => a.applySavedLocation(), [a.applySavedLocation]));
  const openLocation = () => router.push("/location");
  const openDetail = (card: VendorCard) =>
    router.push({
      pathname: "/vendor/[id]",
      params: {
        id: card.vendor_id,
        item_id: s.condition.item_id ?? "item_lettuce",
        location_id: s.condition.location_id ?? "",
        session_id: s.sessionId ?? "",
        rank: String(card.rank),
      },
    });
  const scroll = useRef<ScrollViewInstance>(null);
  const { height: screenH } = useWindowDimensions();
  const [sheetOpen, setSheetOpen] = useState(false); // 목록을 크게(지도 작게)
  const [selectedId, setSelectedId] = useState<string | null>(null); // 지도에서 고른 가게
  const st = useStores(s.condition.location_id ?? a.currentLocation?.location_id ?? null);
  const me = a.currentLocation;
  const pins = useMemo(() => pinsFor(st.stores, me ? { lat: me.lat, lng: me.lng, name: me.name } : null), [st.stores, me]);
  const focusIds = useMemo(() => focusFor(selectedId, s.results, s.priceCheck), [selectedId, s.results, s.priceCheck]);
  const selected = selectedId ? st.stores.find((x) => x.store_id === selectedId) ?? null : null;
  const mapHeight = sheetOpen ? 140 : Math.max(200, Math.round(screenH * 0.36));

  // 새 결과·진단이 오면 고른 가게 강조를 푼다(결과 핀을 강조, AC-30)
  useEffect(() => setSelectedId(null), [s.results, s.priceCheck]);
  const onPinPress = (id: string) => {
    setSelectedId(id);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };
  const [call, setCall] = useState<{ card: VendorCard; plan: Exclude<CallPlan, { kind: "dial" }> } | null>(null);

  const chipsY = useRef(0);

  // 대화 중에는 맨 아래로. 결과가 있으면 조건 칩이 화면 위에 오게 해서 칩 편집과 상위 결과가 보이게 한다.
  const priceY = useRef(0);
  useEffect(() => {
    if (s.messages.length === 0) return; // 대화 전에는 가게 목록 맨 위에 둔다
    if (s.results && s.editor !== "recover") scroll.current?.scrollTo({ y: Math.max(chipsY.current - 12, 0), animated: true });
    else if (s.priceCheck && !s.loading) return; // 진단 카드는 자리가 잡힐 때(onLayout) 맨 위로 맞춘다
    else scroll.current?.scrollToEnd({ animated: true });
  }, [s.messages.length, s.loading, s.editor, s.results, s.priceCheck]);

  const onCall = (card: VendorCard) => {
    a.recordCall(card); // tel:을 열기 전에 보낸다(API-04)
    const plan = planCall(card, IS_PHONE);
    if (plan.kind === "dial") void Linking.openURL(plan.url);
    else setCall({ card, plan });
  };

  const started = s.messages.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>천하장사</Text>
        {s.aiMode === "stored" && <Text style={styles.stored}>저장된 응답</Text>}
        {isTestDevice() && <Text style={styles.stored}>테스트 기기</Text>}
        <View style={styles.spacer} />
        {started && (
          <Pressable
            accessibilityRole="button"
            disabled={s.loading}
            onPress={() => {
              setSelectedId(null);
              a.restart();
            }}
            style={styles.restart}
          >
            <Text style={styles.restartLabel}>새로 찾기</Text>
          </Pressable>
        )}
      </View>
      {s.exampleData && <ExampleBanner />}
      <ChatInput disabled={s.loading} error={s.inputError} onSend={a.sendText} onPhoto={a.sendPhoto} />
      <Pressable accessibilityRole="button" accessibilityHint="눌러서 내 위치 바꾸기" disabled={s.loading} onPress={openLocation} style={styles.locationBar}>
        <Text style={styles.locationText}>
          내 위치: <Text style={styles.locationName}>{a.currentLocation?.name ?? "기본 위치"}</Text> ▾
        </Text>
      </Pressable>

      {me ? (
        <KakaoMap center={{ lat: me.lat, lng: me.lng }} pins={pins} focusIds={focusIds} height={mapHeight} onPinPress={onPinPress} />
      ) : (
        <View style={[styles.mapWait, { height: mapHeight }]} />
      )}

      <Pressable accessibilityRole="button" onPress={() => setSheetOpen((v) => !v)} style={styles.handle}>
        <View style={styles.grip} />
        <Text style={styles.handleLabel}>{sheetOpen ? "지도 크게 보기 ▼" : "목록 크게 보기 ▲"}</Text>
      </Pressable>

      <ScrollView ref={scroll} style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {selected && (
          <View style={styles.selected}>
            <View style={styles.selectedHead}>
              <Text style={styles.selectedTitle}>지도에서 고른 가게</Text>
              <Pressable accessibilityRole="button" onPress={() => setSelectedId(null)}>
                <Text style={styles.selectedClose}>닫기</Text>
              </Pressable>
            </View>
            <StoreCard store={selected} onCall={onCall} onDetail={openDetail} />
          </View>
        )}

        <Text style={styles.intro}>사장님, 필요한 재료를 한 마디로 말씀해 주세요.</Text>
        {!started && (
          <Text style={styles.introSub}>
            재료 이름(상추), 받은 가격(상추 2kg 1만원), 영수증·결제내역 사진(📷) 중 하나를 위 입력창에 보내 주세요. {a.currentLocation?.name ?? "내 위치"} 근처 판매처와 동네 시세로 알려 드려요.
          </Text>
        )}

        <ChatLog messages={s.messages} loading={s.loading} />

        {s.ask && !s.loading && <AskOptions ask={s.ask} disabled={s.loading} onPick={(o) => a.sendChoice(s.ask!.slot, o)} />}

        {s.notice && !s.loading && (
          <NoticeCard notice={s.notice} request={s.request} disabled={s.loading} onRequest={a.requestItem} onSearchLettuce={a.searchLettuce} />
        )}

        {s.networkError && (
          <View style={styles.netErr}>
            <Text style={styles.netErrText}>연결이 끊겼어요.</Text>
            <Pressable accessibilityRole="button" onPress={a.retry} style={styles.retry}>
              <Text style={styles.retryLabel}>다시 시도</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.conditions} onLayout={(e) => (chipsY.current = e.nativeEvent.layout.y)}>
          {s.chips && <ConditionChips chips={s.chips} disabled={s.loading} onEdit={a.openEditor} onLocation={openLocation} />}
          {s.editor !== "closed" && (
            <ChipEditor
              key={s.editor}
              editor={s.editor}
              condition={s.condition}
              disabled={s.loading}
              onSubmit={a.editCondition}
              onClose={() => a.openEditor("closed")}
            />
          )}
        </View>

        {s.market && s.results && <MarketLine market={s.market} />}
        {s.results && <ResultList results={s.results} onCall={onCall} onDetail={openDetail} />}

        {s.priceCheck && !s.loading && (
          <View
            key={s.priceCheck.check_id} // 새 진단마다 다시 그려 자리를 다시 잡는다
            onLayout={(e) => {
              priceY.current = e.nativeEvent.layout.y;
              scroll.current?.scrollTo({ y: Math.max(priceY.current - 80, 0), animated: true });
            }}
          >
          <PriceCheckCard
            check={s.priceCheck}
            share={s.share}
            disabled={s.loading}
            onShare={a.sharePrice}
            onSearch={a.searchLettuce}
            onCall={onCall}
            onDetail={openDetail}
          />
          </View>
        )}

        {!started && (st.error ? (
          <View style={styles.netErr}>
            <Text style={styles.netErrText}>{st.error}</Text>
            <Pressable accessibilityRole="button" onPress={st.retry} style={styles.retry}>
              <Text style={styles.retryLabel}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          <StoreList stores={st.stores} onCall={onCall} onDetail={openDetail} />
        ))}
      </ScrollView>

      {call && <CallSheet card={call.card} plan={call.plan} onClose={() => setCall(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  brand: { fontSize: font.title, fontWeight: "800", color: color.green },
  stored: { fontSize: 12, color: color.sub, borderWidth: 1, borderColor: color.line, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  spacer: { flex: 1 },
  restart: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  restartLabel: { fontSize: font.small, color: color.ink, fontWeight: "600" },
  locationBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  locationText: { fontSize: font.small, color: color.sub },
  locationName: { color: color.green, fontWeight: "700" },
  mapWait: { width: "100%", backgroundColor: color.greenSoft },
  handle: { alignItems: "center", gap: 4, paddingTop: 6, paddingBottom: 8, backgroundColor: color.surface, borderTopLeftRadius: 14, borderTopRightRadius: 14, marginTop: -12, borderBottomWidth: 1, borderBottomColor: color.line },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.line },
  handleLabel: { fontSize: 12, color: color.sub, fontWeight: "600" },
  selected: { gap: 8 },
  selectedHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectedTitle: { fontSize: font.small, fontWeight: "700", color: color.sub },
  selectedClose: { fontSize: font.small, color: color.sub, padding: 4 },
  body: { flex: 1 },
  content: { padding: 16, gap: 14 },
  conditions: { gap: 10 },
  intro: { fontSize: font.large, fontWeight: "700", color: color.ink },
  introSub: { fontSize: font.body, color: color.sub, lineHeight: 22 },
  netErr: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius, backgroundColor: color.redSoft },
  netErrText: { flex: 1, fontSize: font.body, color: color.red },
  retry: { backgroundColor: color.red, borderRadius: radius, paddingVertical: 8, paddingHorizontal: 14 },
  retryLabel: { color: "#ffffff", fontWeight: "700", fontSize: font.body },
});
