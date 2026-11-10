import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { request, useMember } from "../lib/members";
import { color } from "./theme";

type Review = { id: string; rating: number; body: string; example: boolean };

export function VendorReviews({ vendorId }: { vendorId: string }) {
  const member = useMember();
  const [reviews, setReviews] = useState<Review[]>();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const path = "/me/vendor-reviews/" + encodeURIComponent(vendorId);

  useEffect(() => {
    let active = true;
    void request<{ reviews: Review[] }>(path).then(
      (result) => { if (active) setReviews(result.reviews); },
      () => { if (active) setNotice("리뷰를 불러오지 못했어요."); },
    );
    return () => { active = false; };
  }, [path]);

  async function submit() {
    setBusy(true);
    setNotice("");
    try {
      await member.api(path, "PUT", { rating, body });
      setRating(0);
      setBody("");
      setReviews((await request<{ reviews: Review[] }>(path)).reviews);
      setNotice("리뷰를 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "리뷰를 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>별점과 리뷰</Text>
      {!!reviews?.length && (
        <Text style={styles.score}>★ {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)} · 리뷰 {reviews.length}개{reviews.some((review) => review.example) ? " · 시연 리뷰 포함" : ""}</Text>
      )}
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityLabel={value + "점"}
            accessibilityState={{ selected: value === rating }} onPress={() => setRating(value)}>
            <Text style={styles.star}>{value <= rating ? "★" : "☆"}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput accessibilityLabel="리뷰 내용" placeholder="업체를 이용한 경험을 남겨 주세요"
        multiline maxLength={500} value={body} onChangeText={setBody} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy || !member.profile || !rating || !body.trim()}
        onPress={() => void submit()} style={styles.button}>
        <Text style={styles.label}>{busy ? "저장 중…" : member.profile ? "리뷰 저장" : "로그인 후 리뷰 작성"}</Text>
      </Pressable>
      {!!notice && <Text accessibilityLiveRegion="polite">{notice}</Text>}
      {reviews?.length === 0 && <Text style={styles.body}>아직 등록된 리뷰가 없어요.</Text>}
      {reviews?.map((review) => (
        <View key={review.id} style={styles.review}>
          <Text style={styles.score}>★ {review.rating}/5 · {review.example ? "시연 리뷰" : "회원 리뷰"}</Text>
          <Text style={styles.body}>{review.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.line },
  title: { fontSize: 19, fontWeight: "700", color: color.ink },
  stars: { flexDirection: "row", gap: 8 },
  star: { fontSize: 28, color: "#b54708", paddingHorizontal: 4 },
  input: { minHeight: 80, padding: 12, borderWidth: 1, borderColor: color.line, borderRadius: 12, color: color.ink, textAlignVertical: "top" },
  button: { alignSelf: "flex-start", padding: 12, borderRadius: 10, backgroundColor: color.greenSoft },
  label: { fontWeight: "700", color: color.green },
  review: { gap: 5, padding: 12, borderRadius: 12, backgroundColor: color.soft },
  score: { color: "#9a3412", fontWeight: "700" },
  body: { color: color.ink, lineHeight: 21 },
});
