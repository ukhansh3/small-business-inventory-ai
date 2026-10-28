import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import {
  Action,
  Card,
  Field,
  Heading,
  Note,
  Screen,
  s,
} from "../components/ui";
import { validateRegistration } from "../domain/registration";
type Row = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  price: string;
};
export default function Registration() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<Row[]>([
    { id: 1, name: "", quantity: "", unit: "kg", price: "" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [valid, setValid] = useState(false);
  const [nextId, setNextId] = useState(2);
  function change(id: number, key: keyof Omit<Row, "id">, value: string) {
    setValid(false);
    setItems((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }
  function check() {
    const result = validateRegistration({
      name,
      contact,
      address,
      items: items.map((row) => ({
        name: row.name,
        quantity: Number(row.quantity),
        unit: row.unit,
        price: Number(row.price),
      })),
    });
    setErrors(
      result.success
        ? []
        : result.error.issues.map((issue) => {
            const index =
              issue.path[0] === "items" && typeof issue.path[1] === "number"
                ? `품목 ${issue.path[1] + 1}: `
                : "";
            return index + issue.message;
          }),
    );
    setValid(result.success);
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Screen>
        <Heading>업체와 판매 품목 등록</Heading>
        <Note>
          화면 미리보기입니다. 입력 내용은 저장·제출되지 않으며 화면을 닫으면
          사라집니다. 실제 연락처 대신 테스트 값을 입력해 주세요.
        </Note>
        <Field
          label="업체명"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setValid(false);
          }}
          maxLength={100}
        />
        <Field
          label="공개용 연락처"
          value={contact}
          onChangeText={(v) => {
            setContact(v);
            setValid(false);
          }}
          maxLength={100}
        />
        <Field
          label="업체 주소"
          value={address}
          onChangeText={(v) => {
            setAddress(v);
            setValid(false);
          }}
          maxLength={200}
        />
        {items.map((item, index) => (
          <Card key={item.id}>
            <Text style={s.title}>판매 품목 {index + 1}</Text>
            <Field
              label="품목명"
              value={item.name}
              onChangeText={(v) => change(item.id, "name", v)}
              maxLength={100}
            />
            <Field
              label="규격 수량"
              value={item.quantity}
              onChangeText={(v) => change(item.id, "quantity", v)}
              keyboardType="decimal-pad"
            />
            <Field
              label="규격 단위 (kg·개·박스 등)"
              value={item.unit}
              onChangeText={(v) => change(item.id, "unit", v)}
              maxLength={20}
            />
            <Field
              label="해당 규격 1개 가격 (원)"
              value={item.price}
              onChangeText={(v) => change(item.id, "price", v)}
              keyboardType="number-pad"
            />
            {items.length > 1 && (
              <Action
                secondary
                label="이 품목 삭제"
                onPress={() => {
                  setItems((rows) => rows.filter((row) => row.id !== item.id));
                  setValid(false);
                }}
              />
            )}
          </Card>
        ))}
        <Action
          secondary
          label="판매 품목 추가"
          onPress={() => {
            setItems((rows) => [
              ...rows,
              { id: nextId, name: "", quantity: "", unit: "kg", price: "" },
            ]);
            setNextId((n) => n + 1);
            setValid(false);
          }}
        />
        {errors.length > 0 && (
          <View accessibilityLiveRegion="polite">
            {errors.map((error, index) => (
              <Text key={index} style={s.error}>
                {error}
              </Text>
            ))}
          </View>
        )}
        <Action label="필수 입력 확인 · 제출 아님" onPress={check} />
        {valid && (
          <Note>
            필수 입력 형식을 확인했습니다. 실제 서버 제출은 하지 않았습니다.
            부가세·배송·좌표 확인과 운영자 검토를 포함한 전체 제출 기능은 DB
            계약 구현 후 연결합니다.
          </Note>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
