import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { VendorCard } from "../../core/search-types";
import type { Store } from "../lib/api-types";
import { AppIcon } from "./AppIcon";
import { color } from "./theme";
import { SaveVendorButton } from './SaveVendorButton';

export function CompactStoreCard({store,onDetail}:{store:Store;onDetail:(card:VendorCard)=>void}) {
  const card=store.vendor_card;
  const open=()=>card ? onDetail(card) : void Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent(store.name)},${store.lat},${store.lng}`);
  return <View><Pressable accessibilityRole="button" accessibilityLabel={`${store.name} 상세 보기`} onPress={open} style={styles.row}>
    <View style={[styles.picture,!card && styles.publicPicture]}><AppIcon name="store" size={30} color={card ? "#b88858" : "#8b9b90"}/></View>
    <View style={styles.copy}>
      <View style={styles.heading}><Text numberOfLines={1} style={styles.name}>{store.name}</Text>{card?.is_example && <Text style={styles.badge}>예시</Text>}</View>
      <Text style={styles.meta}>{store.category} · {store.distance_m < 1000 ? `${Math.round(store.distance_m)}m` : `${(store.distance_m/1000).toFixed(1)}km`}</Text>
      {card ? <><Text numberOfLines={2} style={styles.price}>{card.price.display}</Text><Text numberOfLines={1} style={styles.meta}>{card.delivery.display ?? card.min_sale.display}</Text></> : <><Text numberOfLines={1} style={styles.address}>{store.address}</Text><Text style={styles.meta}>공공데이터 · 가격·재고 미확인</Text></>}
    </View>
    <AppIcon name="chevron" size={16} color={color.faint}/>
  </Pressable><SaveVendorButton id={store.store_id}/></View>;
}
const styles=StyleSheet.create({
  row:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:color.line},
  picture:{width:72,height:78,borderRadius:15,backgroundColor:"#f2e6d5",alignItems:"center",justifyContent:"center"},
  publicPicture:{backgroundColor:"#edf2ec"},copy:{flex:1,gap:4},heading:{flexDirection:"row",alignItems:"center",gap:6},name:{fontSize:15,fontWeight:"700",color:color.ink,flexShrink:1},badge:{fontSize:10,color:"#8a5a00",backgroundColor:"#fff3d6",paddingHorizontal:5,paddingVertical:2,borderRadius:5},meta:{fontSize:11,color:color.sub,lineHeight:16},price:{fontSize:14,fontWeight:"700",color:color.green,lineHeight:20},address:{fontSize:12,color:color.ink,lineHeight:17},
});
