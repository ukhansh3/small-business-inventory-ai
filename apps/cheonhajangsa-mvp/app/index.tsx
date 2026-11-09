import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { VendorCard } from "../core/search-types";
import { AskOptions } from "../src/components/AskOptions";
import { CallSheet } from "../src/components/CallSheet";
import { ChatInput } from "../src/components/ChatInput";
import { ChatLog } from "../src/components/ChatLog";
import { ChipEditor } from "../src/components/ChipEditor";
import { ConditionChips } from "../src/components/ConditionChips";
import { KakaoMap } from "../src/components/KakaoMap";
import { MarketLine } from "../src/components/MarketLine";
import { NoticeCard } from "../src/components/NoticeCard";
import { PriceCheckCard } from "../src/components/PriceCheckCard";
import { ResultList } from "../src/components/ResultList";
import { color, font, radius } from "../src/components/theme";
import { useAssist } from "../src/hooks/useAssist";
import { useStores } from "../src/hooks/useStores";
import { type CallPlan, isPhoneUserAgent, planCall } from "../src/lib/call";
import { isTestDevice } from "../src/lib/device";
import { focusFor, pinsFor } from "../src/lib/map-pins";
import { AppIcon, type IconName } from "../src/components/AppIcon";
import { CompactStoreCard } from "../src/components/CompactStoreCard";
import { CommunityScreen, SavedScreen, ProfileScreen } from '../src/components/MemberScreens';

const IS_PHONE = Platform.OS !== "web" || isPhoneUserAgent(globalThis.navigator?.userAgent ?? "");
type ActiveTab = "map" | "assistant" | "community" | "saved" | "profile";

