# 천하장사 · API 명세서 v0.1

> 2026-11-04 작성 · 송민혁 · 로컬 문서(저장소에 올리지 않음)
> 원천: `개발기획서.md`(워크플로우 WF, 데이터 개체 E, 규칙 R, 수용 기준 AC). 이 명세서의 모든 API는 개발기획서 8절의 API 번호와 같다.
> 단계 표시: **[MVP]** 11/11까지 구현 · **[다음]** 발표 이후. [다음] API도 모양을 미리 정해 DB가 받을 수 있게 한다.

---

## 0. 한눈에 보기

| 번호 | 메서드 · 경로 | 단계 | 인증 | 하는 일 | 워크플로우 |
|---|---|---|---|---|---|
| API-06 | `POST /devices` | MVP | 기기 | 첫 실행 기기 등록 | WF-01 |
| API-07 | `PATCH /devices/me` | MVP | 기기 | 내 위치·업종 저장 | WF-02 |
| API-14 | `GET /locations` | MVP | 기기 | 위치 프리셋 목록 | WF-02 |
| API-01 | `POST /assist/turns` | MVP | 기기 | 대화 한 턴(입력 → AI → 되묻기·결과·안내) | WF-03~05, 10~12 |
| API-02 | `POST /search` | MVP | 기기 | AI 없이 조건으로 검색(칩 수정) | WF-08, WF-12 |
| API-03 | `GET /vendors/{vendorId}` | MVP | 기기 | 판매처 상세 | WF-06 |
| API-04 | `POST /events` | MVP | 기기 | 행동 기록(전화하기 등) | WF-07, 09, 13 |
| API-05 | `POST /item-requests` | MVP | 기기 | 품목 요청 남기기 | WF-10 |
| API-15 | `POST /price-checks` | v2 | 기기 | 사진(영수증·결제내역·상품 화면) 단가 진단 | feature-v2 1.4 |
| API-16 | `PATCH /price-checks/{id}` | v2 | 기기 | 동네 시세에 보태기 동의 | feature-v2 1.4 |
| API-17 | `GET /market` | v2 | 기기 | 동네 시세 | feature-v2 1.2 |
| API-18 | `GET /stores` | v2 | 기기 | 지도용 가게(판매처 + 공공데이터) | feature-v2 4절 |
| API-08 | `POST /admin/login` | 다음 | 없음 | 운영자 로그인 | WF-15 |
| API-09 | `/admin/vendors…`, `/admin/field-checks`, `/admin/usability-tests` | 다음 | 운영자 | 판매처·판매 정보 관리, 현장 확인, 사용자 테스트 기록 | WF-15, 18, 19 |
| API-10 | `POST /admin/vendors/{vendorId}/update-links` 외 | 다음 | 운영자 | 갱신 링크 발급·폐기 | WF-16 |
| API-11 | `GET`·`PATCH /vendor-link/{token}` | 다음 | 링크 | 판매처 직접 갱신 | WF-17 |
| API-12 | `GET /admin/exports` | 다음 | 운영자 | 기록 내보내기 | WF-13, 19 |
| API-13 | `POST /stt` | 다음 | 기기 | 음성 → 글자 | WF-20 |

API-14는 명세 작성 중 추가했다. 화면 S-06(내 위치 고르기)에 목록이 필요하다. 개발기획서 8절에도 반영했다.

---

## 1. 공통 규약

### 1.1 주소와 형식
- 기본 주소: `https://{배포주소}/api/v1`
- 요청·응답 본문: JSON(UTF-8). 예외는 API-13(음성 파일, `multipart/form-data`)과 API-12(CSV 선택 가능).
- 시각: ISO 8601, 한국 시간대 표기. 예: `2026-11-11T10:05:00+09:00`
- 날짜: `YYYY-MM-DD`(한국 날짜)
- 영업·입고 판정(R-04·R-05)은 서버가 **요청을 받은 순간의 한국 시간**으로 한다. 테스트에서는 `X-Debug-Now` 헤더(1.6)로 시각을 고정한다.

### 1.2 식별자
| 대상 | 형식 | 예 | 누가 만드나 |
|---|---|---|---|
| 기기 | uuid v4 | `5b0c…` | 앱(첫 실행) |
| 세션 | uuid v4 | `9e21…` | 서버 |
| 판매처 | `v_` + 3자리 | `v_001` | 데이터 파일 [MVP] / 서버 [다음] |
| 품목 | `item_` + 영문 | `item_lettuce` | 데이터 파일 |
| 위치 | `loc_` + 영문 | `loc_ajou_main` | 데이터 파일 |
| 요청·기록 | uuid v4 | — | 서버 |

### 1.3 인증
| 종류 | 방법 | 쓰는 API |
|---|---|---|
| 기기 | 헤더 `X-Device-Id: {uuid}` 필수. 등록되지 않은 id면 서버가 자동 등록 후 처리(WF-01 실패 대비) | API-01~07, 13, 14 |
| 운영자 [다음] | 헤더 `Authorization: Bearer {운영자 토큰}`(API-08로 발급, 12시간 유효) | API-09, 10, 12 |
| 판매처 링크 [다음] | 경로의 `{token}`. 서버는 해시로만 대조(E-14) | API-11 |

### 1.4 오류 응답
모든 오류는 같은 모양이다.

```json
{
  "error": {
    "code": "ITEM_NOT_ACTIVE",
    "message": "아직 상추만 준비돼 있어요.",
    "detail": { "item_id": "item_green_onion" }
  }
}
```

