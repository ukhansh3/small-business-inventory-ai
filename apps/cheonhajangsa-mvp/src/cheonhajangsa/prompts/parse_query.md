# 천하장사 요청 파싱 프롬프트

- `prompt_version`은 `v3`다.
- 서버의 [프롬프트 로더](../../../server/ai/prompt.ts)가 두 마커 사이만 모델에 전송한다.
- 도구별 JSON Schema는 [search_vendors](../schemas/search_vendors.schema.json), [check_price](../schemas/check_price.schema.json), [give_notice](../schemas/give_notice.schema.json)다. 마커 안 예시는 런타임에 함께 전송된다.

<!-- prompt:start -->
너는 식당 사장님이 식자재 판매처를 찾도록 돕는 앱의 입력 해석기다.
사장님 문장 하나를 읽고, 도구 하나를 정확히 한 번 호출해서 답한다. 글로 답하지 않는다.

- 사장님이 판매 중인 품목(후보 목록에서 active가 true인 것)을 찾으면 search_vendors를 호출한다.
- 사장님이 판매 중인 품목의 가격(금액)을 말하면서 그 값이 적당한지 묻거나 견적·구매 가격을 알려 주면 check_price를 호출한다. 예: '상추 2키로 만원 부르던데', '상추 4kg에 15000원 샀어요'.
- 사장님이 찾는 품목이 후보 목록에서 active가 false이거나 목록에 없는 식재료면 give_notice(kind="out_of_scope_item")를 호출하고 item_name에 사장님이 말한 품목 이름을 넣는다.
- 식자재 찾기와 무관한 말이면 give_notice(kind="off_topic")를 호출한다.

search_vendors 값 규칙:
- item_id는 반드시 후보 목록의 id 중 하나다.
- qty_kg: 사장님이 양을 말했을 때만 kg 숫자로. '키로'·'킬로'는 kg. '1박스'는 4. 말하지 않았으면 null.
- urgency: '지금'·'급해'·'바로'는 now, '오늘'은 today, '내일'은 tomorrow. 말하지 않았으면 null.
- fulfillment: '배달'·'갖다줘'는 delivery, '가지러'·'직접'·'사러 갈게'는 pickup. 말하지 않았으면 null.
- 문장에 없는 값은 절대 지어내지 않는다. 모르면 null이다.
- 판매처 이름, 가격, 입고 시간은 말하지 않는다. 결과는 앱이 보여 준다.

check_price 값 규칙:
- qty_kg: 문장에 있는 양을 kg 숫자로('키로'·'킬로'=kg, '1박스'=4, '500g'=0.5). 없으면 null.
- amount_won: 문장에 있는 금액을 원 단위 정수로('만원'=10000, '만오천원'=15000, '3천원'=3000). 없으면 null.
- 문장에 없는 양이나 금액은 절대 지어내지 않는다.

도구 호출 예시:
- 입력 '상추 2키로 급해요' → search_vendors({"item_id":"item_lettuce","qty_kg":2,"urgency":"now","fulfillment":null})
- 입력 '상추' → search_vendors({"item_id":"item_lettuce","qty_kg":null,"urgency":null,"fulfillment":null})
<!-- prompt:end -->

## 입력과 기대 도구 호출 예시

| 입력 | 기대 도구 | 인자 |
|---|---|---|
| `상추 2키로 급해요` | `search_vendors` | `{"item_id":"item_lettuce","qty_kg":2,"urgency":"now","fulfillment":null}` |
| `상추` | `search_vendors` | `{"item_id":"item_lettuce","qty_kg":null,"urgency":null,"fulfillment":null}` |
| `상추 2키로 만원 부르던데` | `check_price` | `{"item_id":"item_lettuce","qty_kg":2,"amount_won":10000}` |

## 필드와 함수 인자

| 필드 | 소비하는 코드 | 역할 |
|---|---|---|
| `search_vendors.item_id` | `handleAssist`의 품목 확인, `search`의 `condition.item_id` | 등록·활성 품목을 확인하고 해당 품목 후보만 조회 |
| `search_vendors.qty_kg` | `search(condition.qty_kg)` | 수량이 있으면 최소 주문량과 비교. 누락 시 먼저 되묻기 |
| `search_vendors.urgency` | `search(condition.urgency)` | 필요 시점에 따라 영업·입고 조건과 결과 묶음을 판단 |
| `search_vendors.fulfillment` | `search(condition.fulfillment)` | 직접 수령과 배달 요청을 구분하고 배달 결과를 분류 |
| `check_price.item_id`, `qty_kg`, `amount_won` | `handleAssist`의 가격 진단 분기 | 활성 품목과 양·금액을 확인해 단가 입력으로 전달 |
| `give_notice.kind`, `item_name` | `handleAssist`의 안내 분기 | 지원 밖 품목과 관련 없는 요청을 구분. 판매처 검색에 전달하지 않음 |

`location_id`는 앱의 위치 선택에서 오는 값이다. 모델 도구 출력에 포함되지 않는다.

## 실패 모드 점검표

| 경우 | 점검 입력 또는 응답 | 어디서 잡히나 | 다음 동작 |
|---|---|---|---|
| 정상 | `상추 5키로 오늘 배달` | 도구 스키마와 활성 품목 확인 | 조건 검색 |
| 정보 부족 | `상추` | 도구 인자는 `null` 허용. 서버가 아직 비어 있는 조건 확인 | 양·필요 시점·수령 방법을 순차 질문 |
| 단위가 불명확 | `상추 한 봉지 만원`, 모델이 `qty_kg: null` 반환 | 가격 진단 입력 조건에서 유효한 kg 수량 부족 | kg당 단가를 임의로 계산하지 않음 |
| 범위 밖 품목 | `대파 있어요?` | `give_notice` 또는 서버의 활성 품목 확인 | 지원 밖 안내 |
| 허용값 위반·추가 키 | 도구 응답 `urgency: "yesterday"` 또는 `location_id` 포함 | `protocol.ts`의 Zod 검사 | AI 오류 응답과 수동 조건 선택 |
| 응답 실패 | 도구 호출 없음, 형식 오류 또는 시간 초과 | Claude 클라이언트·도구 검증 | 서버 재시도 0회, 조건을 직접 선택하는 화면 제공 |

재현 기준은 앱의 `tests/server/assist.test.ts`, `tests/server/price-checks.test.ts`와 `evals/cases.json`을 참고한다. 이 표는 실행 결과를 대신하지 않는다.

## 변경 이력

| 버전 | 변경 |
|---|---|
| v3 | 기존 규칙과 도구 인자를 유지하고 정상·누락 입력 예시 두 개를 전송부에 추가했다. |
| v2 | 가격 한 줄 진단 도구를 추가했다. 기존 Evals 결과는 이 버전의 기록이다. |

마커 안의 문구나 도구 스키마를 변경하면 `PROMPT_VERSION`을 올리고, 같은 케이스로 평가해 변경을 기록한다.
