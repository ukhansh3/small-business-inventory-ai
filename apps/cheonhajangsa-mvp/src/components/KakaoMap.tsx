import { StyleSheet, Text, View } from "react-native";
import type { MapProps } from "./map-types";
import { color, font } from "./theme";

// 네이티브 앱용 자리(이번 MVP는 웹만 지도, mvp-scope 5절). 웹은 KakaoMap.web.tsx
export function KakaoMap({ height }: MapProps) {
  return (
    <View style={[styles.box, { height }]}>
      <Text style={styles.text}>지도는 웹에서 보여요. 아래 목록을 이용해 주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", backgroundColor: color.greenSoft },
  text: { fontSize: font.small, color: color.sub },
});