`message`는 사장님 화면에 그대로 보여 줄 수 있는 문장이다. `detail`은 개발용이다.

| HTTP | code | 언제 |
|---|---|---|
| 400 | `INVALID_INPUT` | 필수 칸 누락, 타입·허용값 위반 |
| 400 | `ITEM_NOT_ACTIVE` | 검색 품목이 active가 아님(R-13) |
| 401 | `UNAUTHORIZED` | 기기 id 없음, 운영자 토큰 없음·만료 |
| 403 | `LINK_REVOKED` / `LINK_EXPIRED` | 판매처 링크 폐기·만료 |
| 404 | `NOT_FOUND` | 세션·판매처·위치 없음 |
| 409 | `SESSION_ENDED` | 끝난 세션에 턴을 보냄 |
| 429 | `RATE_LIMITED` | 기기별 호출 한도 초과(1.5) |
| 503 | `AI_UNAVAILABLE` | AI 실패·하루 한도 초과. 앱은 칩 편집으로 넘어간다(WF-12) |
| 503 | `STORAGE_UNAVAILABLE` | 기록 저장소(Supabase)가 없거나 실패해 저장이 목적인 요청을 처리하지 못함(API-05 품목 요청, API-07 내 위치). 다른 API는 기록 실패를 응답에 드러내지 않는다 |
| 500 | `INTERNAL` | 그 밖의 서버 오류 |

### 1.5 한도
| 대상 | 한도 | 넘으면 |
|---|---|---|
| API-01 기기별 | 시간당 60턴 | 429 |
| API-01 전체 AI 호출 | 하루 500회(환경 변수 `AI_DAILY_LIMIT`) | 503 `AI_UNAVAILABLE` |
| API-01 한 세션 AI 호출 | 6회(개발기획서 7절) | 503 `AI_UNAVAILABLE` + 지금까지의 조건(앱은 조건 직접 고르기). v0.6에서 "기본값으로 채워 검색"을 바꿈(기본값이 정의돼 있지 않아 지어낸 값이 됨, C13) |
| AI 응답 대기 | 8초 | 503 `AI_UNAVAILABLE` |
| API-04 기기별 | 분당 120건 | 429 |

한도 판정은 기록 저장소(Supabase)의 `public.chj_ai_gate`·`chj_log_event`가 한다. 저장소가 없거나 판정이 실패하면 한도를 적용하지 않는다(A4).

### 1.6 개발·시연용 헤더
| 헤더 | 값 | 쓰임 | 운영 배포 |
|---|---|---|---|
| `X-Debug-Now` | ISO 시각 | 영업·입고 판정 시각 고정(골든 케이스) | 무시 |
| `X-AI-Mode` | `stored` | 저장된 응답 강제(시연 백업, AC-15 테스트) | 서버 설정 `AI_MODE`가 우선 |
| `X-Test-Device` | `true` | 기기를 `is_test=true`로 표시(팀원·리허설). 처음 등록할 때만 반영된다. 앱은 링크를 `?test=1`로 한 번 연 브라우저에서 이 헤더를 보내고, 이때 기기 번호를 새로 받는다(`?test=0`이면 끔) | 허용 |

### 1.7 응답 공통 칸
- 모든 성공 응답에 `example_data: true/false`가 있다. 하나라도 예시 데이터가 섞이면 참이고, 앱은 상단 띠를 표시한다(R-12).
- API-01·API-02 응답에는 `ai_mode: "live" | "stored"`가 있다. `stored`면 앱이 '저장된 응답'을 작게 표시한다(WF-12).

---

## 2. 공통 데이터 모양

### 2.1 Location
```json
{ "location_id": "loc_ajou_main", "name": "아주대 정문", "dong": "원천동", "lat": 37.2796, "lng": 127.0436, "is_default": true }
```
좌표는 예시다. 실제 값은 데이터 작성 때 확인한다(개발기획서 11절).

### 2.2 Condition
| 칸 | 타입 | 필수 | 허용값 |
|---|---|---|---|
| version | 정수 | 응답에만 | 1부터 |
| item_id | 문자열 | 예 | active 품목 |
| qty_kg | 숫자 \| null | 예 | 0.5~50 또는 null(모름) |
| urgency | 문자열 | 예 | `now` / `today` / `tomorrow` |
| fulfillment | 문자열 | 예 | `pickup` / `delivery` |
| location_id | 문자열 | 예 | 위치 프리셋 |
| field_source | 객체 | 응답에만 | 칸마다 `said` / `asked` / `default` / `edited` |

```json
{
  "version": 1,
  "item_id": "item_lettuce",
  "qty_kg": 2,
  "urgency": "now",
  "fulfillment": "pickup",
  "location_id": "loc_ajou_main",
  "field_source": { "item_id": "said", "qty_kg": "asked", "urgency": "asked", "fulfillment": "asked", "location_id": "default" }
}
```

### 2.3 ConditionChips (화면 S-02용)
```json
[
  { "slot": "item_id", "label": "상추", "editable": false },
  { "slot": "qty_kg", "label": "2kg", "editable": true },
  { "slot": "urgency", "label": "지금 바로", "editable": true },
  { "slot": "fulfillment", "label": "직접", "editable": true },
  { "slot": "location_id", "label": "아주대 정문", "editable": true }
]
```

### 2.4 Ask (되묻기)
| 칸 | 타입 | 설명 |
|---|---|---|
| slot | 문자열 | `qty_kg` / `urgency` / `fulfillment` |
| question | 문자열 | 화면 문장 |
| options | 목록 | `{value, label}`. 값은 2.2 허용값 |
| allow_text | 참/거짓 | 글로 답해도 되는가(항상 참) |

