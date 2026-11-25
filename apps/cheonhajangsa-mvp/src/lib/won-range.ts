// 가격 범위 짧게 쓰기(시세 카드). 1만 원 이상은 "1.4만~2.5만원", 그 아래는 "1,860~2,160원"
export function wonRange(low: number, high: number): string {
  if (high < 10000) return low === high ? `${low.toLocaleString("ko-KR")}원` : `${low.toLocaleString("ko-KR")}~${high.toLocaleString("ko-KR")}원`;
  const man = (n: number) => `${(Math.round(n / 1000) / 10).toString()}만`;
  return low === high || man(low) === man(high) ? `${man(low)}원` : `${man(low)}~${man(high)}원`;
}
