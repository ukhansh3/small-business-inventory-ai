import {useState} from 'react';
import {Pressable,Text,View,StyleSheet} from 'react-native';
import {useMember} from '../lib/members';
import {AppIcon} from './AppIcon';
import {color} from './theme';
export function SaveVendorButton({id}:{id:string}){
 const member=useMember(),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function save(){
  if(!member.profile){setNotice('내 정보 탭에서 로그인한 뒤 저장해 주세요.');return;}
  setBusy(true);setNotice('');
  try{await member.api(`/me/saved-vendors/${encodeURIComponent(id)}`,'PUT');setNotice('저장 목록에 추가했어요.');}
  catch(e){setNotice(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
 }
 return <View><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void save()} style={styles.button}><AppIcon name="bookmark" size={16} color={color.green}/><Text style={styles.label}>{busy?'저장 중…':'이 업체 저장'}</Text></Pressable>{!!notice&&<Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}</View>;
}
const styles=StyleSheet.create({button:{minHeight:38,borderRadius:12,paddingHorizontal:12,flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center',backgroundColor:color.greenSoft},label:{color:color.green,fontSize:12,fontWeight:'600'},notice:{padding:8,fontSize:11,color:color.sub,lineHeight:17}});
