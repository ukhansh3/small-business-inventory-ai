import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../lib/assist-state";
import { color, font, radius } from "./theme";

export function ChatLog({ messages, loading }: { messages: ChatMessage[]; loading: boolean }) {
  return (
    <View style={styles.log}>
      {messages.map((m) => (
        <Bubble key={m.id} role={m.role} text={m.text} />
      ))}
      {loading && <Bubble role="ai" text="찾고 있어요…" muted />}
    </View>
  );
}

function Bubble({ role, text, muted }: { role: ChatMessage["role"]; text: string; muted?: boolean }) {
  const owner = role === "owner";
  return (
    <View style={[styles.bubble, owner ? styles.owner : styles.ai]}>
      <Text style={[styles.text, owner && styles.ownerText, muted && styles.muted]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  log: { gap: 8 },
  bubble: { maxWidth: "85%", paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius },
  owner: { alignSelf: "flex-end", backgroundColor: color.ownerBubble, borderBottomRightRadius: 4 },
  ai: { alignSelf: "flex-start", backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderBottomLeftRadius: 4 },
  text: { fontSize: font.body, color: color.ink, lineHeight: 22 },
  ownerText: { color: "#ffffff" },
  muted: { color: color.faint },
});
