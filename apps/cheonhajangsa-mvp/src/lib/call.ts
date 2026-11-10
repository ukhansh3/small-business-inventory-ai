// 전화하기(WF-07, AC-13).
// 예시 판매처는 번호가 가짜라 tel:을 열지 않고 안내만 한다(coding-rules 보안).
// 실제 판매처: 휴대폰이면 tel:, PC면 번호를 크게 보여 주고 복사(consistency-report A9).

export type CallPlan = { kind: "example"; phone: string } | { kind: "dial"; url: string } | { kind: "show"; phone: string };

export function planCall(card: { is_example: boolean; phone: string }, isPhone: boolean): CallPlan {
  if (card.is_example) return { kind: "example", phone: card.phone };
  if (isPhone) return { kind: "dial", url: `tel:${card.phone.replace(/[^0-9+]/g, "")}` };
  return { kind: "show", phone: card.phone };
}

export function isPhoneUserAgent(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}
