import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../lib/assist-state";
import { color } from "./theme";
import { AppIcon } from "./AppIcon";

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
    <View style={[styles.messageRow, owner && styles.ownerRow]}>
    {!owner && <View style={styles.avatar}><AppIcon name="bot" size={18} color={color.green}/></View>}
    <View style={[styles.bubble, owner ? styles.owner : styles.ai]}>
      <Text style={[styles.text, owner && styles.ownerText, muted && styles.muted]}>{text}</Text>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  log: { gap: 8 },
  messageRow:{flexDirection:"row",alignItems:"flex-start",gap:9},ownerRow:{justifyContent:"flex-end"},avatar:{width:30,height:30,borderRadius:10,backgroundColor:color.greenSoft,alignItems:"center",justifyContent:"center"},
  bubble: { maxWidth: "85%", paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18 },
  owner: { alignSelf: "flex-end", backgroundColor: color.ownerBubble, borderBottomRightRadius: 5 },
  ai: { alignSelf: "flex-start", backgroundColor: color.soft, borderBottomLeftRadius: 5 },
  text: { fontSize: 14, color: color.ink, lineHeight: 22 },
  ownerText: { color: "#ffffff" },
  muted: { color: color.faint },
});
