import { Pressable, StyleSheet, Text, View } from "react-native";
import { color } from "./theme";

// 로그인이 필요한 탭(대화·저장) 안내. 왼쪽 정렬, 문장마다 한 줄(가운데 정렬·아이콘 칸은 쓰지 않는다)
export function LoginPrompt({ feature, onLogin }: { feature: "messages" | "saved"; onLogin: () => void }) {
  const messages = feature === "messages";
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{messages ? "로그인하고 대화를 시작해요" : "로그인하고 업체를 저장해요"}</Text>
      <Text style={styles.body}>{messages ? "업체에 보낸 문의와 받은 답장을\n한곳에서 볼 수 있어요." : "자주 가는 업체를 모아 두고\n바로 찾을 수 있어요."}</Text>
      <Pressable accessibilityRole="button" onPress={onLogin} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>로그인하러 가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 10, paddingHorizontal: 20, paddingTop: 32, backgroundColor: color.bg },
  title: { fontSize: 22, fontWeight: "900", color: color.ink, letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 24, color: color.sub },
  button: { minHeight: 52, marginTop: 10, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: color.green },
  pressed: { opacity: 0.8 },
  buttonText: { color: "#ffffff", fontWeight: "800", fontSize: 17 },
});
