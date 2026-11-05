import { StyleSheet, Text, View } from "react-native";
import { color, font } from "./theme";

// R-12: 예시 데이터가 하나라도 있으면 항상 보인다
export function ExampleBanner() {
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text style={styles.text}>예시 데이터예요. 판매처 이름·번호·가격은 실제가 아니에요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.amberSoft, paddingVertical: 8, paddingHorizontal: 16 },
  text: { color: color.amber, fontSize: font.small, fontWeight: "600" },
});
