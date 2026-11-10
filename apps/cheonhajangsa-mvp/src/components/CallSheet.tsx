import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { VendorCard } from "../../core/search-types";
import type { CallPlan } from "../lib/call";
import { color, font, radius } from "./theme";

// WF-07 전화하기(AC-13). 예시 판매처는 번호만 흐리게 보이고 tel:을 열지 않는다. PC는 번호 크게 + 복사.
// 휴대폰의 실제 판매처(dial)는 시트 없이 바로 전화 앱을 연다(HomeScreen).
export function CallSheet({ card, plan, onClose }: { card: VendorCard; plan: Exclude<CallPlan, { kind: "dial" }>; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await globalThis.navigator?.clipboard?.writeText(plan.phone);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet} accessibilityRole="alert">
        <Text style={styles.name}>{card.name}</Text>
        {plan.kind === "example" ? (
          <>
            <Text style={styles.warn}>예시 번호예요. 실제 가게가 아니어서 전화가 걸리지 않아요.</Text>
            <Text style={styles.phoneMuted}>{plan.phone}</Text>
          </>
        ) : (
          <>
            <Text style={styles.phone}>{plan.phone}</Text>
            <Pressable accessibilityRole="button" onPress={copy} style={styles.copy}>
              <Text style={styles.copyLabel}>{copied ? "복사했어요" : "번호 복사"}</Text>
            </Pressable>
          </>
        )}
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.closeLabel}>닫기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.surface, padding: 20, gap: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  name: { fontSize: font.title, fontWeight: "700", color: color.ink },
  warn: { fontSize: font.body, color: color.amber, backgroundColor: color.amberSoft, padding: 12, borderRadius: radius, lineHeight: 22 },
  phone: { fontSize: 28, fontWeight: "700", color: color.ink, letterSpacing: 1 },
  phoneMuted: { fontSize: 22, color: color.faint },
  copy: { backgroundColor: color.green, borderRadius: radius, paddingVertical: 14, alignItems: "center" },
  copyLabel: { color: "#ffffff", fontSize: font.large, fontWeight: "700" },
  close: { paddingVertical: 12, alignItems: "center" },
  closeLabel: { fontSize: font.body, color: color.sub },
});