export default function HomeScreen() {
  const a = useAssist();
  const s = a.state;
  const router = useRouter();
  const [tab, setTab] = useState<ActiveTab>("map");
  const [sheetMode, setSheetMode] = useState<"collapsed" | "preview" | "list">("collapsed");
  const [visiblePinCount, setVisiblePinCount] = useState<number | null>(null);
  const [mapStageHeight, setMapStageHeight] = useState(400);
  const [query, setQuery] = useState("");
  const [storeQuery, setStoreQuery] = useState("");
  const [showAiResults, setShowAiResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [call, setCall] = useState<{ card: VendorCard; plan: Exclude<CallPlan, { kind: "dial" }> } | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const chipsY = useRef(0);
  const priceY = useRef(0);

  const { applySavedLocation } = a;
  useFocusEffect(useCallback(() => applySavedLocation(), [applySavedLocation]));
  const st = useStores(s.condition.location_id ?? a.currentLocation?.location_id ?? null);
  const me = a.currentLocation;
  const visibleStores = useMemo(() => {
    const keyword = storeQuery.toLowerCase();
    const produceQuery = /^(야채|채소|과일|청과)$/.test(keyword);
    return st.stores.filter((store) => {
      if (selectedCategory) return store.category === selectedCategory;
      const description = [store.name, store.category, store.vendor_card?.kind, store.demo_service].join(" ").toLowerCase();
      return description.replace(/\s+/g, "").includes(keyword.replace(/\s+/g, "")) ||
        (produceQuery && /채소|야채|과일|청과|시장점포/.test(description));
    });
  }, [st.stores, storeQuery, selectedCategory]);
  const categories = [...new Set(st.stores.map((store) => store.category))];
  const mapStores = showAiResults ? st.stores : visibleStores;
  const pins = useMemo(() => pinsFor(mapStores, me ? { lat: me.lat, lng: me.lng, name: me.name } : null), [mapStores, me]);
  const focusIds = useMemo(
    () => focusFor(selectedId, showAiResults ? s.results : null, showAiResults ? s.priceCheck : null),
    [selectedId, showAiResults, s.results, s.priceCheck],
  );
  const selected = selectedId ? mapStores.find((store) => store.store_id === selectedId) ?? null : null;
  const mapHeight = mapStageHeight;
  const collapsedSheetHeight = 82;
  const sheetOpen = sheetMode === "list";
  const showPreview = sheetMode === "preview" && selected !== null;
  const previewHeight = Math.max(collapsedSheetHeight, Math.min(230, Math.round(mapStageHeight * 0.6)));
  const sheetHeight = sheetOpen
    ? Math.max(collapsedSheetHeight, Math.min(mapStageHeight - 40, 570))
    : showPreview ? previewHeight : collapsedSheetHeight;
  const started = s.messages.length > 0;

  useEffect(() => {
    if (tab !== "assistant" || s.messages.length === 0) return;
    if (s.results && s.editor !== "recover") scroll.current?.scrollTo({ y: Math.max(chipsY.current - 12, 0), animated: true });
    else if (!s.priceCheck || s.loading) scroll.current?.scrollToEnd({ animated: true });
  }, [tab, s.messages.length, s.loading, s.editor, s.results, s.priceCheck]);

  const openLocation = () => router.push("/location");
  const openDetail = (card: VendorCard) => router.push({
    pathname: "/vendor/[id]",
    params: { id: card.vendor_id, item_id: s.condition.item_id ?? "item_lettuce", location_id: s.condition.location_id ?? "", session_id: s.sessionId ?? "", rank: String(card.rank) },
  });
  const onCall = (card: VendorCard) => {
    a.recordCall(card);
    const next = planCall(card, IS_PHONE);
    if (next.kind === "dial") void Linking.openURL(next.url);
    else setCall({ card, plan: next });
  };
  const searchStores = (keyword: string, category = "") => {
    setSelectedCategory(category);
    setQuery(keyword);
    setStoreQuery(keyword);
    setSelectedId(null);
    setShowAiResults(false);
    setSheetMode(keyword ? "list" : "collapsed");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <Header tab={tab} test={isTestDevice()} stored={s.aiMode === "stored"} started={started} loading={s.loading} onRestart={() => { setSelectedId(null); a.restart(); }} />
        {tab === "map" ? (
          <>
            <View style={styles.mapTools}>
              <Pressable accessibilityRole="button" accessibilityHint="눌러서 내 위치 바꾸기" onPress={openLocation} style={styles.locationBar}><AppIcon name="locate" size={16} color={color.green}/><Text style={styles.locationText}>{a.currentLocation?.name ?? "기본 위치"} 주변</Text><AppIcon name="chevron" size={14}/></Pressable>
              <View style={styles.searchBar}><AppIcon name="search" size={20} color={color.sub}/><TextInput value={query} onChangeText={setQuery} accessibilityLabel="업체명 또는 업종 입력" placeholder="업체명이나 업종을 검색하세요" placeholderTextColor={color.faint} returnKeyType="search" onSubmitEditing={() => searchStores(query.trim())} style={styles.searchInput}/><Pressable accessibilityRole="button" accessibilityLabel="업체 검색" onPress={() => searchStores(query.trim())}><AppIcon name="arrow" size={20} color={color.green}/></Pressable></View>
              <View style={styles.filterRow}>
                <Pressable accessibilityRole="button" onPress={() => { searchStores(""); setCategoriesOpen(false); }}
                  style={[styles.filterChip, !storeQuery && styles.filterOn]}>
                  <Text style={[styles.filterText, !storeQuery && styles.filterTextOn]}>전체 업체</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: categoriesOpen }}
                  onPress={() => setCategoriesOpen((open) => !open)} style={styles.filterChip}>
                  <Text style={styles.filterText}>
                    {categoriesOpen ? "업종 접기 ↑" : `업종 ${categories.length}개 보기 ↓`}
                  </Text>
                </Pressable>
                <Pressable onPress={openLocation} style={styles.filterChip}><Text style={styles.filterText}>내 위치 변경</Text></Pressable>
              </View>
            </View>
            {categoriesOpen && categories.length > 0 && (
              <View style={styles.categoryFilters}>
                {categories.map((category) => (
                  <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === category }}
                    onPress={() => { const next = selectedCategory === category ? "" : category; searchStores(next, next); setCategoriesOpen(false); }}
                    style={[styles.filterChip, selectedCategory === category && styles.filterOn]}>
                    <Text style={[styles.filterText, selectedCategory === category && styles.filterTextOn]}>{category}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.mapStage} onLayout={(event)=>setMapStageHeight(Math.round(event.nativeEvent.layout.height))}>
            <View style={styles.mapWrap}>
              {me ? <KakaoMap center={{ lat: me.lat, lng: me.lng }} pins={pins} focusIds={focusIds} height={mapHeight} coveredBottom={sheetHeight} onVisibleCountChange={setVisiblePinCount} onPinPress={(id) => { setSelectedId(id); setSheetMode("preview"); }} /> : <View style={[styles.mapWait, { height: mapHeight }]} />}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="내 위치 기준으로 다시 보기" onPress={()=>{setSelectedId(null);st.retry();}} style={[styles.locateButton,{bottom:sheetHeight+16}]}><AppIcon name="locate" size={22}/></Pressable>
            <View style={[styles.sheet,{height:sheetHeight}]}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: sheetOpen }} onPress={() => setSheetMode(sheetOpen ? "collapsed" : "list")} style={styles.handle}>
              <View style={styles.grip} />
              <View style={styles.sheetHeading}><View><Text style={styles.sheetTitle}>{visiblePinCount === null ? "지도 업체" : `화면 속 업체 ${visiblePinCount}곳`}</Text><Text style={styles.sheetSub}>가격·배송 조건·확인일을 비교해 보세요</Text></View><Text style={styles.sheetLink}>{sheetOpen ? "↓ 접기" : "↑ 목록 보기"}</Text></View>
            </Pressable>
            {showPreview && <ScrollView style={styles.body} contentContainerStyle={styles.mapContent} keyboardShouldPersistTaps="handled">
              <CompactStoreCard key={selected.store_id} store={selected} onDetail={openDetail}/>
            </ScrollView>}
            {sheetOpen && <ScrollView style={styles.body} contentContainerStyle={styles.mapContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {s.exampleData && <Text style={styles.dataNote}>예시 판매처의 이름·번호·가격은 실제 정보가 아니에요.</Text>}
              {selected && <CompactStoreCard store={selected} onDetail={openDetail}/>}
              {showAiResults && s.results ? <ResultList results={s.results} onCall={onCall} onDetail={openDetail} /> : st.error ? <ErrorRow message={st.error} onRetry={st.retry} /> : visibleStores.length === 0 ? <Text style={styles.sheetSub}>조건에 맞는 근처 업체가 없어요.</Text> : visibleStores.filter(store=>store.store_id!==selectedId).slice(0, storeQuery ? undefined : 30).map(store=><CompactStoreCard key={store.store_id} store={store} onDetail={openDetail}/>)}
            </ScrollView>}
            </View>
          </View>
          </>
        ) : tab === "assistant" ? (
          <>
            {s.exampleData && <Text style={styles.aiDataNote}>예시 데이터 포함 · 실제 거래 전 업체에 확인해 주세요</Text>}
            <ScrollView ref={scroll} style={styles.body} contentContainerStyle={styles.aiContent} keyboardShouldPersistTaps="handled">
              {!started && <Welcome onExample={a.sendText} />}
              <ChatLog messages={s.messages} loading={s.loading} />
              {s.ask && !s.loading && <AskOptions ask={s.ask} disabled={s.loading} onPick={(option) => a.sendChoice(s.ask!.slot, option)} />}
              {s.notice && !s.loading && <NoticeCard notice={s.notice} request={s.request} disabled={s.loading} onRequest={a.requestItem} onSearchLettuce={a.searchLettuce} />}
              {s.networkError && <ErrorRow message="연결이 끊겼어요." onRetry={a.retry} />}
              <View style={styles.conditions} onLayout={(event) => (chipsY.current = event.nativeEvent.layout.y)}>
                {s.chips && <ConditionChips chips={s.chips} disabled={s.loading} onEdit={a.openEditor} onLocation={openLocation} />}
                {s.editor !== "closed" && <ChipEditor key={s.editor} editor={s.editor} condition={s.condition} disabled={s.loading} onSubmit={a.editCondition} onClose={() => a.openEditor("closed")} />}
              </View>
              {s.market && s.results && <MarketLine market={s.market} />}
              {s.results && <><Pressable accessibilityRole="button" onPress={() => { setSelectedId(null); setShowAiResults(true); setSheetMode("list"); setTab("map"); }} style={styles.exampleChip}><Text style={styles.sheetLink}>⌖ 검색 결과 지도에서 보기</Text></Pressable><ResultList results={s.results} onCall={onCall} onDetail={openDetail} /></>}
              {s.priceCheck && !s.loading && <View key={s.priceCheck.check_id} onLayout={(event) => { priceY.current = event.nativeEvent.layout.y; scroll.current?.scrollTo({ y: Math.max(priceY.current - 80, 0), animated: true }); }}><PriceCheckCard check={s.priceCheck} share={s.share} disabled={s.loading} onShare={a.sharePrice} onSearch={a.searchLettuce} onCall={onCall} onDetail={openDetail} /></View>}
            </ScrollView>
            <ChatInput disabled={s.loading} error={s.inputError} onSend={a.sendText} onPhoto={a.sendPhoto} />
          </>
        ) : tab==='community'?<CommunityScreen/>:tab==='saved'?<SavedScreen onDetail={openDetail}/>:<ProfileScreen onSaved={()=>setTab('saved')} onLocation={openLocation} location={a.currentLocation?.name??'기본 위치'}/>}
        <BottomNav active={tab} onChange={setTab} />
        {call && <CallSheet card={call.card} plan={call.plan} onClose={() => setCall(null)} />}
      </View>
    </SafeAreaView>
  );
}

