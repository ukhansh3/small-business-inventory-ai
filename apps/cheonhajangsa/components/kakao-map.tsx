'use client';
import {useEffect,useRef,useState,ReactNode} from 'react';
import {Card,SearchInput,amountLabel} from '@/features/search/model';
import {Icon} from './icons';
import {loadKakaoMaps,isCoordinatePair,MapInstance,KakaoMaps} from '@/lib/kakao/sdk';
type MapState={kind:'missing_key'}|{kind:'loading'}|{kind:'ready'}|{kind:'error';message:string};
const key=process.env.NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY?.trim()??'';
export function KakaoMap({cards,selected,onSelect,center,fallback}:{cards:Card[];selected:string|undefined;onSelect:(card:Card)=>void;center:SearchInput['center'];fallback:ReactNode}){
 const container=useRef<HTMLDivElement>(null);const mapRef=useRef<MapInstance|null>(null);const sdkRef=useRef<KakaoMaps|null>(null);const selectionRef=useRef(onSelect);const initialCenter=useRef(center);
 const [status,setStatus]=useState<MapState>({kind:key?'loading':'missing_key'});const [retry,setRetry]=useState(0);
 useEffect(()=>{selectionRef.current=onSelect;},[onSelect]);
 useEffect(()=>{
  if(!key||!container.current)return;
  let cancelled=false;let observer:ResizeObserver|undefined;
  loadKakaoMaps(key).then(sdk=>{if(cancelled||!container.current)return;sdkRef.current=sdk;const point=initialCenter.current;mapRef.current=new sdk.Map(container.current,{center:new sdk.LatLng(point.latitude,point.longitude),level:6});observer=new ResizeObserver(()=>{mapRef.current?.relayout();});observer.observe(container.current);setStatus({kind:'ready'});}).catch(error=>{if(!cancelled)setStatus({kind:'error',message:error instanceof Error?error.message:'지도 SDK 초기화 중 오류가 발생했습니다.'});});
  return ()=>{cancelled=true;observer?.disconnect();mapRef.current=null;sdkRef.current=null;};
 },[retry]);
 useEffect(()=>{
  const sdk=sdkRef.current,map=mapRef.current;if(status.kind!=='ready'||!sdk||!map)return;
  const cleanups:(()=>void)[]=[];const overlays:InstanceType<KakaoMaps['CustomOverlay']>[]=[];const markerList:InstanceType<KakaoMaps['Marker']>[]=[];
  const origin=new sdk.LatLng(center.latitude,center.longitude);const bounds=new sdk.LatLngBounds();bounds.extend(origin);
  const originTag=document.createElement('span');originTag.className='kakao-origin';originTag.textContent='검색 기준점';const originOverlay=new sdk.CustomOverlay({position:origin,content:originTag,yAnchor:0,zIndex:1,map});overlays.push(originOverlay);
  for(const card of cards){const latitude=card.latitude,longitude=card.longitude;if(latitude===null||longitude===null||!isCoordinatePair(latitude,longitude))continue;const pos=new sdk.LatLng(latitude,longitude);bounds.extend(pos);const active=card.vendor_id===selected;const marker=new sdk.Marker({position:pos,map,title:`${card.name} · 가상 업체`,clickable:true});marker.setZIndex(active?8:2);markerList.push(marker);const select=()=>selectionRef.current(card);sdk.event.addListener(marker,'click',select);cleanups.push(()=>sdk.event.removeListener(marker,'click',select));const label=document.createElement('button');label.type='button';label.className=`kakao-price-label${active?' active':''}`;label.dataset.markerId=card.vendor_id;label.setAttribute('aria-label',`${card.name} 위치 선택`);label.textContent=`${card.offer.item_name} · ${amountLabel(card.offer.amount)}`;label.addEventListener('click',select);cleanups.push(()=>label.removeEventListener('click',select));overlays.push(new sdk.CustomOverlay({position:pos,content:label,yAnchor:2.1,zIndex:active?10:3,clickable:true,map}));}
  map.relayout();if(markerList.length>0)map.setBounds(bounds,55,45,45,45);else map.setCenter(origin);
  return ()=>{cleanups.forEach(f=>f());overlays.forEach(o=>o.setMap(null));markerList.forEach(m=>m.setMap(null));};
 },[cards,selected,center,status.kind]);
 return <><div className="map-top"><span><Icon name="map" size={16}/>{status.kind==='ready'?'카카오 지도':'위치 관계 미리보기'}</span><span className="map-offline">{status.kind==='ready'?'가상 업체 표시':status.kind==='loading'?'지도 연결 중':status.kind==='missing_key'?'JavaScript 키 필요':'지도 연결 오류'}</span></div><div ref={container} className={`kakao-canvas ${status.kind==='ready'?'is-ready':''}`} aria-label="카카오 업체 지도"/>{status.kind!=='ready'&&fallback}<div className={`map-caption ${status.kind==='error'?'map-error':''}`} role="status"><Icon name="info" size={14}/><span>{status.kind==='ready'?'실제 지도에 테스트용 가상 업체 좌표를 표시합니다.':status.kind==='loading'?'카카오 지도를 불러오고 있습니다. 업체 목록은 계속 사용할 수 있습니다.':status.kind==='missing_key'?'키 설정 대기 · 아래는 실제 지도가 아닌 가상 좌표 미리보기입니다.':status.message}</span>{status.kind==='error'&&<button onClick={()=>{setStatus({kind:'loading'});setRetry(n=>n+1);}}>재시도</button>}</div></>;
}
