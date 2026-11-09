import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { VendorCard } from "../../core/search-types";
import type { Store } from "../lib/api-types";
import { AppIcon } from "./AppIcon";
import { VendorArtwork } from "./VendorArtwork";
import { color } from "./theme";
import { SaveVendorButton } from './SaveVendorButton';

export function CompactStoreCard({store,onDetail}:{store:Store;onDetail:(card:VendorCard)=>void}) {
  const card=store.vendor_card;
  const open=()=>card ? onDetail(card) : void Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent(store.name)},${store.lat},${store.lng}`);
  return <View><Pressable accessibilityRole={store.demo_service ? undefined : "button"} accessibilityLabel={store.demo_service ? store.name : `${store.name} 상세 보기`} onPress={store.demo_service ? undefined : open} style={styles.row}>
    <VendorArtwork card={card} store={store}/>
    <View style={styles.copy}>
      <View style={styles.heading}><Text numberOfLines={1} style={styles.name}>{store.name}</Text>{(card?.is_example || store.demo_service) && <Text style={styles.badge}>예시</Text>}</View>
      <Text style={styles.meta}>{store.category} · {store.distance_m < 1000 ? `${Math.round(store.distance_m)}m` : `${(store.distance_m/1000).toFixed(1)}km`}</Text>
      {store.demo_service ? <Text style={styles.address}>{store.demo_service}</Text> : card ? <><Text numberOfLines={2} style={styles.price}>{card.price.display}</Text><Text numberOfLines={1} style={styles.meta}>{card.delivery.display ?? card.min_sale.display}</Text></> : <><Text numberOfLines={1} style={styles.address}>{store.address}</Text><Text style={styles.meta}>공공데이터 · 가격·재고 미확인</Text></>}
    </View>
    {!store.demo_service && <AppIcon name="chevron" size={16} color={color.faint}/>}
  </Pressable><SaveVendorButton id={store.store_id}/></View>;
}
const styles=StyleSheet.create({
  row:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:color.line},
  copy:{flex:1,gap:4},heading:{flexDirection:"row",alignItems:"center",gap:6},name:{fontSize:15,fontWeight:"700",color:color.ink,flexShrink:1},badge:{fontSize:10,color:"#8a5a00",backgroundColor:"#fff3d6",paddingHorizontal:5,paddingVertical:2,borderRadius:5},meta:{fontSize:11,color:color.sub,lineHeight:16},price:{fontSize:14,fontWeight:"700",color:color.green,lineHeight:20},address:{fontSize:12,color:color.ink,lineHeight:17},
});
