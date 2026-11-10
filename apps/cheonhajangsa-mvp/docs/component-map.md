# 컴포넌트 지도

## 1. 라우트
| 경로 | 화면 | 단계 | 권한 |
|---|---|---|---|
| `/` | v2 지도 홈(S-10): 위 입력창 + 카카오맵 + 목록 시트. 시트 안에 대화·조건 칩·결과·범위 밖 안내·단가 진단(S-01·S-02·S-03·S-05) | P0·v2 | 누구나(기기 id만) |
| `/vendor/[id]` | 판매처 상세(S-04) | P1 | 누구나 |
| `/location` | 내 위치 고르기(S-06) | P1 | 누구나 |

한 화면(`/`)에 흐름을 모은다. 강의실 시연에서 화면 전환을 줄이기 위해서다.

## 2. 계층과 책임
```
RootLayout (app/_layout.tsx)         휴대폰 폭 틀
HomeScreen 머리                      ExampleBanner, 내 위치 줄(누르면 /location)
└─ HomeScreen (app/index.tsx)        useAssist 연결
   ├─ ChatLog                        말풍선 목록(사장님·AI)
   │  ├─ Bubble
   │  └─ AskOptions                  되묻기 선택지 버튼
   ├─ NoticeCard                     범위 밖·무관·AI 실패 안내 + 버튼
   ├─ ConditionChips                 조건 요약, 칩 누르면 ChipEditor
   │  └─ ChipEditor                  선택지(WF-04 값과 같음)
   ├─ ResultList                     묶음 제목 + 카드, 0건 안내
   │  └─ VendorCard                  거리·영업·입고·배달·가격·최소 판매량·[전화하기][자세히]
   │     └─ CallSheet                예시 번호 안내 / PC 번호 표시·복사
   ├─ ChatInput                      입력창, 보내기
   └─ RestartButton                  새로 찾기
```

| 컴포넌트 | 책임 | 상태 | API |
|---|---|---|---|
| RootLayout | 틀, 예시 띠(응답의 `example_data`) | 없음(전역 값 읽기) | — |
| HomeScreen | 화면 조립 | `useAssist` | — |
| useAssist(훅) | 세션 id, 턴 목록, 조건, 칩, 결과, 로딩·오류 | **상태는 여기 한 곳** | API-01, API-02, API-04, API-05 |
| AskOptions | 선택지 표시, 고르면 `sendChoice` | 없음 | (훅 경유) API-01 |
| NoticeCard | 안내 문구와 actions 버튼 | 없음 | (훅 경유) API-05 |
| ConditionChips / ChipEditor | 칩 표시·수정 → `editCondition` | 편집 중 칩(지역 상태) | (훅 경유) API-02 |
| ResultList / VendorCard | 서버가 준 문구 그대로 표시 | 없음 | — |
| CallSheet | 예시면 안내만, 실제면 `tel:` 또는 번호 복사 | 열림 여부 | (훅 경유) API-04 |
| ChatInput | 1~200자 검사 후 `sendText` | 입력값 | (훅 경유) API-01 |

## 3. 상태 관리
- 서버 상태(세션·조건·결과)는 `useAssist` 하나에 둔다. 전역 상태 도구는 쓰지 않는다.
- 기기 id는 `localStorage`(웹). 없으면 첫 실행 때 만든다.
- 화면 문구는 서버 응답 그대로(규칙 판정을 앱에서 다시 하지 않는다).

## 4. 로딩·빈·오류 상태
| 상태 | 표시 |
|---|---|
| AI 응답 대기 | 말풍선 자리에 '찾고 있어요…', 입력·버튼 잠금 |
| 결과 0건 | '조건에 맞는 곳이 없어요' + `empty_hint` |
| 503 AI_UNAVAILABLE | NoticeCard '잠깐 문제가 있어요. 조건을 직접 골라 주세요' + ChipEditor 자동 열림 |
| 400 INVALID_INPUT | 입력창 아래 문구 |
| 404/409 세션 | 조용히 새 세션으로 재시도 1회 |
| 네트워크 오류 | '연결이 끊겼어요' + [다시 시도] |
| `ai_mode=stored` | 상단에 작게 '저장된 응답' |

