import { useState } from "react";
import { Text } from "react-native";
import { Revision, revisionSchema } from "@cheon/vendor-contracts";
import {
  Action,
  Card,
  Field,
  Heading,
  Note,
  Screen,
  s,
} from "../components/ui";
import { apiRequest, useApiResource } from "../lib/api";
import { useAuth } from "../auth/provider";
import { ProtectedPhoto } from "../components/ProtectedPhoto";
const queueSchema = revisionSchema.array();
export default function Moderation() {
  const { session } = useAuth();
  const [offset, setOffset] = useState(0);
  const queue = useApiResource(
    `/moderation/revisions?offset=${offset}`,
    queueSchema,
  );
  if (!session)
    return (
      <Screen>
        <Note>운영자 계정 로그인이 필요합니다.</Note>
      </Screen>
    );
  return (
    <Screen>
      <Heading>운영자 업체 검토</Heading>
      <Note>
        업체 정보·좌표·품목·가격을 확인한 뒤 승인하세요. 자신이 관리하는 업체는
        승인할 수 없습니다. 내부 메모는 업체 사장과 일반 이용자에게 공개하지
        않습니다.
      </Note>
      <Action secondary label="검토 목록 새로고침" onPress={queue.refresh} />
      {queue.loading && <Note>검토 대기 목록을 불러오는 중…</Note>}
      {queue.error && <Note>{queue.error}</Note>}
      {queue.data?.length === 0 && (
        <Note>현재 페이지에 검토 대기 업체가 없습니다.</Note>
      )}
      {queue.data?.map((revision) => (
        <ReviewCard
          key={`${revision.id}:${revision.version}`}
          revision={revision}
          onReviewed={queue.refresh}
        />
      ))}
      <Action
        label="이전 페이지"
        secondary
        disabled={offset === 0}
        onPress={() => setOffset((n) => Math.max(0, n - 20))}
      />
      <Action
        label="다음 페이지"
        secondary
        disabled={!queue.data || queue.data.length < 20}
        onPress={() => setOffset((n) => n + 20)}
      />
    </Screen>
  );
}
function ReviewCard({
  revision,
  onReviewed,
}: {
  revision: Revision;
  onReviewed: () => void;
}) {
  const [ownerMessage, setOwnerMessage] = useState("");
  const [internal, setInternal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "approved" | "changes_requested") {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/moderation/revisions/${revision.id}`, revisionSchema, {
        method: "POST",
        body: {
          expected_version: revision.version,
          decision,
          owner_message: ownerMessage,
          internal_note: internal,
        },
      });
      onReviewed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "검토 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={s.title}>{revision.name}</Text>
      <Text style={s.body}>
        {revision.category} · {revision.contact}
        {"\n"}
        {revision.address}
        {"\n"}좌표: {revision.latitude}, {revision.longitude}
        {"\n"}
        {revision.delivery_terms}
      </Text>
      {revision.items.map((item) => (
        <Text key={item.item_id} style={s.body}>
          {item.name} · {item.specification} · {item.quantity}
          {item.unit}
          {"\n"}
          {item.price?.toLocaleString()}원 · 세금 {item.tax} · 최소{" "}
          {item.minimum_packages}개{"\n"}배송비{" "}
          {item.delivery_fee === null ? "미확정" : item.delivery_fee + "원"} /{" "}
          {item.delivery_fee_basis}
          {"\n"}판매 {item.selling ? "중" : "중지"} · 확인일 {item.checked_on}
        </Text>
      ))}
      {revision.images.map((image) => (
        <ProtectedPhoto key={image.id} id={image.id} />
      ))}
      <Field
        label="업체에 전달할 안내·보완 사유"
        value={ownerMessage}
        onChangeText={setOwnerMessage}
        maxLength={1000}
        editable={!busy}
      />
      <Field
        label="운영자 내부 메모"
        value={internal}
        onChangeText={setInternal}
        maxLength={2000}
        editable={!busy}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Action
        label="확인 완료 · 승인"
        disabled={busy}
        onPress={() => void decide("approved")}
      />
      <Action
        secondary
        label="보완 요청"
        disabled={busy || !ownerMessage.trim()}
        onPress={() => void decide("changes_requested")}
      />
    </Card>
  );
}
