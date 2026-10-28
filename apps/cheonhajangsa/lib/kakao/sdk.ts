// Minimal types for the official Kakao Maps JavaScript SDK used by this app.
export interface LatLng { getLat():number; getLng():number; }
export interface MapInstance {setCenter(position:LatLng):void;setBounds(bounds:Bounds,top?:number,right?:number,bottom?:number,left?:number):void;relayout():void;}
export interface Bounds {extend(position:LatLng):void;}
export interface Marker {setMap(map:MapInstance|null):void;setZIndex(zIndex:number):void;}
export interface Overlay {setMap(map:MapInstance|null):void;setZIndex(zIndex:number):void;}
export interface KakaoMaps {
 load(callback:()=>void):void;
 LatLng:new(latitude:number,longitude:number)=>LatLng;
 LatLngBounds:new()=>Bounds;
 Map:new(container:HTMLElement,options:{center:LatLng;level:number})=>MapInstance;
 Marker:new(options:{position:LatLng;map?:MapInstance;title?:string;clickable?:boolean})=>Marker;
 CustomOverlay:new(options:{position:LatLng;content:HTMLElement;yAnchor?:number;zIndex?:number;clickable?:boolean;map?:MapInstance})=>Overlay;
 event:{addListener(target:Marker,type:'click',listener:()=>void):void;removeListener(target:Marker,type:'click',listener:()=>void):void;};
}
declare global {interface Window {kakao?:{maps:KakaoMaps};}}
let loader:Promise<KakaoMaps>|null=null;
export function loadKakaoMaps(key:string):Promise<KakaoMaps>{
 if(typeof window==='undefined')return Promise.reject(new Error('지도 SDK는 브라우저에서만 사용할 수 있습니다.'));
 if(!key.trim())return Promise.reject(new Error('카카오 JavaScript 키를 설정해 주세요.'));
 if(window.kakao?.maps?.Map)return Promise.resolve(window.kakao.maps);
 if(loader)return loader;
 const promise=new Promise<KakaoMaps>((resolve,reject)=>{
  let script=document.querySelector<HTMLScriptElement>('script[data-cheon-kakao-sdk]');
  let settled=false;
  const done=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timeout);script?.removeEventListener('load',loaded);script?.removeEventListener('error',failed);if(error){script?.remove();reject(error);}else if(window.kakao?.maps?.Map){resolve(window.kakao.maps);}else{reject(new Error('지도 SDK 초기화에 실패했습니다.'));}};
  const loaded=()=>{if(!window.kakao?.maps){done(new Error('카카오 SDK를 사용할 수 없습니다. 앱 키와 허용 도메인을 확인해 주세요.'));return;}window.kakao.maps.load(()=>done());};
  const failed=()=>done(new Error('카카오 지도를 불러오지 못했습니다. 네트워크, 지도 API 활성화, JavaScript 키와 허용 도메인을 확인해 주세요.'));
  const timeout=window.setTimeout(()=>done(new Error('지도 로딩 시간이 초과됐습니다. 키와 허용 도메인을 확인해 주세요.')),15000);
  if(window.kakao?.maps){loaded();return;}
  if(!script){script=document.createElement('script');script.dataset.cheonKakaoSdk='true';script.async=true;script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;script.addEventListener('load',loaded);script.addEventListener('error',failed);document.head.append(script);}else{script.addEventListener('load',loaded);script.addEventListener('error',failed);}
 });
 loader=promise.catch(error=>{loader=null;throw error;});
 return loader;
}
export function isCoordinatePair(latitude:number|null,longitude:number|null):boolean{return typeof latitude==='number'&&Number.isFinite(latitude)&&Math.abs(latitude)<=90&&typeof longitude==='number'&&Number.isFinite(longitude)&&Math.abs(longitude)<=180;}