선택지 고정값(WF-04):

| slot | options |
|---|---|
| qty_kg | `1`=1kg, `2`=2kg, `5`=5kg, `4`=1박스(4kg), `null`=잘 모르겠어요 |
| urgency | `now`=지금 바로, `today`=오늘 안, `tomorrow`=내일 |
| fulfillment | `pickup`=직접 갈게요, `delivery`=배달해 주세요 |

### 2.5 VendorCard (결과 카드, S-03)
| 칸 | 타입 | 설명 | 규칙 |
|---|---|---|---|
| vendor_id | 문자열 | — | — |
| name | 문자열 | 가게 이름 | — |
| kind | 문자열 | `채소가게` / `식자재마트` / `시장점포` | — |
| is_example | 참/거짓 | 예시 데이터 여부 | R-12 |
| rank | 정수 | 전체 순서(1부터) | R-09 |
| distance | 객체 | `{meters, display, walk_minutes}` 예: `{350, "350m", 5}` | R-08 |
| open_status | 객체 | `{state: "open" \| "closed", display}` 예: `"영업 중 ~20:00"`, `"지금은 닫힘 · 내일 07:00"` | R-04 |
| restock | 객체 | `{state: "restocked_today" \| "expected_today" \| "none", time, display}` | R-05 |
| delivery | 객체 | `{state: "available" \| "unavailable" \| "not_requested", display, note}` | R-07 |
| price | 객체 | `{display, per_kg_display, has_price}` 예: `"1박스(4kg) 15,000원 · 가게 안내 · 11월 3일 확인"`, `"(kg당 약 3,800원)"` / 없으면 `{"가격 정보 없음", null, false}` | R-10, R-11 |
| min_sale | 객체 | `{kg, display}` 예: `{2, "최소 2kg부터"}` / `{null, "최소 판매량 미확인"}` | R-03 |
| phone | 문자열 | 가게 공개 번호 | — |

카드에 없는 값을 만들지 않는다(R-02). 문구(`display`)는 서버가 만들어 보낸다. 앱은 그대로 그린다. 그래서 골든 케이스가 서버 응답만으로 문구까지 판정할 수 있다.

### 2.6 SearchResult
| 칸 | 타입 | 설명 |
|---|---|---|
| groups | 목록 | `{key, title, count, items: VendorCard[]}` |
| total | 정수 | 전체 카드 수 |
| empty_hint | 문자열 \| null | 0건일 때 바꿀 조건 한 줄(R-15) |

group key(R-06·R-07):

| key | title | 언제 |
|---|---|---|
| `available` | 지금 갈 수 있는 곳 / 오늘 갈 수 있는 곳 / 내일 갈 수 있는 곳 | urgency에 맞는 곳 |
| `unavailable_time` | 지금은 닫힌 곳 / 오늘은 안 여는 곳 / 내일은 안 여는 곳 | 시간이 안 맞는 곳 |
| `no_delivery` | 배달이 안 되는 곳 | fulfillment=delivery이고 배달 안 됨 |

한 판매처는 한 묶음에만 들어간다. 시간과 배달이 둘 다 안 맞으면 `unavailable_time`.

### 2.7 Notice (안내)
| 칸 | 타입 | 설명 |
|---|---|---|
| kind | 문자열 | `out_of_scope_item` / `off_topic` / `ai_failed` |
| message | 문자열 | 화면 문장 |
| recognized_item | 객체 \| null | `{item_id \| null, name}` 예: `{"item_green_onion", "대파"}` / 사전에 없으면 `{null, "고수"}` |
| actions | 목록 | `request_item`(요청 남기기) / `search_lettuce`(상추 찾기) / `edit_condition`(조건 직접 고르기) |

---

## 3. 사장님 API [MVP]

### API-06 기기 등록 — `POST /devices`
- 워크플로우: WF-01 · 기록: E-05, E-10(`app_open`)
- 헤더: `X-Device-Id`

요청
| 칸 | 타입 | 필수 | 설명 |
|---|---|---|---|
| device_id | uuid | 예 | 헤더와 같아야 함 |
| screen_width | 정수 | 아니오 | 기록용 |

응답 `200`(이미 있음) / `201`(새로 만듦)
| 칸 | 타입 | 설명 |
|---|---|---|
| device_id | uuid | — |
| is_new | 참/거짓 | — |
| location | Location | 내 위치(새 기기는 기본값) |
| business_type | 문자열 \| null | — |
| example_data | 참/거짓 | — |

오류: 400 `INVALID_INPUT`(헤더와 본문 id가 다름)
- 기록 저장소가 없으면(A8) 등록 여부를 알 수 없어 `200`, `is_new: false`, 기본 위치로 답한다.

### API-07 내 위치·업종 저장 — `PATCH /devices/me`
- 워크플로우: WF-02 · 기록: E-05, E-10(`location_set`)

요청(둘 중 하나 이상)
| 칸 | 타입 | 필수 | 허용값 |
|---|---|---|---|
| location_id | 문자열 | 아니오 | 위치 프리셋 |
| business_type | 문자열 | 아니오 | 30자 이하 |

응답 `200`: `{ location: Location, business_type }`
오류: 404 `NOT_FOUND`(없는 위치), 503 `STORAGE_UNAVAILABLE`(기록 저장소가 없거나 실패. WF-02대로 앱은 이 기기에만 적용하고 알린다)

