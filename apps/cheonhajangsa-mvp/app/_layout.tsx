import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

// 공통 틀: 휴대폰 폭(최대 430px) 가운데 정렬
export default function RootLayout() {
  return (
    <View style={styles.page}>
      <View style={styles.phone}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f2f2f2", alignItems: "center" },
  phone: { flex: 1, width: "100%", maxWidth: 430, backgroundColor: "#ffffff" },
});
