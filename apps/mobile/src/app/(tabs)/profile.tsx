import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { workspaceSchema } from "@cheon/vendor-contracts";
import {
  Action,
  Brand,
  Card,
  Heading,
  Note,
  Screen,
  s,
} from "../../components/ui";
import { useAuth } from "../../auth/provider";
import { useApiResource } from "../../lib/api";
import { backendConfigured, supabase } from "../../lib/supabase";
const statusNames = {
  draft: "작성 중",
  pending_review: "검토 대기",
  changes_requested: "보완 필요",
  approved: "승인됨",
};
export default function Profile() {
  const { session, loading } = useAuth();
  const workspace = useApiResource(
    backendConfigured && session ? "/me/vendors" : null,
    workspaceSchema,
  );
  const [message, setMessage] = useState("");
  return (
    <Screen>
      <Brand />
      <Heading>내 업체 관리</Heading>
      <Note>
        업체 사장이 품목·가격을 등록하고 운영자 확인 후 공개합니다. 승인 후
        수정은 새 제출본으로 검토합니다.
      </Note>
      {!backendConfigured && (
        <Note>
          서버 연결 설정이 아직 없습니다. Supabase 공개 설정과 API 주소를
          준비하면 로그인·DB 저장을 사용할 수 있습니다.
        </Note>
      )}
      {!backendConfigured && (
        <Action
          secondary
          label="업체 등록 화면 미리보기"
          onPress={() => router.push("/register")}
        />
      )}
      {loading && <Note>로그인 상태를 확인하는 중…</Note>}
      {!session ? (
        <Action
          label="로그인 / 회원가입"
          disabled={!backendConfigured || loading}
          onPress={() => router.push("/login")}
        />
      ) : (
        <>
          <Action
            label="새 업체 초안 작성"
            onPress={() => router.push("/register")}
          />
          <Action
            secondary
            label="내 업체 새로고침"
            onPress={workspace.refresh}
          />
          {workspace.loading && <Note>DB에서 내 업체를 불러오는 중…</Note>}
          {workspace.error && <Note>{workspace.error}</Note>}
          {workspace.data?.staff && (
            <Action
              label="운영자 업체 검토"
              onPress={() => router.push("/moderation")}
            />
          )}
          {workspace.data?.revisions.length === 0 && (
            <Note>아직 등록한 업체 초안이 없습니다.</Note>
          )}
          {workspace.data?.revisions.map((revision) => (
            <Card key={revision.id}>
              <Text style={s.title}>{revision.name || "이름 없는 초안"}</Text>
              <Text style={s.body}>
                {statusNames[revision.status]}
                {revision.is_current ? " · 현재 공개본" : ""}
                {revision.hidden ? " · 업체 비공개" : ""}
              </Text>
              {!!revision.owner_message && (
                <Text style={s.muted}>
                  운영자 안내: {revision.owner_message}
                </Text>
              )}
              <Action
                label={
                  revision.status === "approved"
                    ? "승인 정보·수정본 보기"
                    : "작성·검토 정보 보기"
                }
                onPress={() =>
                  router.push({
                    pathname: "/register",
                    params: { revisionId: revision.id },
                  })
                }
              />
            </Card>
          ))}
          <Action
            secondary
            label="로그아웃"
            onPress={() => {
              void supabase?.auth.signOut().then(({ error }) => {
                if (error)
                  setMessage("로그아웃에 실패했습니다. 다시 시도해 주세요.");
              });
            }}
          />
          {!!message && <Text style={s.error}>{message}</Text>}
        </>
      )}
    </Screen>
  );
}