## 5. 접근 권한
로그인 없음. 모든 요청에 `X-Device-Id`. 운영자 화면은 이번 범위에 없다.

## 6. P1 화면 (11/04 구현)
| 경로 | 화면 | 내용 |
|---|---|---|
| `/vendor/[id]?item_id&location_id&session_id&rank` | VendorScreen(S-04) | API-03. 카드 정보 + 주소·요일별 영업시간·입고 일정·배달 지역·가격·출처, [전화하기](홈과 같은 규칙), [← 결과로] |
| `/location` | LocationScreen(S-06) | API-14 목록, 고르면 이 기기(localStorage)에 두고 API-07로 저장. 저장 실패면 "이 기기에서만 적용돼요" 안내 |

- 내 위치는 홈 머리 줄과 결과의 위치 칩에서 연다. 홈으로 돌아오면(`useFocusEffect`) 바뀐 위치를 반영하고, 결과가 있으면 API-02로 다시 찾는다(WF-08 경로, AI 없음).
- 업종 고르기(WF-02 선택 사항)는 선택지가 문서에 없어 화면에 두지 않았다. API-07은 `business_type`을 받는다.

## 7. v2 단가 진단 화면 (11/05, 12단계)
| 컴포넌트 | 내용 |
|---|---|
| ChatInput | 📷 버튼(사진 고르기 → `src/lib/photo.ts`가 긴 변 1600px JPEG, 3MB 이하로 줄임) + 글 입력. 안내 '상추 / 상추 2kg 1만원 / 📷 영수증' |
| PriceCheckCard | 문서 종류·구입처·날짜, 동네 시세, '이렇게 읽었어요'(줄마다 무게·금액 → kg당, 판정 배지 또는 이유), 배송비 별도 안내, 더 싼 곳(VendorCard 재사용), [이 가격 동네 시세에 보태기](API-16), [상추 판매처 찾기], '사진은 저장하지 않아요' |
| MarketLine | 찾기 결과 위 동네 시세 한 줄(API-01·02 `market`) |
- 상태(useAssist): `priceCheck`, `share`, `market`. 진단 요약은 말풍선 한 줄(판정이 있으면 "상추 kg당 5,000원 · 동네 중간 …", 없으면 안내). 새 진단이 오면 카드 맨 위로 스크롤
- 사진 진단 실패(503)는 입력창 아래 안내("가격을 글로 적어 주세요"). 지도 홈(14단계)에서 이 화면들은 목록 시트 안으로 옮긴다

## 8. v2 지도 홈 (11/05, 14단계)
```
HomeScreen
├─ 머리(천하장사, 저장된 응답, 새로 찾기) · ExampleBanner
├─ ChatInput(📷 + 글)            위로 옮김(지도앱 검색창 자리)
├─ 내 위치 줄(→ /location)
├─ KakaoMap(.web.tsx)            핀: 확인 판매처·예시 판매처·공공데이터·내 위치. 강조 = 고른 가게 > 결과 > 더 싼 곳(map-pins.ts)
├─ 시트 손잡이                    지도 크게(목록 작게) ↔ 목록 크게(지도 140px)
└─ 시트(ScrollView)
   ├─ 지도에서 고른 가게(StoreCard: VendorCard 또는 PublicStoreCard)
   ├─ 대화 전: 안내 + StoreList(가까운 30곳, API-18)
   └─ 대화 후: 기존 대화·칩·시세·결과·진단(6·7절)
```
- 지도를 못 불러오면(키·도메인·네트워크) 지도 자리에 안내만 띄우고 목록은 그대로 쓴다.
- 카카오 키: 공개용 JavaScript 키, 카카오 콘솔의 JavaScript SDK 도메인에 `http://localhost:8081`, `https://cheonhajangsa-mvp.vercel.app` 등록(11/05 사용자). 배포는 Vercel 환경 변수 `EXPO_PUBLIC_KAKAO_JS_KEY`(빌드 때 들어감)
