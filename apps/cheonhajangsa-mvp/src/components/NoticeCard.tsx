import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Notice } from "../lib/api-types";
import type { RequestState } from "../lib/assist-state";
import { color, font, radius } from "./theme";

// S-05 범위 밖·무관한 말 안내(WF-10, WF-11)
export function NoticeCard({
  notice,
  request,
  disabled,
  onRequest,
  onSearchLettuce,
}: {
  notice: Notice;
  request: { state: RequestState; message: string | null };
  disabled: boolean;
  onRequest: () => void;
  onSearchLettuce: () => void;
}) {
  const canRequest = notice.actions.includes("request_item") && notice.recognized_item !== null;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {canRequest && request.state !== "done" && (
          <Pressable accessibilityRole="button" disabled={disabled || request.state === "sending"} onPress={onRequest} style={[styles.btn, styles.primary]}>
            <Text style={[styles.label, styles.primaryLabel]}>{request.state === "sending" ? "남기는 중…" : "요청 남기기"}</Text>
          </Pressable>
        )}
        {notice.actions.includes("search_lettuce") && (
          <Pressable accessibilityRole="button" disabled={disabled} onPress={onSearchLettuce} style={styles.btn}>
            <Text style={styles.label}>상추 찾기</Text>
          </Pressable>
        )}
      </View>
      {request.message && <Text style={[styles.result, request.state === "failed" && styles.fail]}>{request.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: { borderWidth: 1.5, borderColor: color.green, borderRadius: radius, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: color.surface },
  primary: { backgroundColor: color.green },
  label: { fontSize: font.body, fontWeight: "600", color: color.green },
  primaryLabel: { color: "#ffffff" },
  result: { fontSize: font.body, color: color.green },
  fail: { color: color.red },
});