진행 중인 결과가 있으면 앱이 이어서 API-02를 새 location_id로 부른다.

### API-14 위치 프리셋 목록 — `GET /locations`
- 워크플로우: WF-02 · 기록 없음
- 응답 `200`: `{ locations: Location[] }`

### API-01 대화 한 턴 — `POST /assist/turns`
- 워크플로우: WF-03(판별), WF-04(되묻기), WF-05(검색), WF-10(범위 밖), WF-11(무관), WF-12(실패)
- 기록: E-06(세션), E-07(턴), E-08(조건), E-09(도구 호출)
- AC: AC-5, AC-6, AC-10, AC-11, AC-15

요청
| 칸 | 타입 | 필수 | 설명 |
|---|---|---|---|
| session_id | uuid \| null | 예 | null이면 새 세션 |
| input | 객체 | 예 | 둘 중 하나 |
| input.type | 문자열 | 예 | `text` / `choice` |
| input.text | 문자열 | type=text | 1~200자 |
| input.slot | 문자열 | type=choice | 2.4의 slot |
| input.value | 문자열 \| 숫자 \| null | type=choice | 2.4의 option value |
| turn_seq | 정수 | 아니오 | 직전 응답의 turn_seq. 응답은 +1 |
| condition | 부분 조건 | 아니오 | 직전 응답의 `condition`(빈 칸은 null). 첫 턴은 생략 |
| field_source | 객체 | 아니오 | 직전 응답의 `field_source` |

v0.3(2026-11-04, C9·C10): MVP는 세션 저장소가 없어 앱이 `condition`·`field_source`·`turn_seq`를 들고 다닌다. 응답 `type=ask`에도 `condition`과 `field_source`를 넣어 돌려준다.
v0.3 구현 방식(C10): AI는 **글 입력에서만** 호출한다. 도구는 `search_vendors`(문장에서 뽑은 조건, 없으면 null)와 `give_notice`(범위 밖·무관) 두 개다. 빠진 조건의 되묻기 순서와 선택지는 AI가 아니라 서버가 정한다(AC-5를 결정적으로 지키기 위해). 선택지 응답은 AI를 부르지 않는다. 404 `NOT_FOUND`·409 `SESSION_ENDED`는 세션 저장소가 생기는 [다음]부터 적용한다.

서버 처리 순서
1. 세션 확인(없으면 생성, `ai_mode`·`model`·`prompt_version` 기록).
2. `text`면 품목 사전 검색(RAG)으로 품목 후보를 만든다. `choice`면 조건에 `asked`로 넣는다(AI 호출 없이 다음 빠진 조건이 있으면 바로 `ask` 응답).
3. AI 호출(빠진 조건 판단, 문장에서 조건 추출). 응답 형식 `ask` / `call_tool` / `notice`를 검증.
4. `call_tool`이면 내부 도구 `search_vendors`(4절)를 실행하고 결과를 만든다.
5. 턴·조건·도구 호출을 기록하고 응답.

응답 `200` — `type`에 따라 칸이 달라진다.

| 칸 | 타입 | 언제 |
|---|---|---|
| session_id | uuid | 항상 |
| turn_seq | 정수 | 항상(이번 assistant 턴 번호) |
| type | 문자열 | `ask` / `results` / `notice` |
| ai_mode | 문자열 | 항상 |
| example_data | 참/거짓 | 항상 |
| ask | Ask | type=ask |
| condition | Condition | type=ask(지금까지 채운 것, 빈 칸은 null) · type=results |
| chips | ConditionChips | type=results |
| results | SearchResult | type=results |
| notice | Notice | type=notice |

예 1 — '상추' 한 마디 → 되묻기
```json
// 요청
{ "session_id": null, "input": { "type": "text", "text": "상추" } }
// 응답
{
  "session_id": "9e21…", "turn_seq": 1, "type": "ask", "ai_mode": "live", "example_data": true,
  "ask": { "slot": "qty_kg", "question": "얼마나 필요하세요?", "allow_text": true,
           "options": [ {"value":1,"label":"1kg"}, {"value":2,"label":"2kg"}, {"value":5,"label":"5kg"}, {"value":4,"label":"1박스(4kg)"}, {"value":null,"label":"잘 모르겠어요"} ] },
  "condition": { "item_id": "item_lettuce", "qty_kg": null, "urgency": null, "fulfillment": null, "location_id": "loc_ajou_main" }
}
```

예 2 — 마지막 선택 → 결과
```json
// 요청
{ "session_id": "9e21…", "input": { "type": "choice", "slot": "fulfillment", "value": "pickup" } }
// 응답(요약)
{
  "session_id": "9e21…", "turn_seq": 4, "type": "results", "ai_mode": "live", "example_data": true,
  "condition": { "version": 1, "item_id": "item_lettuce", "qty_kg": 2, "urgency": "now", "fulfillment": "pickup", "location_id": "loc_ajou_main",
                 "field_source": { "item_id": "said", "qty_kg": "asked", "urgency": "asked", "fulfillment": "asked", "location_id": "default" } },
  "chips": [ … ],
  "results": {
    "total": 6, "empty_hint": null,
    "groups": [
      { "key": "available", "title": "지금 갈 수 있는 곳", "count": 4, "items": [
        { "vendor_id": "v_003", "name": "우만 채소", "kind": "채소가게", "is_example": true, "rank": 1,
          "distance": { "meters": 350, "display": "350m", "walk_minutes": 5 },
          "open_status": { "state": "open", "display": "영업 중 ~20:00" },
          "restock": { "state": "restocked_today", "time": "07:00", "display": "오늘 07:00 입고됨" },
          "delivery": { "state": "not_requested", "display": null, "note": null },
          "price": { "has_price": true, "display": "1kg 4,000원 · 가게 안내 · 11월 3일 확인", "per_kg_display": null },
          "min_sale": { "kg": 1, "display": "최소 1kg부터" },
          "phone": "031-000-0000" } ] },
      { "key": "unavailable_time", "title": "지금은 닫힌 곳", "count": 2, "items": [ … ] }
    ]
  }
}
```

