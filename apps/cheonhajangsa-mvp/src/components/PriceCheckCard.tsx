import { Pressable, StyleSheet, Text, View } from "react-native";
import type { VendorCard as Card } from "../../core/search-types";
import type { PriceCheck, PriceLine } from "../lib/api-types";
import type { RequestState } from "../lib/assist-state";
import { MarketLine } from "./MarketLine";
import { color, font, radius } from "./theme";
import { VendorCard } from "./VendorCard";

// v2 단가 진단 카드(feature-v2 1.3·1.4). 서버가 만든 값·문구만 보여 준다. 요약·안내(message)는 말풍선에 나온다
const DOC_LABEL: Record<string, string> = {
  paper_receipt: "종이 영수증",
  mobile_receipt: "모바일 영수증",
  platform_order: "온라인 주문내역",
  product_page: "상품 화면",
  invoice: "거래명세서",
  not_receipt: "영수증 아님",
  text: "가격 한 줄",
};
const SELLER_LABEL: Record<string, string> = { local_store: "동네 가게", food_mart: "마트·식자재마트", online_platform: "온라인", unknown: "" };

function won(n: number): string {
  return n.toLocaleString("ko-KR");
}

function LineRow({ line }: { line: PriceLine }) {
  const badge = line.verdict === "pricier" ? styles.pricier : line.verdict === "cheaper" ? styles.cheaper : styles.normal;
  return (
    <View style={styles.line}>
      <Text style={styles.lineName}>{line.raw_name}</Text>
      <Text style={styles.lineSub}>
        {line.qty_kg !== null ? `${line.qty_kg}kg · ` : ""}
        {won(line.amount_won)}원
        {line.price_per_kg !== null && line.comparable ? ` → kg당 ${won(line.price_per_kg)}원` : ""}
      </Text>
      {line.verdict_display ? (
        <Text style={[styles.badge, badge]}>{line.verdict_display}</Text>
      ) : (
        line.reason && <Text style={styles.reason}>{line.reason}</Text>
      )}
    </View>
  );
}

export function PriceCheckCard({
  check,
  share,
  disabled,
  onShare,
  onSearch,
  onCall,
  onDetail,
}: {
  check: PriceCheck;
  share: { state: RequestState; message: string | null };
  disabled: boolean;
  onShare: () => void;
  onSearch: () => void;
  onCall: (c: Card) => void;
  onDetail: (c: Card) => void;
}) {
  const judged = check.lines.find((l) => l.cheaper.length > 0);
  const canShare = check.lines.some((l) => l.comparable);
  const meta = [DOC_LABEL[check.doc_type], SELLER_LABEL[check.seller_type], check.purchased_on].filter(Boolean).join(" · ");
  return (
    <View style={styles.card}>
      <Text style={styles.meta}>{meta}</Text>
      {check.market && <MarketLine market={check.market} />}
      {check.lines.length > 0 && (
        <View style={styles.lines}>
          <Text style={styles.section}>이렇게 읽었어요</Text>
          {check.lines.map((l) => (
            <LineRow key={l.line_no} line={l} />
          ))}
          {check.delivery_fee_won !== null && <Text style={styles.reason}>배송비 {won(check.delivery_fee_won)}원은 빼고 계산했어요.</Text>}
        </View>
      )}
      {judged && (
        <View style={styles.lines}>
          <Text style={styles.section}>kg당 {won(judged.price_per_kg!)}원보다 싸게 파는 곳</Text>
          {judged.cheaper.map((c) => (
            <VendorCard key={c.vendor_id} card={c} dimmed={false} onCall={() => onCall(c)} onDetail={() => onDetail(c)} />
          ))}
        </View>
      )}
      <View style={styles.actions}>
        {canShare && share.state !== "done" && (
          <Pressable accessibilityRole="button" disabled={disabled || share.state === "sending"} onPress={onShare} style={[styles.btn, styles.primary]}>
            <Text style={[styles.btnLabel, styles.primaryLabel]}>{share.state === "sending" ? "보태는 중…" : "이 가격 동네 시세에 보태기"}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onSearch} style={styles.btn}>
          <Text style={styles.btnLabel}>상추 판매처 찾기</Text>
        </Pressable>
      </View>
      {share.message && <Text style={[styles.shareMsg, share.state === "failed" && styles.fail]}>{share.message}</Text>}
      {canShare && share.state !== "done" && <Text style={styles.note}>보태면 가게 이름 없이 kg당 가격만 동네 시세에 들어가요.</Text>}
      {check.source === "photo" && <Text style={styles.note}>사진은 진단에만 쓰고 저장하지 않아요.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  meta: { fontSize: font.small, color: color.sub, fontWeight: "600" },
  lines: { gap: 10 },
  section: { fontSize: font.small, fontWeight: "700", color: color.sub },
  line: { gap: 3, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: color.line },
  lineName: { fontSize: font.body, fontWeight: "700", color: color.ink },
  lineSub: { fontSize: font.body, color: color.sub },
  badge: { alignSelf: "flex-start", fontSize: font.body, fontWeight: "700", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, overflow: "hidden" },
  pricier: { color: color.red, backgroundColor: color.redSoft },
  cheaper: { color: color.green, backgroundColor: color.greenSoft },
  normal: { color: color.ink, backgroundColor: color.bg },
  reason: { fontSize: font.small, color: color.faint },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { borderWidth: 1.5, borderColor: color.green, borderRadius: radius, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: color.surface },
  primary: { backgroundColor: color.green },
  btnLabel: { fontSize: font.body, fontWeight: "700", color: color.green },
  primaryLabel: { color: "#ffffff" },
  shareMsg: { fontSize: font.body, color: color.green },
  fail: { color: color.red },
  note: { fontSize: 12, color: color.faint },
});
