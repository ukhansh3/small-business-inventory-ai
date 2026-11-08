import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { color, font } from "./theme";
import { AppIcon } from "./AppIcon";

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
          <AppIcon name="camera" size={19} color={color.sub}/>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder="필요한 품목을 물어보세요"
          placeholderTextColor={color.faint}
          maxLength={200}
          editable={!disabled}
          returnKeyType="send"
          accessibilityLabel="필요한 재료 입력"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="질문 보내기" disabled={disabled} onPress={send} style={[styles.send, disabled && styles.off]}>
          <AppIcon name="arrow" size={21} color="#ffffff"/>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: color.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 54, padding: 6, borderWidth: 1, borderColor: color.line, borderRadius: 27, backgroundColor: color.surface, shadowColor: "#14181f", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  input: { flex: 1, fontSize: font.body, paddingHorizontal: 6, paddingVertical: 10, color: color.ink },
  photo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: color.soft },
  photoLabel: { fontSize: 18 },
  send: { width: 40, height: 40, backgroundColor: color.green, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  off: { opacity: 0.4 },
  sendLabel: { color: "#ffffff", fontSize: 22, fontWeight: "800", marginTop: -2 },
  error: { fontSize: font.small, color: color.red },
});
