import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { color, font, radius } from "./theme";

export function ChatInput({ disabled, error, onSend, onPhoto }: { disabled: boolean; error: string | null; onSend: (text: string) => void; onPhoto: () => void }) {
  const [text, setText] = useState("");
  const send = () => {
    if (disabled) return;
    onSend(text);
    if (text.trim().length >= 1 && text.trim().length <= 200) setText("");
  };
  return (
    <View style={styles.wrap}>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="영수증·결제내역 사진으로 단가 진단" disabled={disabled} onPress={onPhoto} style={[styles.photo, disabled && styles.off]}>
          <Text style={styles.photoLabel}>📷</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder="상추 / 상추 2kg 1만원 / 📷 영수증"
          placeholderTextColor={color.faint}
          maxLength={200}
          editable={!disabled}
          returnKeyType="send"
          accessibilityLabel="필요한 재료 입력"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" disabled={disabled} onPress={send} style={[styles.send, disabled && styles.off]}>
          <Text style={styles.sendLabel}>보내기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, padding: 12, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface },
  row: { flexDirection: "row", gap: 8 },
  input: { flex: 1, fontSize: font.body, borderWidth: 1, borderColor: color.line, borderRadius: radius, paddingHorizontal: 14, paddingVertical: 12, color: color.ink, backgroundColor: color.bg },
  photo: { width: 48, borderRadius: radius, borderWidth: 1.5, borderColor: color.green, alignItems: "center", justifyContent: "center", backgroundColor: color.surface },
  photoLabel: { fontSize: 22 },
  send: { backgroundColor: color.green, borderRadius: radius, paddingHorizontal: 18, justifyContent: "center" },
  off: { opacity: 0.4 },
  sendLabel: { color: "#ffffff", fontSize: font.body, fontWeight: "700" },
  error: { fontSize: font.small, color: color.red },
});
