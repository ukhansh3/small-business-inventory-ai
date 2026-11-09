import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from "react-native";
import { useMember } from "../lib/members";
import { color } from "./theme";

type Thread = { id: string; vendor_name: string; incoming: boolean };
type Message = { id: string; mine: boolean; body: string };

export function VendorConversations({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const { api, profile } = useMember();
  const apiRef = useRef(api);
  const [threads, setThreads] = useState<Thread[]>();
  const [chat, setChat] = useState<{ vendor_name: string; messages: Message[] }>();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const path = threadId ? "/me/conversations/" + encodeURIComponent(threadId) + "/messages" : "/me/conversations";

  useFocusEffect(useCallback(() => {
    apiRef.current = api;
  }, [api]));

  useFocusEffect(useCallback(() => {
    if (!profile) return;
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        if (threadId) {
          const result = await apiRef.current<{ vendor_name: string; messages: Message[] }>(path);
          if (active) setChat(result);
        } else {
          const result = await apiRef.current<{ threads: Thread[] }>(path);
          if (active) setThreads(result.threads);
        }
      } catch {
        if (active) setNotice("대화를 불러오지 못했어요.");
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => { active = false; clearInterval(timer); };
  }, [path, profile, threadId]));

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setNotice("");
    try {
      await api(path, "POST", { body });
      setDraft("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "메시지를 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  }

  if (!profile) return <Text style={styles.status}>내 정보 탭에서 로그인하면 대화를 볼 수 있어요.</Text>;

  return (
    <View style={styles.screen}>
      {threadId && <Text style={styles.title}>{chat?.vendor_name ?? "업체 문의"}</Text>}
      <ScrollView ref={scroll} contentContainerStyle={styles.content}
        onContentSizeChange={threadId ? () => scroll.current?.scrollToEnd() : undefined}>
        {threadId ? (
          <>
            {chat?.messages.length === 0 && <Text style={styles.status}>첫 메시지를 보내 문의를 시작해 보세요.</Text>}
            {chat?.messages.map((message) => (
              <Text key={message.id} style={[styles.message, message.mine && styles.mine]}>{message.body}</Text>
            ))}
          </>
        ) : (
          <>
            {threads?.length === 0 && <Text style={styles.status}>아직 대화가 없어요. 업체 상세에서 문의할 수 있어요.</Text>}
            {threads?.map((thread) => (
              <Pressable key={thread.id} style={styles.thread} accessibilityRole="button"
                onPress={() => router.push({ pathname: "/conversation/[id]", params: { id: thread.id } })}>
                <Text style={styles.title}>{thread.vendor_name}</Text>
                <Text style={styles.status}>{thread.incoming ? "받은 문의" : "내 문의"}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      {!!notice && <Text style={styles.status} accessibilityLiveRegion="polite">{notice}</Text>}
      {threadId && !!chat && (
        <View style={styles.composer}>
          <TextInput accessibilityLabel="메시지" placeholder="메시지 입력" style={styles.input}
            value={draft} onChangeText={setDraft} maxLength={2000} editable={!sending} />
          <Pressable accessibilityRole="button" disabled={!draft.trim() || sending} onPress={() => void send()} style={styles.button}>
            <Text style={styles.label}>{sending ? "전송 중" : "보내기"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 10 },
  content: { gap: 8 },
  title: { color: color.ink, fontSize: 17, fontWeight: "700" },
  status: { color: color.sub, padding: 8 },
  thread: { padding: 12, borderRadius: 12, backgroundColor: color.soft },
  message: { alignSelf: "flex-start", maxWidth: "84%", padding: 12, borderRadius: 12, backgroundColor: color.soft, color: color.ink },
  mine: { alignSelf: "flex-end", backgroundColor: color.greenSoft },
  composer: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, padding: 10, borderWidth: 1, borderColor: color.line, borderRadius: 10, color: color.ink },
  button: { padding: 11, borderRadius: 10, backgroundColor: color.greenSoft },
  label: { fontWeight: "700", color: color.green },
});
