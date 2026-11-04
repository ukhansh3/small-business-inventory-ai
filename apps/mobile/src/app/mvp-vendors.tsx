import { useEffect, useMemo, useState } from "react";
import { Text, View, Linking } from "react-native";
import { router } from "expo-router";
import { mvpVendorSearchSchema } from "@cheon/vendor-contracts";
import { useAuth } from "../auth/provider";
import { useApiResource } from "../lib/api";
import { backendConfigured } from "../lib/supabase";
import { Action, Card, Field, Heading, Note, Screen, s } from "../components/ui";
import { KakaoMap } from "../components/KakaoMap";
import { demoCenter, won, type Vendor } from "../domain/vendors";
export default function MvpVendors() {
  const { session } = useAuth();
  const [query,setQuery] = useState("");
  const [debounced,setDebounced] = useState("");
  const [offset,setOffset] = useState(0);
  const [selected,setSelected] = useState<string | null>(null);
  const [linkError,setLinkError] = useState("");
  useEffect(() => { const t=setTimeout(()=>setDebounced(query),300); return ()=>clearTimeout(t); },[query]);
  const resource=useApiResource(backendConfigured && session ? "/mvp-vendors?"+new URLSearchParams({query:debounced,offset:String(offset)}).toString() : null,mvpVendorSearchSchema);
  const rows=resource.data?.vendors ?? [];
  const pins=useMemo<Vendor[]>(()=> (resource.data?.vendors ?? []).flatMap(v=> v.latitude===null || v.longitude===null ? [] : [{id:v.id,name:"[MVP 시연] "+v.name,category:v.category,district:v.address,latitude:v.latitude,longitude:v.longitude,delivery:"시연용 가상 조건",checkedAt:v.source_date,items:[],dataKind:"fixture"}]),[resource.data]);
  const center=pins.length ? {latitude:pins[0].latitude,longitude:pins[0].longitude}:demoCenter;
  const visible=selected ? rows.filter(v=>v.id===selected):rows;
  return <Screen>
    <Heading>공공 업체 MVP 시연</Heading>
    <Note>실제 업체명·주소·업종은 공공데이터 원문입니다. 가격·작업·거래 조건은 MVP 시연을 위해 임의로 만들었습니다. 업체 직접 등록·확인·승인 자료가 아닙니다.</Note>
    <Note>현재 수록 지역: 경기도 광주시. 아주대 주변 업체가 아닙니다. 원문 업종과 자료 기준일을 확인해 주세요.</Note>
    {!backendConfigured ? <Note>실제 서버 연결 설정이 필요합니다.</Note> : !session ? <Action label="로그인" onPress={()=>router.push("/login")} /> : <>
      <Field label="공공 업체명·원문 업종 검색" value={query} maxLength={100} onChangeText={v=>{setQuery(v);setOffset(0);setSelected(null);}} />
      {pins.length>0 && <KakaoMap vendors={pins} center={center} onSelect={setSelected} />}
      <Action secondary label="새로고침" onPress={()=>{setSelected(null);resource.refresh();}} />
      {selected && <Action secondary label="현재 페이지 전체 업체 보기" onPress={()=>setSelected(null)} />}
      {resource.loading && <Note>공공 업체 시연 자료를 DB에서 불러오는 중…</Note>}
      {resource.error && <Note>{resource.error}</Note>}
      {!resource.loading && !resource.error && rows.length===0 && <Note>일치하는 시연 업체가 없습니다.</Note>}
      <Text style={s.muted}>현재 페이지 {rows.length}곳 · 모든 금액은 가상 시연 가격</Text>
      {visible.map(v=><Card key={v.id}>
        <Text style={s.title}>{v.name}</Text>
        <Text style={s.body}>공공데이터 업종: {v.category}</Text>
        <Text style={s.muted}>{v.address}</Text>
        <Note>{v.demo_notice}</Note>
        <Text style={s.body}>{v.demo_service}</Text>
        <Text style={s.price}>가상 시연 가격 {won(v.demo_price)} / {v.demo_unit}</Text>
        <Text style={s.body}>{v.demo_terms}</Text>
        <Text style={s.muted}>출처: {v.source_dataset}{"\n"}원문 기준일: {v.source_date}{"\n"}이용조건: {v.source_license}{"\n"}업체 직접 확인: 안 됨</Text>
        {v.latitude===null && <Text style={s.muted}>좌표 미확인 · 지도에는 표시하지 않습니다.</Text>}
        <Action secondary label="공공데이터 원문 보기" onPress={()=>{void Linking.openURL(v.source_url).catch(()=>setLinkError("출처 링크를 열지 못했습니다."));}} />
      </Card>)}
      {!!linkError && <Note>{linkError}</Note>}
      <View style={s.row}>
        <Action secondary label="이전" disabled={offset===0||resource.loading} onPress={()=>{setOffset(n=>Math.max(0,n-20));setSelected(null);}} />
        <Action secondary label="다음" disabled={rows.length<20||resource.loading} onPress={()=>{setOffset(n=>n+20);setSelected(null);}} />
      </View>
    </>}
  </Screen>;
}
