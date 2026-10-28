import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Action,
  Brand,
  Card,
  Field,
  Heading,
  Note,
  Screen,
  s,
} from "../../components/ui";
import { findVendors } from "../../domain/vendors";
export default function Assistant() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const found = submitted ? findVendors(submitted) : [];
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Screen>
        <Brand />
        <Heading>AI 도우미</Heading>
        <Note>
          실제 AI 미연결 · 입력한 업체명·품목명을 샘플 자료에서 찾는
          미리보기입니다. 자연어를 이해하는 AI 응답이 아닙니다.
        </Note>
        <Field
          label="찾는 품목"
          value={query}
          onChangeText={setQuery}
          placeholder="예: 양파"
          maxLength={100}
          onSubmitEditing={() => setSubmitted(query.trim())}
        />
        <Action
          label="샘플 자료 찾기"
          disabled={!query.trim()}
          onPress={() => setSubmitted(query.trim())}
        />
        {submitted !== null && (
          <View style={{ gap: 14 }}>
            <Text style={s.body}>
              “{submitted}” 샘플 자료 {found.length}곳
            </Text>
            {!found.length && (
              <Note>
                일치하는 자료가 없습니다. 양파 또는 포장 용기를 입력해 보세요.
              </Note>
            )}
            {found.map((v) => (
              <Card key={v.id}>
                <Text style={s.title}>{v.name}</Text>
                <Text style={s.muted}>근거: {v.id} · 가상 자료</Text>
                <Action
                  label="업체 확인"
                  onPress={() =>
                    router.push({
                      pathname: "/vendor/[id]",
                      params: { id: v.id },
                    })
                  }
                />
              </Card>
            ))}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