function Welcome({ onExample }: { onExample: (text: string) => void }) {
  const examples = ["근처 상추 파는 곳 찾아줘", "상추 2kg 오늘 배달해 주는 곳", "상추 2kg 1만원이면 비싼가요?"];
  return <View style={styles.welcome}><View style={styles.botMark}><Text style={styles.botMarkText}>✦</Text></View><Text style={styles.welcomeTitle}>무엇을 찾아드릴까요?</Text><Text style={styles.welcomeSub}>등록된 거래 정보만 근거로, 가격과 배송 조건을 함께 비교해 드려요.</Text><View style={styles.examples}>{examples.map((text) => <Pressable key={text} onPress={() => onExample(text)} style={styles.exampleChip}><Text style={styles.exampleText}>{text}</Text></Pressable>)}</View></View>;
}

function Header({ tab, test, stored, started, loading, onRestart }: { tab: ActiveTab; test: boolean; stored: boolean; started: boolean; loading: boolean; onRestart: () => void }) {
  const titles={map:"천하장사",assistant:"AI 도우미",community:"사장님 커뮤니티",saved:"저장",profile:"내 정보"};
  return <View style={styles.header}><View style={styles.brandMark}><AppIcon name={tab==="assistant"?"bot":"store"} size={20} color="#ffffff"/></View><View><Text style={styles.brand}>{titles[tab]}</Text>{tab === "assistant" && <Text style={styles.brandSub}>등록된 거래 정보로 찾아드려요</Text>}</View><View style={styles.spacer} />{stored && <Text style={styles.status}>저장 응답</Text>}{tab === "assistant" && started ? <Pressable accessibilityLabel="새 대화" disabled={loading} onPress={onRestart} style={styles.iconButton}><AppIcon name="edit" size={21}/></Pressable> : <View style={styles.iconButton}><AppIcon name="bell" size={21}/></View>}</View>;
}

