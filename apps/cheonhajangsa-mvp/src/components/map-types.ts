// 지도 핀(v2 4절). 진한 색: 확인된 판매처 / 예시 판매처 / 흐린 색: 공공데이터 가게 / 내 위치
export type PinKind = "vendor" | "example" | "public" | "me";
export type Pin = { id: string; lat: number; lng: number; kind: PinKind; name: string };
export type MapProps = {
  center: { lat: number; lng: number };
  pins: Pin[];
  focusIds: string[]; // 강조할 핀(결과·더 싼 곳·고른 가게). 있으면 이 핀들이 보이게 맞춘다
  height: number;
  coveredBottom?: number;
  onVisibleCountChange?: (count: number | null) => void;
  onPinPress: (id: string) => void;
};
