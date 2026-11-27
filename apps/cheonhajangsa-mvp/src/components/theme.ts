// 화면 색·크기. 사장님이 바쁜 와중에 보는 화면이라 글자를 크게, 명암은 높게.
// 2026-11-26 시안(design/grocery-look): ui-ux-pro-max 장보기 앱 팔레트(신선한 초록 #059669 + 호박 #D97706)를
// 흰 글씨가 읽히도록 한 단계 진하게 맞췄다. 주황 #ff6f0f는 당근 대표색과 같아 버렸다.
// 키 이름 green은 '주 행동 색'이라는 뜻으로 그대로 둔다(파일 수십 개가 쓴다).
export const color = {
  bg: "#ffffff",
  surface: "#ffffff",
  ink: "#0f1f17",
  sub: "#475569",
  faint: "#64748b",
  line: "#e2e9e5",
  green: "#047857",
  greenSoft: "#ecfdf5",
  success: "#047857",
  soft: "#f1f5f3",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  red: "#dc2626",
  redSoft: "#fee2e2",
  ownerBubble: "#047857",
  // 추천 답 카드: 짙은 초록 판 + 호박 강조(금액·길찾기)
  answerBg: "#064e3b",
  answerSub: "#a7f3d0",
  answerLine: "#1f6b55",
  accent: "#f59e0b",
  onAccent: "#1c1206",
};

// 품목 색(조건 칩·판정 줄의 점). 색이 장식이 아니라 '어떤 채소인지'를 뜻한다
export const itemColor: Record<string, string> = {
  item_lettuce: "#65a30d",
  item_green_onion: "#0d9488",
  item_onion: "#9f1239",
  item_potato: "#a16207",
};

export const font = { small: 14, body: 16, large: 19, title: 24 }; // 40~60대 사장님 기준: 본문 16 이상
export const radius = 12;
