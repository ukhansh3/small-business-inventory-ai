import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "./AppIcon";
import { color } from "./theme";

export function LoginPrompt({ feature, onLogin }: { feature: "messages" | "saved"; onLogin: () => void }) {
  const messages = feature === "messages";

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <AppIcon name={messages ? "edit" : "bookmark"} size={28} color={color.green} />
        </View>
        <Text style={styles.title}>{messages ? "로그인하고 대화를 시작해요" : "로그인하고 업체를 저장해요"}</Text>
        <Text style={styles.body}>{messages
          ? "업체에 보낸 문의와 받은 답장을 한곳에서 볼 수 있어요."
          : "마음에 드는 업체와 글을 모아두고 다시 찾아보세요."}</Text>
        <Pressable accessibilityRole="button" onPress={onLogin} style={styles.button}>
          <Text style={styles.buttonText}>로그인하러 가기</Text>
          <AppIcon name="arrow" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: color.soft },
  card: { width: "100%", maxWidth: 380, alignItems: "center", gap: 12, padding: 24, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: color.line },
  icon: { width: 60, height: 60, borderRadius: 20, backgroundColor: color.greenSoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontWeight: "800", color: color.ink, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, color: color.sub, textAlign: "center" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "stretch", minHeight: 46, marginTop: 6, padding: 12, borderRadius: 12, backgroundColor: color.green },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