예 3 — '대파 있어요?'
```json
{
  "session_id": "71aa…", "turn_seq": 1, "type": "notice", "ai_mode": "live", "example_data": true,
  "notice": { "kind": "out_of_scope_item", "message": "아직 상추만 준비돼 있어요. 대파가 필요하시면 알려 주세요.",
              "recognized_item": { "item_id": "item_green_onion", "name": "대파" },
              "actions": ["request_item", "search_lettuce"] }
}
```

오류
| HTTP | code | 언제 | 앱 동작 |
|---|---|---|---|
| 400 | `INVALID_INPUT` | 빈 문장, 201자 이상, 잘못된 slot·value | 입력창 안내 |
| 404 | `NOT_FOUND` | 없는 세션 | 새 세션으로 다시 |
| 409 | `SESSION_ENDED` | 끝난 세션 | 새 세션으로 다시 |
| 429 | `RATE_LIMITED` | 한도 초과 | 잠시 후 안내 |
| 503 | `AI_UNAVAILABLE` | AI 실패·한도(1.5) | 응답 `detail.condition`(지금까지 채운 조건)을 받아 칩 편집 열기 → API-02 |

503 응답의 `detail`에는 `session_id`와 지금까지의 `condition`을 넣는다. 그래서 앱이 AI 없이 검색을 이어 간다(AC-15).

### API-02 조건 검색 — `POST /search`
- 워크플로우: WF-08(칩 수정), WF-12(AI 실패 후), WF-02(위치 변경 후)
- 기록: E-08(새 버전, 바뀐 칸 `edited`), E-09(`called_by=user_edit`)
- AC: AC-1, AC-2, AC-4, AC-7~AC-9, AC-12, AC-14
- AI를 부르지 않는다.

요청
| 칸 | 타입 | 필수 | 설명 |
|---|---|---|---|
| session_id | uuid | 예 | — |
| condition | Condition | 예 | 전체 조건. `version`·`field_source`는 앱이 직전 응답 값을 그대로 보낸다(선택) |
| changed | slot 목록 | 아니오 | 이번에 칩으로 바꾼 칸. 응답의 `field_source`에서 `edited`가 된다 |

응답 `200`: `{ condition, chips, results, ai_mode, example_data }`. `condition.version`은 받은 값 + 1(없으면 1).

v0.2(2026-11-04): MVP는 서버에 세션 저장소가 없어 조건 상태를 앱이 들고 다닌다(`docs/consistency-report.md` C9). 그래서 `version`·`field_source`·`changed`를 요청에 더했다.
오류: 400 `INVALID_INPUT`, 400 `ITEM_NOT_ACTIVE`, 404 `NOT_FOUND`

### API-03 판매처 상세 — `GET /vendors/{vendorId}?item_id=&location_id=`
- 워크플로우: WF-06 · 기록: E-10(`vendor_view`) · AC: AC-4, AC-6

쿼리
| 칸 | 필수 | 설명 |
|---|---|---|
| item_id | 예 | 어느 품목의 판매 정보를 보여 줄지 |
| location_id | 아니오 | 비면 기기의 내 위치 |
| session_id | 아니오 | 기록 연결용 |
| rank | 아니오 | 결과에서 몇 번째였나(기록용) |

응답 `200`
| 칸 | 타입 | 설명 |
|---|---|---|
| card | VendorCard | 결과 카드와 같은 값 |
| address | 문자열 | — |
| dong | 문자열 | — |
| opening_hours | 목록 | 요일별 `{day, display}` 예: `{"mon", "07:00~20:00"}`, `{"sun", "쉬는 날"}` |
| delivery_dongs | 목록 \| null | — |
| delivery_note | 문자열 \| null | — |
| restock_days | 목록 \| null | — |
| restock_time | "HH:MM" \| null | 입고 시각(v0.5 추가, C6: 상세에 입고 일정을 보여 준다) |
| data_status | 문자열 | `예시` / `현장확인` / `판매처직접` |
| checked_on | 날짜 \| null | — |
| example_data | 참/거짓 | — |

오류: 404 `NOT_FOUND`(판매처 없음 또는 그 품목 판매 정보 없음), 400 `INVALID_INPUT`(item_id 없음)
- `card`는 결과 목록과 같은 함수로 만든다. 받는 방식은 묻지 않은 상태(직접)로 보므로 `delivery.state=not_requested`. 배달 정보는 `delivery_dongs`·`delivery_note`로 보여 준다(배달 안 하면 둘 다 null).
- `location_id`가 비면 기본 위치. MVP 서버는 기기 위치를 읽지 않으므로 앱이 내 위치를 늘 보낸다.

### API-04 행동 기록 — `POST /events`
- 워크플로우: WF-07(전화하기), WF-09(새 검색), WF-13 · 기록: E-10 · AC: AC-13

