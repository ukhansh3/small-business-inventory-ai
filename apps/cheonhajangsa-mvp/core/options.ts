// 되묻기·칩 편집 선택지(개발기획서 WF-04 표). 서버 되묻기와 앱 칩 편집이 같은 값을 쓴다.

export const QTY_OPTIONS = [
  { value: 1, label: "1kg" },
  { value: 2, label: "2kg" },
  { value: 5, label: "5kg" },
  { value: 4, label: "1박스(4kg)" },
  { value: null, label: "잘 모르겠어요" },
] as const;

export const URGENCY_OPTIONS = [
  { value: "now", label: "지금 바로" },
  { value: "today", label: "오늘 안" },
  { value: "tomorrow", label: "내일" },
] as const;

export const FULFILLMENT_OPTIONS = [
  { value: "pickup", label: "직접 갈게요" },
  { value: "delivery", label: "배달해 주세요" },
] as const;
