import {useState,type PropsWithChildren,type CSSProperties} from 'react';
import {useWindowDimensions} from 'react-native';

const WIDTH=406,HEIGHT=860;
const control:CSSProperties={height:34,padding:'0 12px',border:'1px solid #e3e6e9',borderRadius:10,background:'#ffffff',color:'#333940',fontSize:12,cursor:'pointer'};

export function PhonePreview({children}:PropsWithChildren){
 const {width,height}=useWindowDimensions();
 const [zoom,setZoom]=useState<number|null>(null);
 const fit=Math.max(0.35,Math.min(1,(height-108)/HEIGHT,(width-40)/WIDTH));
 const scale=zoom??fit;
 const forceFrame=new URLSearchParams(globalThis.location?.search??'').get('preview')==='phone';
 if(width<=480&&!forceFrame)return <div style={{display:'flex',flexDirection:'column',height:'100dvh',width:'100%',background:'#ffffff'}}>{children}</div>;
 return <div style={{height:'100dvh',overflow:'auto',background:'#f5f6f8',fontFamily:'system-ui,sans-serif'}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'16px 12px 10px'}} aria-label="휴대폰 미리보기 크기">
     <button style={control} onClick={()=>setZoom(Math.max(0.35,scale-0.1))} aria-label="미리보기 축소">−</button>
     <span style={{fontSize:12,color:'#6f7680',width:42,textAlign:'center'}}>{Math.round(scale*100)}%</span>
     <button style={control} onClick={()=>setZoom(Math.min(1.3,scale+0.1))} aria-label="미리보기 확대">＋</button>
     <button style={control} onClick={()=>setZoom(null)}>화면 맞춤</button>
     <span style={{fontSize:11,color:'#969da6'}}>390 × 844</span>
   </div>
   <div style={{width:WIDTH*scale,height:HEIGHT*scale,margin:'0 auto 20px',position:'relative'}}>
     <div aria-label="천하장사 휴대폰 미리보기" style={{position:'absolute',top:0,left:0,width:WIDTH,height:HEIGHT,boxSizing:'border-box',transform:`scale(${scale})`,transformOrigin:'top left',padding:8,borderRadius:49,background:'#17191c',boxShadow:'0 25px 60px #17191c24, inset 0 0 0 2px #484b50'}}>
       <div style={{width:390,height:844,borderRadius:41,background:'#ffffff',overflow:'hidden',display:'flex',flexDirection:'column',position:'relative'}}>
         <div aria-hidden="true" style={{height:44,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 23px',fontSize:12,fontWeight:600,color:'#17191c',boxSizing:'border-box'}}><span>9:41</span><span style={{position:'absolute',width:100,height:27,top:8,left:145,borderRadius:20,background:'#090a0b'}}/><span style={{display:'flex',alignItems:'center',gap:6}}><svg width="16" height="13" viewBox="0 0 16 13"><path d="M1 12V9M5 12V6M9 12V3M13 12V0" stroke="currentColor" strokeWidth="2.5"/></svg><svg width="16" height="13" viewBox="0 0 18 15"><path d="M1 5Q9-2 17 5M4 8Q9 3 14 8M7 11Q9 9 11 11" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="14" r="1"/></svg><span style={{width:19,height:9,border:'1px solid #6f7680',borderRadius:3,padding:1,display:'inline-block'}}><span style={{display:'block',height:'100%',width:'85%',background:'#17191c',borderRadius:1}}/></span></span></div>
         <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,overflow:'hidden'}}>{children}</div>
         <div aria-hidden="true" style={{height:16,flexShrink:0,display:'flex',justifyContent:'center',alignItems:'center'}}><div style={{height:4,width:120,borderRadius:4,background:'#17191c'}}/></div>
       </div>
     </div>
   </div>
 </div>;
}