요청
| 칸 | 타입 | 필수 | 허용값 |
|---|---|---|---|
| client_event_id | uuid | 예 | 같은 값이 다시 오면 무시(중복 방지) |
| type | 문자열 | 예 | `call_click` / `vendor_view` / `condition_edit` / `restart` / `app_open` / `location_set` |
| session_id | uuid | 아니오 | — |
| vendor_id | 문자열 | type=call_click·vendor_view | — |
| payload | 객체 | 아니오 | 예: `{ "rank": 1, "distance_m": 350 }` |

응답 `202`: `{ accepted: true }`
- `restart`를 받으면 서버가 그 세션의 `ended_at`을 기록하고 `outcome`이 비어 있으면 `abandoned`로 둔다.
- `call_click`은 앱이 `tel:` 링크를 열기 **전에** 보낸다. 실패해도 전화는 막지 않는다.
- `vendor_view`·`condition_edit`·`location_set`는 API-03·API-02·API-07이 서버에서 직접 기록하므로 앱이 따로 보내지 않아도 된다(보내면 중복 방지로 한 번만 남는다).

### API-05 품목 요청 — `POST /item-requests`
- 워크플로우: WF-10 · 기록: E-12, E-10(`request_item`) · AC: AC-10

요청
| 칸 | 타입 | 필수 | 설명 |
|---|---|---|---|
| requested_text | 문자열 | 예 | 1~50자. Notice의 `recognized_item.name` 또는 사장님 입력 |
| matched_item_id | 문자열 \| null | 아니오 | Notice의 `recognized_item.item_id` |
| session_id | uuid | 아니오 | — |

응답 `201`: `{ request_id, message: "알려 주셔서 고마워요. 준비되면 먼저 보여 드릴게요." }`
- 같은 기기가 같은 품목을 다시 요청하면 새로 만들지 않고 `200`과 기존 `request_id`를 돌려준다(비율 계산이 부풀지 않게).
- 저장하지 못하면 저장한 척하지 않고 503 `STORAGE_UNAVAILABLE`(앱은 "다시 눌러 주세요" 안내).

---

## 3.5 v2 API (2026-11-04, 상세 근거 `docs/feature-v2.md`)

### 공통 모양
**Market(동네 시세, R-18)**
```json
{ "item_id": "item_lettuce", "per_kg": { "low": 3000, "median": 3800, "high": 4200 }, "samples": 6, "includes_example": true, "display": "이 동네 상추 kg당 3,000~4,200원 · 중간 3,800원 · 6건 기준(예시 포함)" }
```
표본 3건 미만이면 `per_kg: null`, `display: "아직 비교할 정보가 적어요"`.

**PriceLine(진단 한 줄)**
| 칸 | 타입 | 설명 |
|---|---|---|
| line_no | 정수 | — |
| raw_name | 문자열 | 영수증에 적힌 이름(응답에만, 저장 안 함 R-21) |
| item_id / item_name | 문자열 \| null | 품목 사전에 맞춘 값 |
| qty_kg | 숫자 \| null | 환산 무게(kg). 모르면 null |
| amount_won | 정수 | 줄 금액(배송비 제외 R-17) |
| price_per_kg | 정수 \| null | R-16. 비교 불가면 null |
| comparable | 참/거짓 | — |
| reason | 문자열 \| null | 비교 못 하는 이유: "단위를 알 수 없어요" / "아직 상추만 비교해요" / "아직 비교할 정보가 적어요" |
| verdict | `cheaper` / `normal` / `pricier` \| null | R-19 |
| verdict_display | 문자열 \| null | 예: "동네 중간 3,800원보다 32% 비싼 편" |
| cheaper | VendorCard[] | R-20, 최대 3 |

**PriceCheck(진단 결과)**: `{ check_id, source: "text"|"photo", doc_type, seller_type, purchased_on, delivery_fee_won, lines: PriceLine[], market: Market|null, message: 문자열|null, example_data, ai_mode }`. `message`는 진단할 줄이 없을 때의 안내(영수증 아님, 구매 내역 못 찾음, 양·금액 빠짐).

### API-01 확장 — 가격 한 줄
- AI 도구에 `check_price {item_id, qty_kg|null, amount_won|null}`를 더한다. AI가 이 도구를 고르면 응답 `type: "price_check"`, 칸 `price_check: PriceCheck`(source=text).
- 양이나 금액이 없으면 진단하지 않고 `price_check.lines: []`, `message: "양과 금액을 같이 적어 주세요. 예: 상추 2kg 1만원"`(v0.8: 되묻기 대신 안내. 되묻기 답이 글이라 다시 AI를 거쳐야 하고, 품목 없는 "2키로"를 해석할 수 없음 C16).
- 범위 밖 품목 가격이면 기존 범위 밖 안내(R-13).

### API-15 사진 진단 — `POST /price-checks`
요청: `{ image: { media_type: "image/jpeg"|"image/png"|"image/webp", data: base64 }, session_id?: uuid, location_id?: 문자열 }` (사진 3MB 이하 = base64 약 4MB. Vercel 함수 본문 한도 4.5MB. 파일 앞부분으로 실제 이미지인지 확인)
응답 `200`: PriceCheck(source=photo). 영수증이 아니면 `doc_type: "not_receipt"`, `lines: []`.
오류: 400 `INVALID_INPUT`(이미지 아님·너무 큼), 503 `AI_UNAVAILABLE`(읽기 실패·한도), 429 `RATE_LIMITED`.
저장: price_checks + price_check_lines(사진·원문·raw_name 저장 안 함, R-21). AI 호출 1회로 센다.

