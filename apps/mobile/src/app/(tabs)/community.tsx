import { Text } from "react-native";
import { Brand, Card, Heading, Note, Screen, s } from "../../components/ui";
const posts = [
  {
    title: "포장 용기 규격을 어떻게 확인하나요?",
    body: "용량과 묶음 수량, 최소 주문 조건을 함께 확인하는 화면 예시입니다.",
    kind: "구매처 질문",
  },
  {
    title: "가격과 배송비를 함께 확인해요",
    body: "품목 가격뿐 아니라 세금과 배송 조건도 확인하는 예시입니다.",
    kind: "가격 제보",
  },
];
export default function Community() {
  return (
    <Screen>
      <Brand />
      <Heading>사장님 커뮤니티</Heading>
      <Note>
        아래 글은 가상 예시입니다. 로그인·글 작성·신고·운영자 처리는 DB 연결 후
        제공됩니다.
      </Note>
      {posts.map((p) => (
        <Card key={p.title}>
          <Text style={s.muted}>{p.kind} · 샘플 게시물</Text>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.body}>{p.body}</Text>
        </Card>
      ))}
    </Screen>
  );
}
