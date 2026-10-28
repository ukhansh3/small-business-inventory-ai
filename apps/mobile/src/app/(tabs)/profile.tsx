import { router } from "expo-router";
import { Text } from "react-native";
import {
  Action,
  Brand,
  Card,
  Heading,
  Note,
  Screen,
  s,
} from "../../components/ui";
export default function Profile() {
  return (
    <Screen>
      <Brand />
      <Heading>내 업체 관리</Heading>
      <Note>
        업체 사장이 품목·가격을 등록하고 운영자 확인 후 공개하는 서비스입니다.
      </Note>
      <Card>
        <Text style={s.title}>내 업체 등록하기</Text>
        <Text style={s.body}>
          업체 정보와 판매 품목·가격을 입력하는 모바일 화면을 미리 확인하세요.
        </Text>
        <Action
          label="업체 등록 화면 보기"
          onPress={() => router.push("/register")}
        />
      </Card>
      <Card>
        <Text style={s.title}>등록 후 공개까지</Text>
        <Text style={s.body}>
          1. 업체·품목·가격 작성{"\n"}2. 운영자 검토 요청{"\n"}3. 보완 또는 승인
          {"\n"}4. 승인된 내용만 지도에 공개
        </Text>
      </Card>
      <Note>
        로그인·실제 제출·검토 상태 조회는 아직 연결하지 않았습니다. 계정
        생성이나 운영자 승인이 완료된 상태가 아닙니다.
      </Note>
    </Screen>
  );
}