### API-16 시세에 보태기 — `PATCH /price-checks/{checkId}`
요청 `{ share: true }` → 응답 `200 { shared_lines: 정수 }`. 같은 기기가 만든 진단만. 비교 가능한 상추 줄만 `shared=true`.
오류: 404 `NOT_FOUND`(없거나 다른 기기), 503 `STORAGE_UNAVAILABLE`.

### API-17 동네 시세 — `GET /market?item_id=&location_id=`
응답 `200`: Market. API-01·API-02 결과 응답에도 `market` 칸으로 같이 싣는다.

### API-18 지도용 가게 — `GET /stores?location_id=&bbox=minLng,minLat,maxLng,maxLat&item_id=`
`location_id`(거리 기준, 비면 기본 위치), `bbox`·`item_id`는 선택(v0.9). 응답 `200`: `{ location_id, stores: Store[] }`(거리순), `Store = { store_id, kind: "vendor"|"public", name, category, address, lat, lng, distance_m, vendor_card?: VendorCard, source?: "소상공인시장진흥공단 상가(상권)정보", source_date?: "YYYY-MM-DD" }`. 판매처는 `vendor_card`가 있고, 공공데이터 가게는 가격·입고·번호가 없다(R-22).

## 4. 내부 도구 `search_vendors` (AI 전용, 외부 API 아님)

AI가 호출하고 서버가 실행한다. API-02와 **같은 검색 함수**를 쓴다.

| 인자 | 타입 | 필수 | 허용값 |
|---|---|---|---|
| item_id | 문자열 | 예 | 이번 턴 품목 후보 중 active |
| qty_kg | 숫자 | 아니오 | 0.5~50. 말하지 않았으면 생략 |
| urgency | 문자열 | 예 | now / today / tomorrow |
| fulfillment | 문자열 | 예 | pickup / delivery |

- `location_id`는 AI가 넘기지 않는다. 서버가 기기 설정으로 채운다.
- 설명 문장(모델용): "사장님이 찾는 품목과 조건이 모두 정해졌을 때, 조건에 맞는 근처 판매처를 찾는다."
- 반환(AI에 돌려주는 값): `{ total, top_vendor_ids }`. AI는 이 값을 화면 문장으로 꾸미지 않는다. 화면 결과는 서버가 API-01 응답에 직접 넣는다(R-02).
- 인자 오류는 `invalid_input`으로 AI에 돌려 1번 다시 부르게 한다. 두 번째도 틀리면 503(WF-05).

---

## 5. 운영자·판매처 API [다음]

### API-08 운영자 로그인 — `POST /admin/login`
요청 `{ password }` → 응답 `200 { token, expires_at }` / 401 `UNAUTHORIZED`

### API-09 판매처·판매 정보 관리
| 메서드 · 경로 | 하는 일 | 요청 요지 | 응답 | 기록 |
|---|---|---|---|---|
| `GET /admin/vendors?data_status=&q=` | 목록 | 필터 | 판매처 목록(상세 칸 전부) | — |
| `POST /admin/vendors` | 새 판매처 | E-02 칸 | 만든 판매처 | E-02, E-11 |
| `PATCH /admin/vendors/{vendorId}` | 판매처 수정 | 바꿀 칸만 | 수정된 판매처 | E-02, E-11 |
| `PUT /admin/vendors/{vendorId}/offers/{itemId}` | 판매 정보 만들기·고치기 | E-03 칸 | 판매 정보 | E-03, E-11 |
| `POST /admin/field-checks` | 현장 확인 기록 | E-13 칸. `consent=false`면 값 칸 무시 | 기록 + `secured`(서버 계산) | E-13, 동의·확인된 값은 E-02·E-03(`현장확인`)·E-11 |
| `GET /admin/field-checks/summary` | 합격선 확인 | — | `{ visited, secured, pass: secured/visited ≥ 3/4 }` | — |
| `PATCH /admin/items/{itemId}` | 품목 열기·닫기 | `{ active }` | 품목 | E-01 (WF-18, prompt_version 갱신 안내) |
| `POST /admin/usability-tests` | 사용자 테스트 기록 | E-15 칸 | 기록 | E-15 |

검증: E-02·E-03의 필수·허용값을 그대로 적용. 좌표는 위도 -90~90, 경도 -180~180. 가격이 있으면 단위·출처·확인일도 있어야 저장(R-10과 같은 조건).

### API-10 갱신 링크
| 메서드 · 경로 | 하는 일 | 응답 |
|---|---|---|
| `POST /admin/vendors/{vendorId}/update-links` | 발급 `{ expires_at? }` | `201 { link_id, url }` — url은 이때 한 번만 |
| `DELETE /admin/update-links/{linkId}` | 폐기 | `204` |

서버는 비밀값 원문을 저장하지 않는다(E-14 `token_hash`).

### API-11 판매처 직접 갱신
| 메서드 · 경로 | 하는 일 | 요청 | 응답 |
|---|---|---|---|
| `GET /vendor-link/{token}` | 갱신 화면 정보 | — | 가게 이름, 품목별 현재 값(입고 시간·가격·단위·판매 중), 오늘 휴무 여부 |
| `PATCH /vendor-link/{token}` | 갱신 | 아래 중 필요한 것 | 갱신된 값 |

