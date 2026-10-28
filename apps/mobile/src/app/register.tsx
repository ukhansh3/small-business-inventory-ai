import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { z } from "zod";
import { ProtectedPhoto } from "../components/ProtectedPhoto";
import {
  draftFromRevision,
  Revision,
  revisionSchema,
  VendorDraft,
  vendorDraftSchema,
} from "@cheon/vendor-contracts";
import {
  Action,
  Card,
  Field,
  Heading,
  Note,
  Screen,
  s,
} from "../components/ui";
import { useAuth } from "../auth/provider";
import { apiRequest, useApiResource } from "../lib/api";
import { backendConfigured } from "../lib/supabase";
const emptyItem = () => ({
  name: "",
  category: "",
  specification: "",
  quantity: null,
  unit: "kg",
  price: null,
  tax: "" as const,
  minimum_packages: 1,
  delivery_fee: null,
  delivery_fee_basis: "",
  selling: true,
  checked_on: null,
});
const numberValue = (text: string) =>
  text.trim() === "" ? null : Number(text);
export default function Registration() {
  const { revisionId } = useLocalSearchParams<{ revisionId?: string }>();
  const { session } = useAuth();
  const resource = useApiResource(
    revisionId ? `/me/revisions/${revisionId}` : null,
    revisionSchema,
  );
  if (!backendConfigured)
    return <Editor initial={null} onReload={() => {}} preview />;
  if (!session)
    return (
      <Screen>
        <Heading>업체 등록</Heading>
        <Note>
          {!backendConfigured
            ? "Supabase와 API 서버 설정이 필요합니다. 현재는 실제 DB에 저장할 수 없습니다."
            : "내 업체를 등록하려면 먼저 로그인해 주세요."}
        </Note>
        <Action
          label="로그인"
          disabled={!backendConfigured}
          onPress={() => router.push("/login")}
        />
      </Screen>
    );
  if (revisionId && resource.loading)
    return (
      <Screen>
        <Note>저장된 업체 정보를 불러오는 중…</Note>
      </Screen>
    );
  if (revisionId && resource.error)
    return (
      <Screen>
        <Note>{resource.error}</Note>
        <Action label="다시 불러오기" onPress={resource.refresh} />
      </Screen>
    );
  if (revisionId && !resource.data)
    return (
      <Screen>
        <Note>업체 정보를 확인하는 중…</Note>
      </Screen>
    );
  const initial = resource.data;
  return (
    <Editor
      key={
        initial ? `${initial.id}:${initial.version}:${initial.status}` : "new"
      }
      initial={initial}
      onReload={resource.refresh}
    />
  );
}
function Editor({
  initial,
  onReload,
  preview = false,
}: {
  initial: Revision | null;
  onReload: () => void;
  preview?: boolean;
}) {
  const [saved, setSaved] = useState<Revision | null>(initial);
  const [draft, setDraft] = useState<VendorDraft>(() =>
    initial
      ? draftFromRevision(initial)
      : vendorDraftSchema.parse({ items: [emptyItem()] }),
  );
  const [creationKey] = useState(() => Crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const locked =
    !!saved && ["pending_review", "approved"].includes(saved.status);
  const edit = <K extends keyof VendorDraft>(key: K, value: VendorDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const changeItem = (
    index: number,
    patch: Partial<VendorDraft["items"][number]>,
  ) =>
    edit(
      "items",
      draft.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );
  async function saveCurrent() {
    const input = vendorDraftSchema.parse(draft);
    const next = await apiRequest("/me/vendors", revisionSchema, {
      method: "POST",
      body: {
        draft: input,
        creation_key: creationKey,
        revision_id: saved?.id ?? null,
        expected_version: saved?.version ?? null,
      },
    });
    setSaved(next);
    setDraft(draftFromRevision(next));
    return next;
  }
  async function addPhoto() {
    setBusy(true);
    setMessage("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024)
        throw new Error("사진은 3MB 이하로 선택해 주세요.");
      const current = await saveCurrent();
      const form = new FormData();
      // React Native's multipart runtime accepts a native file descriptor; DOM types only name Blob.
      form.append("file", {
        uri: asset.uri,
        name: "vendor-photo",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
      const uploaded = await apiRequest(
        `/me/revisions/${current.id}/images`,
        z.object({ image_id: z.string().uuid(), revision: revisionSchema }),
        { method: "POST", body: form },
      );
      setSaved(uploaded.revision);
      setDraft(draftFromRevision(uploaded.revision));
      setMessage(
        "비공개 사진을 추가했습니다. 운영자 승인 후 공개본에 포함됩니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof z.ZodError
          ? "입력값 형식을 확인해 주세요. 품목 수량·가격은 양수, 확인일은 YYYY-MM-DD 형식으로 입력합니다."
          : error instanceof Error
            ? error.message
            : "사진을 올리지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function perform(action: "save" | "submit" | "cancel" | "new") {
    setBusy(true);
    setMessage("");
    try {
      if (action === "save") {
        await saveCurrent();
        setMessage(
          "비공개 초안을 DB에 저장했습니다. 아직 지도에는 공개되지 않습니다.",
        );
      } else if (action === "submit") {
        const next = await saveCurrent();
        const submitted = await apiRequest(
          `/me/revisions/${next.id}/submit`,
          revisionSchema,
          { method: "POST", body: { expected_version: next.version } },
        );
        setSaved(submitted);
        setMessage(
          "운영자 검토를 요청했습니다. 승인 전에는 공개되지 않습니다.",
        );
      } else if (action === "cancel" && saved) {
        const next = await apiRequest(
          `/me/revisions/${saved.id}/cancel`,
          revisionSchema,
          { method: "POST", body: { expected_version: saved.version } },
        );
        setSaved(next);
        setDraft(draftFromRevision(next));
        setMessage("검토 요청을 취소했습니다. 초안을 수정할 수 있습니다.");
      } else if (action === "new" && saved) {
        const next = await apiRequest(
          `/me/vendors/${saved.vendor_id}/revision`,
          revisionSchema,
          { method: "POST" },
        );
        router.replace({
          pathname: "/register",
          params: { revisionId: next.id },
        });
      }
    } catch (error) {
      setMessage(
        error instanceof z.ZodError
          ? "입력값 형식을 확인해 주세요. 품목 수량·가격은 양수, 확인일은 YYYY-MM-DD 형식으로 입력합니다."
          : error instanceof Error
            ? error.message
            : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Screen>
        <Heading>업체와 판매 품목 등록</Heading>
        {preview && (
          <Note>
            서버 미연결 미리보기입니다. 테스트 값만 입력해 주세요. 입력 내용은
            저장·제출하지 않으며 화면을 닫으면 사라집니다.
          </Note>
        )}
        <Note>
          작성 중인 초안은 나와 운영자만 볼 수 있습니다. 승인되면
          업체명·주소·공개 연락처와 품목·가격이 로그인한 이용자에게 공개됩니다.
          검토 요청에는 품목·가격·규격·세금·최소 주문·확인일과 배송 조건이
          필요합니다. 주소 좌표는 서버에서 확인합니다.
        </Note>
        {saved && (
          <Note>
            상태:{" "}
            {
              {
                draft: "작성 중",
                pending_review: "운영자 검토 대기",
                changes_requested: "보완 필요",
                approved: "승인됨",
              }[saved.status]
            }{" "}
            · 버전 {saved.version}
            {saved.owner_message ? `\n운영자 안내: ${saved.owner_message}` : ""}
          </Note>
        )}
        {(
          [
            "name",
            "category",
            "contact",
            "address",
            "description",
            "opening_hours",
            "delivery_terms",
          ] as const
        ).map((key) => (
          <Field
            key={key}
            label={
              {
                name: "업체명",
                category: "업체 분류",
                contact: "공개용 연락처",
                address: "업체 주소 (도로명·번지)",
                description: "업체 소개",
                opening_hours: "영업시간",
                delivery_terms: "배송·방문 수령 조건",
              }[key]
            }
            value={draft[key]}
            editable={!locked && !busy}
            onChangeText={(value) => edit(key, value)}
            maxLength={
              key === "description"
                ? 2000
                : key === "delivery_terms"
                  ? 1000
                  : key === "address"
                    ? 200
                    : 100
            }
          />
        ))}
        <Card>
          <Text style={s.title}>수령 방식</Text>
          <View style={s.row}>
            {(
              [
                { value: "pickup", name: "방문 수령" },
                { value: "delivery", name: "배송" },
                { value: "both", name: "둘 다" },
              ] as const
            ).map((choice) => (
              <Action
                key={choice.value}
                label={choice.name}
                secondary={draft.fulfillment !== choice.value}
                disabled={locked || busy}
                onPress={() => edit("fulfillment", choice.value)}
              />
            ))}
          </View>
        </Card>
        {draft.items.map((item, index) => (
          <Card key={index}>
            <Text style={s.title}>판매 품목 {index + 1}</Text>
            <Field
              label="품목명"
              value={item.name}
              editable={!locked && !busy}
              onChangeText={(name) => changeItem(index, { name })}
              maxLength={100}
            />
            <Field
              label="판매 규격 설명 (예: 10kg 1포)"
              value={item.specification}
              editable={!locked && !busy}
              onChangeText={(specification) =>
                changeItem(index, { specification })
              }
              maxLength={200}
            />
            <Field
              label="규격 수량"
              value={item.quantity === null ? "" : String(item.quantity)}
              editable={!locked && !busy}
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                changeItem(index, { quantity: numberValue(value) })
              }
            />
            <Field
              label="규격 단위 (kg·개·박스 등)"
              value={item.unit}
              editable={!locked && !busy}
              onChangeText={(unit) => changeItem(index, { unit })}
              maxLength={20}
            />
            <Field
              label="해당 규격 1개 가격 (원)"
              value={item.price === null ? "" : String(item.price)}
              editable={!locked && !busy}
              keyboardType="number-pad"
              onChangeText={(value) =>
                changeItem(index, { price: numberValue(value) })
              }
            />
            <Text style={s.body}>부가세 조건</Text>
            <View style={s.row}>
              {(
                [
                  { value: "included", name: "포함" },
                  { value: "excluded", name: "별도" },
                  { value: "exempt", name: "면세" },
                ] as const
              ).map((choice) => (
                <Action
                  key={choice.value}
                  label={choice.name}
                  secondary={item.tax !== choice.value}
                  disabled={locked || busy}
                  onPress={() => changeItem(index, { tax: choice.value })}
                />
              ))}
            </View>
            <Field
              label="최소 주문 개수"
              value={
                item.minimum_packages === null
                  ? ""
                  : String(item.minimum_packages)
              }
              editable={!locked && !busy}
              keyboardType="number-pad"
              onChangeText={(value) =>
                changeItem(index, { minimum_packages: numberValue(value) })
              }
            />
            <Field
              label="가격 확인일 (YYYY-MM-DD)"
              value={item.checked_on ?? ""}
              editable={!locked && !busy}
              onChangeText={(value) =>
                changeItem(index, { checked_on: value || null })
              }
              maxLength={10}
            />
            <Field
              label="배송비 (원, 미확정이면 비워 두기)"
              value={
                item.delivery_fee === null ? "" : String(item.delivery_fee)
              }
              editable={!locked && !busy}
              keyboardType="number-pad"
              onChangeText={(value) =>
                changeItem(index, { delivery_fee: numberValue(value) })
              }
            />
            <Field
              label="배송비 적용 기준 (예: 주문당·지역별 문의)"
              value={item.delivery_fee_basis}
              editable={!locked && !busy}
              onChangeText={(delivery_fee_basis) =>
                changeItem(index, { delivery_fee_basis })
              }
              maxLength={500}
            />
            <Action
              label={item.selling ? "판매 중" : "판매 중지"}
              secondary={!item.selling}
              disabled={locked || busy}
              onPress={() => changeItem(index, { selling: !item.selling })}
            />
            {!locked && draft.items.length > 1 && (
              <Action
                secondary
                label="품목 삭제"
                disabled={busy}
                onPress={() =>
                  edit(
                    "items",
                    draft.items.filter((_, i) => i !== index),
                  )
                }
              />
            )}
          </Card>
        ))}
        {saved?.images.map((image) => (
          <ProtectedPhoto key={image.id} id={image.id} />
        ))}
        {!locked && (
          <Action
            secondary
            label="초안 저장 후 업체 사진 추가"
            disabled={preview || busy || (saved?.images.length ?? 0) >= 10}
            onPress={() => void addPhoto()}
          />
        )}
        {!locked && (
          <Action
            secondary
            label="판매 품목 추가"
            disabled={busy || draft.items.length >= 50}
            onPress={() => edit("items", [...draft.items, emptyItem()])}
          />
        )}
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={s.body}>
            {message}
          </Text>
        )}
        {!locked && (
          <>
            <Action
              label={busy ? "저장 중…" : "비공개 초안 저장"}
              disabled={preview || busy}
              onPress={() => void perform("save")}
            />
            <Action
              label="저장 후 운영자 검토 요청"
              disabled={preview || busy}
              onPress={() => void perform("submit")}
            />
          </>
        )}
        {saved?.status === "pending_review" && (
          <Action
            secondary
            label="검토 요청 취소 후 수정"
            disabled={busy}
            onPress={() => void perform("cancel")}
          />
        )}
        {saved?.status === "approved" && (
          <Action
            label="새 수정본 작성"
            disabled={busy}
            onPress={() => void perform("new")}
          />
        )}
        {initial && (
          <Action
            secondary
            label="서버에서 다시 불러오기 (미저장 입력 초기화)"
            disabled={busy}
            onPress={onReload}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
