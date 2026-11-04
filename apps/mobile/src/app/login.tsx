import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Action, Field, Heading, Note, Screen, s } from "../components/ui";
import { backendConfigured, supabase } from "../lib/supabase";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(signUp: boolean) {
    if (!supabase || !backendConfigured) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = signUp
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (error) {
        setMessage(
          signUp
            ? "가입을 완료하지 못했습니다. 이메일·비밀번호 조건과 이미 가입한 계정인지 확인해 주세요."
            : "로그인하지 못했습니다. 이메일·비밀번호와 이메일 확인 여부를 확인해 주세요.",
        );
        return;
      }
      setPassword("");
      if (data.session) router.replace("/profile");
      else
        setMessage(
          "이메일 확인이 필요할 수 있습니다. 메일에서 가입 확인 후 이 화면에서 로그인해 주세요.",
        );
    } catch {
      setMessage("로그인 서비스에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading>로그인 / 회원가입</Heading>
      {!backendConfigured && (
        <Note>Supabase 공개 키와 API 서버 주소를 먼저 설정해야 합니다.</Note>
      )}
      <Note>
        계정 정보는 Supabase Auth가 관리합니다. 회원가입만으로 운영자 권한이
        생기지 않습니다. 새 계정의 비밀번호는 8자 이상으로 입력하세요.
      </Note>
      <Field
        label="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />
      <Field
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
      />
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={s.body}>
          {message}
        </Text>
      )}
      <Action
        label={busy ? "처리 중…" : "로그인"}
        disabled={
          busy || !backendConfigured || !email.trim() || password.length === 0
        }
        onPress={() => void submit(false)}
      />
      <Action
        secondary
        label="새 계정 만들기"
        disabled={
          busy || !backendConfigured || !email.trim() || password.length < 8
        }
        onPress={() => void submit(true)}
      />
    </Screen>
  );
}
