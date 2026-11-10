import { VendorArtwork } from "./VendorArtwork";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from "react-native";
import { useMember } from "../lib/members";
import { color } from "./theme";

type Thread = { id: string; vendor_name: string; vendor_id: string; last_message: string | null; unread_count: number };
type Message = { id: string; mine: boolean; body: string; unread: boolean };

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
          if (active) {
            setChat(result);
            const ids = result.messages.filter((message) => !message.mine && message.unread).map((message) => message.id);
            if (ids.length) await apiRef.current(path, "PATCH", { ids });
          }
        } else {
          const result = await apiRef.current<{ threads: Thread[] }>(path);
          if (active) setThreads(result.threads);
        }
      } catch {
        // Keep the current conversation visible and retry on the next refresh.
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
    <View style={[styles.screen, threadId && styles.chatScreen]}>
      {threadId && (
        <View style={styles.chatHeader}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{chat?.vendor_name.slice(0, 1) ?? "문"}</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{chat?.vendor_name ?? "업체 문의"}</Text>
            <Text style={styles.subtitle}>업체 문의 대화</Text>
          </View>
        </View>
      )}
      <ScrollView ref={scroll} style={styles.history} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, threadId && styles.chatContent]}
        onContentSizeChange={threadId ? () => scroll.current?.scrollToEnd() : undefined}>
        {threadId ? (
          <>
            {chat?.messages.length === 0 && <Text style={styles.status}>첫 메시지를 보내 문의를 시작해 보세요.</Text>}
            {chat?.messages.map((message) => (
              <View key={message.id} style={[styles.messageRow, message.mine && styles.myMessageRow]}>
                {message.mine && message.unread && (
                  <Text accessibilityLabel="상대방이 아직 읽지 않음" style={styles.unreadMarker}>1</Text>
                )}
                <View style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.message, message.mine && styles.mineText]}>{message.body}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            {threads?.length === 0 && <Text style={styles.status}>아직 대화가 없어요. 업체 상세에서 문의할 수 있어요.</Text>}
            {threads?.map((thread) => (
              <Pressable key={thread.id} style={styles.thread} accessibilityRole="button"
                onPress={() => router.push({ pathname: "/conversation/[id]", params: { id: thread.id } })}>
                <View style={styles.threadAvatar}>
                  <VendorArtwork store={{ store_id: thread.vendor_id, name: thread.vendor_name, category: "" }} />
                </View>
                <View style={styles.headerCopy}>
                  <Text numberOfLines={1} style={styles.title}>{thread.vendor_name}</Text>
                  <Text numberOfLines={1} style={styles.subtitle}>{thread.last_message ?? "아직 메시지가 없어요."}</Text>
                </View>
                {thread.unread_count > 0 && (
                  <View style={styles.unreadBadge} accessibilityLabel={"안 읽은 메시지 " + thread.unread_count + "개"}>
                    <Text style={styles.unreadText}>{thread.unread_count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      {!!notice && <Text style={styles.status} accessibilityLiveRegion="polite">{notice}</Text>}
      {threadId && !!chat && (
        <View style={styles.composer}>
          <TextInput accessibilityLabel="메시지" placeholder="메시지 입력" style={styles.input}
            value={draft} onChangeText={setDraft} maxLength={2000} multiline editable={!sending} />
          <Pressable accessibilityRole="button" disabled={!draft.trim() || sending} onPress={() => void send()} style={[styles.button, (!draft.trim() || sending) && styles.buttonDisabled]}>
            <Text style={styles.label}>{sending ? "전송 중" : "보내기"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 10 },
  chatScreen: { padding: 0, gap: 0, backgroundColor: "#f5f6f8" },
  chatHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: color.line, backgroundColor: "#fff",
  },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: color.greenSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: color.green, fontSize: 17, fontWeight: "800" },
  headerCopy: { flex: 1, gap: 2 },
  subtitle: { color: color.sub, fontSize: 12 },
  history: { flex: 1 },
  content: { gap: 8 },
  chatContent: { padding: 16, gap: 10 },
  title: { color: color.ink, fontSize: 17, fontWeight: "700" },
  status: { color: color.sub, padding: 8 },
  thread: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: color.line, backgroundColor: "#fff" },
  threadAvatar: { width: 58, height: 58, borderRadius: 17, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  unreadBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: "#b54708", alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 5 },
  myMessageRow: { justifyContent: "flex-end" },
  unreadMarker: { color: "#9a3412", fontSize: 12, fontWeight: "700", paddingBottom: 2 },
  bubble: { maxWidth: "84%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 17 },
  theirs: { alignSelf: "flex-start", backgroundColor: "#fff", borderBottomLeftRadius: 5, borderWidth: 1, borderColor: color.line },
  mine: { alignSelf: "flex-end", backgroundColor: color.green, borderBottomRightRadius: 5 },
  message: { color: color.ink, fontSize: 15, lineHeight: 22 },
  mineText: { color: "#fff" },
  composer: {
    flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: color.line, backgroundColor: "#fff",
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 112, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: color.line, borderRadius: 15, backgroundColor: "#f5f6f8",
    color: color.ink, fontSize: 15, lineHeight: 22,
  },
  button: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 14, backgroundColor: color.green },
  buttonDisabled: { opacity: 0.45 },
  label: { fontWeight: "700", color: "#fff" },
});