function BottomNav({ active, onChange }: { active: ActiveTab; onChange:(tab:ActiveTab)=>void }) {
  const tabs: {key:ActiveTab;icon:IconName;label:string}[] = [{ key: "map", icon: "map", label: "지도" }, { key: "assistant", icon: "bot", label: "AI 도우미" }, { key: "community", icon: "users", label: "커뮤니티" }, { key: "saved", icon: "bookmark", label: "저장" }, { key: "profile", icon: "user", label: "내 정보" }];
  return <View style={styles.nav}>{tabs.map((item) => { const selected = active === item.key; return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={()=>onChange(item.key)} style={styles.navItem}><AppIcon name={item.icon} size={21} color={selected?color.green:color.sub}/><Text style={[styles.navLabel, selected && styles.navOn]}>{item.label}</Text><View style={[styles.navDot, selected && styles.navDotOn]} /></Pressable>; })}</View>;
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={styles.netErr}><Text style={styles.netErrText}>{message}</Text><Pressable onPress={onRetry} style={styles.retry}><Text style={styles.retryLabel}>다시 시도</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  categoryFilters: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  mapStage:{flex:1,position:"relative",overflow:"hidden"},
  mapTools:{paddingHorizontal:18,paddingBottom:14,backgroundColor:color.surface,zIndex:2},
  searchBar:{height:50,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:14,borderWidth:1,borderColor:color.line,borderRadius:16,backgroundColor:"#ffffff",shadowColor:"#14181f",shadowOpacity:0.12,shadowRadius:16,shadowOffset:{width:0,height:5},elevation:4},
  searchInput:{flex:1,fontSize:15,color:color.ink,paddingVertical:12},
  filterRow:{flexDirection:"row",gap:8,marginTop:12},
  filterChip:{height:36,paddingHorizontal:12,justifyContent:"center",borderRadius:20,borderWidth:1,borderColor:color.line,backgroundColor:"#ffffff"},filterOn:{backgroundColor:color.green,borderColor:color.green},filterText:{fontSize:12,color:color.ink,fontWeight:"500"},filterTextOn:{color:"#ffffff"},
  sheet:{position:"absolute",bottom:0,left:0,right:0,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:"#ffffff",shadowColor:"#14181f",shadowOpacity:0.16,shadowRadius:22,shadowOffset:{width:0,height:-5},elevation:10,overflow:"hidden"},
  locateButton:{position:"absolute",right:16,width:46,height:46,borderRadius:23,backgroundColor:"#ffffff",alignItems:"center",justifyContent:"center",shadowColor:"#14181f",shadowOpacity:0.15,shadowRadius:12,elevation:5},
  dataNote:{fontSize:10,color:color.sub,lineHeight:15,paddingTop:4},aiDataNote:{fontSize:10,color:color.sub,paddingHorizontal:18,paddingVertical:6,backgroundColor:color.soft},
  pending:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:12},pendingIcon:{width:82,height:82,borderRadius:28,backgroundColor:color.greenSoft,alignItems:"center",justifyContent:"center",marginBottom:8},pendingTitle:{fontSize:20,fontWeight:"700",color:color.ink},pendingSub:{fontSize:13,color:color.sub},pendingNote:{fontSize:11,color:color.green,paddingHorizontal:12,paddingVertical:5,borderRadius:12,backgroundColor:color.greenSoft},pendingAction:{marginTop:18,padding:16},
  safe: { flex: 1, backgroundColor: color.surface }, screen: { flex: 1, backgroundColor: color.bg },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 18, paddingTop:14,paddingBottom:8, backgroundColor: color.surface },
  brandMark: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color.green, shadowColor: color.green, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  brandIcon: { color: "#ffffff", fontSize: 18, fontWeight: "800" }, brand: { fontSize:20, fontWeight: "600", letterSpacing: -0.6, color: color.ink }, brandSub: { marginTop: 1, color: color.sub, fontSize: 10 }, spacer: { flex: 1 },
  status: { paddingHorizontal: 7, paddingVertical: 3, overflow: "hidden", borderRadius: 8, backgroundColor: color.soft, color: color.sub, fontSize: 10, fontWeight: "700" }, iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: color.soft }, iconButtonText: { color: color.ink, fontSize: 23 },
  locationBar: { flexDirection: "row", alignItems: "center",alignSelf:"flex-start", gap: 5, paddingTop:5,paddingBottom:13, backgroundColor: 'transparent' }, locationPin: { color: color.green, fontSize: 11 }, locationText: { color: color.ink, fontSize: 13, fontWeight: "500" }, chevron: { color: color.sub, fontSize: 15 },
  mapWrap: { position: "relative", overflow: "hidden", backgroundColor: "#e9efe7" }, mapWait: { width: "100%", backgroundColor: "#e9efe7" }, mapBadge: { position: "absolute", top: 14, alignSelf: "center", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: color.surface, shadowColor: "#14181f", shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 }, mapBadgeText: { color: color.green, fontSize: 12, fontWeight: "700" },
  handle: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 8,backgroundColor:color.surface }, grip: { width: 38, height: 4, alignSelf: "center", marginBottom: 12, borderRadius: 2, backgroundColor: color.line }, sheetHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, sheetTitle: { fontSize: 16, fontWeight: "600", color: color.ink }, sheetSub: { marginTop: 3, fontSize: 11, color: color.sub }, sheetLink: { color: color.green, fontSize: 12, fontWeight: "500" },
  body: { flex: 1 }, mapContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 12 }, aiContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 14 }, selected: { gap: 8 }, selectedHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, selectedTitle: { color: color.sub, fontSize: font.small, fontWeight: "700" }, close: { color: color.green, fontSize: font.small, fontWeight: "700" },
  welcome: { alignItems: "center", paddingVertical: 28, gap: 9 }, botMark: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: color.greenSoft }, botMarkText: { color: color.green, fontSize: 22, fontWeight: "800" }, welcomeTitle: { marginTop: 5, color: color.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }, welcomeSub: { maxWidth: 310, color: color.sub, fontSize: 13, lineHeight: 19, textAlign: "center" }, examples: { width: "100%", marginTop: 10, gap: 8 }, exampleChip: { minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderRadius: 14, backgroundColor: color.soft }, exampleText: { color: color.ink, fontSize: 13 }, conditions: { gap: 10 },
  nav: { height: 72, flexDirection: "row", paddingHorizontal: 4, paddingTop: 6, paddingBottom: 8, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }, navIcon: { color: color.sub, fontSize: 20, lineHeight: 23 }, navLabel: { color: color.sub, fontSize: 10, fontWeight: "600" }, navOn: { color: color.green }, navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" }, navDotOn: { backgroundColor: color.green },
  netErr: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius, backgroundColor: color.redSoft }, netErrText: { flex: 1, fontSize: font.body, color: color.red }, retry: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: color.red }, retryLabel: { color: "#ffffff", fontWeight: "700", fontSize: font.small },
});