PATCH 요청 칸
| 칸 | 타입 | 설명 |
|---|---|---|
| restocked_today | 참 | '오늘 입고됐어요' → `last_restocked_on=오늘` |
| item_id | 문자열 | 값을 바꿀 품목(아래 칸에 필요) |
| restock_time | 시각 | — |
| price, price_unit_label, unit_kg | — | 함께 오면 출처 `판매처직접`, 확인일 오늘 |
| available | 참/거짓 | 판매 중 여부 |
| closed_today | 참/거짓 | 오늘 쉬어요(E-11에 기록, 오늘만 영업 안 함으로 판정) |

오류: 403 `LINK_REVOKED` / `LINK_EXPIRED`, 400 `INVALID_INPUT`
기록: E-03, E-11(`actor=vendor_link`), E-14(`last_used_at`)

### API-12 기록 내보내기 — `GET /admin/exports`
쿼리: `from`, `to`(날짜), `exclude_test`(기본 참), `kind`(`turns` / `conditions` / `tool_calls` / `events` / `item_requests` / `usability_tests` / `metrics`), `format`(`json` / `csv`)

`kind=metrics` 응답
```json
{
  "devices_tested": 5,
  "devices_requested_other_item": 3,
  "expansion_request_ratio": 0.6,
  "sessions": 12,
  "sessions_with_call_click": 7,
  "usability": { "chose_vendor": 4, "reason_distance_or_restock": 4 }
}
```
확장 요청 비율 = 요청을 1번 이상 남긴 기기 ÷ 테스트한 기기(E-05 `is_test=false`, E-15와 연결된 기기).

### API-13 음성 → 글자 — `POST /stt` [다음]
- `multipart/form-data`: `audio`(최대 10초, webm/m4a/wav), `session_id`(선택)
- 응답 `200 { text, provider, confidence? }`. 앱은 결과를 입력창에 넣고 사장님 확인 뒤 API-01로 보낸다(WF-20).
- 제공자는 비교 실험 후 정한다(개발기획서 WF-20).

---

## 6. 수용 기준과 API 대응

| AC | 확인하는 API | 판정 방법 |
|---|---|---|
| AC-1 최소 판매량 | API-02 | qty_kg 1 → A 없음, 2 → A 있음 |
| AC-2 배달 지역 | API-02 | B가 `no_delivery` 묶음, `delivery.state=unavailable` |
| AC-4 가격 표시 | API-02, API-03 | C `price.display`·`per_kg_display` 문자열 일치, D `"가격 정보 없음"` |
| AC-5 되묻기 순서 | API-01 | '상추' → ask.slot qty_kg → urgency → fulfillment. '상추 2키로 급해요' → 첫 ask.slot이 fulfillment |
| AC-6 지어내지 않기 | API-01~03 | 응답의 모든 값이 데이터 파일에 있음(골든), AI 문장에 가게·가격 없음(evals) |
| AC-7 영업 판정 | API-02 + `X-Debug-Now` | 21:00에 E가 `unavailable_time`, `"지금은 닫힘 · 내일 07:00"` |
| AC-8 입고 판정 | API-02 + `X-Debug-Now` | F `restocked_today`, G `expected_today` 15:00 |
| AC-9 정렬 | API-02 | `rank` 순서가 R-09와 같음 |
| AC-10 범위 밖 | API-01, API-05 | type=notice, 도구 호출 0회(E-09 없음), 요청 1건 |
| AC-11 무관한 말 | API-01 | notice.kind=off_topic, 도구 호출 0회 |
| AC-12 0건 | API-02 | total=0, empty_hint 있음 |
| AC-13 전화하기 | API-04 | E-10 `call_click` 1건, 같은 client_event_id 두 번이면 1건 |
| AC-14 칩 수정 | API-02 | AI 호출 0회, 결과가 AC-1과 같음 |
| AC-15 AI 실패 | API-01 + 지연시키는 가짜 AI | 503 `AI_UNAVAILABLE`, detail.condition 있음 → API-02 성공 |
| AC-16 데이터 형식 | (API 아님) 데이터 검사 스크립트 | 필수 칸 누락·허용값 밖이면 실패 |

---

## 7. 변경 기록

| 날짜 | 내용 |
|---|---|
| 11/05 | v0.9: API-18에 `location_id` 쿼리, 응답에 `location_id`, 거리순 명시 |
| 11/05 | v0.8: PriceCheck에 `message`, check_price 빠진 값은 되묻기 대신 안내(C16), 사진 3MB 상한 |
| 11/04 | v0.7: v2 API-15~18, API-01 `check_price`·`price_check` 응답, Market·PriceLine·PriceCheck 모양(feature-v2) |
| 11/04 | v0.6: 1.5 한도 구현(P2-2). 세션 6회 초과 동작을 503 경로로 바꿈(C13). 한도는 기록 저장소가 있을 때만 적용(A4) |
| 11/04 | v0.5: API-03에 `restock_time` 추가, API-03 카드·위치 기본값 규칙 명시, API-07에 503 `STORAGE_UNAVAILABLE` |
| 11/04 | v0.4: 오류 코드 503 `STORAGE_UNAVAILABLE`(API-05) 추가, API-06의 저장소 없음 동작 명시(C12). API-04는 기록 실패여도 202 |
| 11/04 | v0.3: API-01 요청에 `turn_seq`·`condition`·`field_source` 추가, AI 호출 범위·도구 2개·404/409 보류 명시(C9·C10).
| 11/04 | v0.2: API-02 요청에 `condition.version`·`field_source`, `changed` 추가(C9).
| 11/04 | v0.1 작성. API-14(위치 목록) 추가. 오류 코드·한도·개발용 헤더·응답 공통 칸 정의 |
