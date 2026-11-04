# API-AI-POST-MESSAGES — POST /api/v1/ai/messages (제안)

- **구현 상태:** 미존재 (2026-11-04 main 코드 확인)
- **제품 목적:** 자연어 요청에서 검색 조건을 추출 → 실제 서버 업체 조회 → **근거 기반** 서술과 추천 업체 카드 반환.
- **사용자 승인 근거:** AI-01~AI-09. 경로/필드/모델은 **제안 계약**.

## 요청 초안
```json
{
  "threadId": "<server-issued thread UUID or null>",
  "clientMessageId": "<idempotency UUID>",
  "message": "근처에 양파 10kg 배송되는 곳 찾아줘",
  "context": {
    "appliedMapBounds": {"south": 37.27, "west": 127.03, "north": 37.30, "east": 127.06},
    "mapQuery": "",
    "mapFilters": {}
  }
}
```
- 설명용 좌표이며 **확정된 서버 필드가 아니다**. `appliedMapBounds`가 없을 때 지역 fallback 처리 방식은 시연 세션/지도 계약과 연결하여 확정.
- `threadId`는 같은 세션의 서버 발급 ID만 허용, 임의 UUID를 권한 없이 읽거나 생성하지 않음. 인증 토큰/세션은 HTTP 인증 영역에서 전달.
- 입력은 Unicode·길이·과도한 반복·빈 문자열 검증. 메시지 길이·최대 대화 길이·토큰 예산은 기술 설계에서 정한다.

## 성공 응답 초안
```json
{
  "threadId": "<thread UUID>",
  "messageId": "<assistant message UUID>",
  "answer": "조건에 맞는 공개 업체를 검색했습니다. 배송 상세 조건은 업체에 확인해 주세요.",
  "searchStatus": "results",
  "matchedIntent": {"itemName": "양파", "quantity": 10, "unit": "kg", "deliveryRequested": true},
  "results": [
    {
      "vendorId": "<actual returned vendor UUID>",
      "dataKind": "live",
      "vendorName": "<actual returned approved vendor name>",
      "itemId": "<actual returned public item UUID>",
      "itemName": "<actual public item name>",
      "specification": "10kg",
      "priceKrw": 18000,
      "tax": "included",
      "deliveryFeeKrw": null,
      "deliveryTerms": "<public source value>",
      "checkedOn": "2026-10-07",
      "latitude": 37.2834,
      "longitude": 127.0465,
      "source": "published_vendor"
    }
  ]
}
```
**JSON에 있는 값은 예시이고 실제 업체/가격이라는 뜻이 아니다.** 실제 가격·업체명은 서버 조회 결과와 대조해 생성. `results[].priceKrw`는 확인된 거래 가격만, 미확정 값은 계약에 따라 `null` 사용; 임의 최저가 생성 불가.

## 처리 순서
1. 인증된 시연 세션 식별, thread 소유권 검증, idempotency 키 중복 처리.
2. 요청 컨텍스트의 지도 영역을 서버 정책 범위로 검증(잘못된/초과 bounds 거부).
3. LLM 또는 구조화 파서를 이용해 `itemName`, `quantity`, `unit`, 가격 예산, 배송 조건을 추출; 명확하지 않은 제약은 확인 질문 상태로 돌려보냄.
4. **서버 검색**: 마지막 적용 지도 영역 기준 공개 업체 + 구분되는 시연 데이터 조회. 미승인/숨김/타 세션 자료 제외.
5. 단위/과세/배송비 기준을 검증해 가격 비교 가능성 결정. 비교 불가능하면 순위 추천/총액 비교를 하지 않음.
6. 검색 결과를 스키마 검증된 카드로 직렬화하고 모델에게는 사실 레코드의 설명 범위만 허용. 모델이 반환한 새 금액/업체 ID를 그대로 노출 금지.
7. 대화/검색 근거를 동일 시연 세션에 보존하고 응답 반환.

## 에러·상태
| 상태 | 조건 | UI 처리 |
|---|---|---|
| `results` | 검증된 결과 1건 이상 | 근거/출처가 있는 추천 카드 |
| `no_results` | 조건에 일치하는 공개 자료 0건 | 조건 수정 제안; 가짜 카드 생성 금지 |
| `clarification_needed` | 필수 의도 모호 | 확인 질문, 미확정 필드 추측 금지 |
| `422 INVALID_INPUT` | 잘못된 body / 지도 경계 | 입력값 안내 |
| `401 UNAUTHENTICATED` | 유효한 시연 세션 없음 | 사용자에게 로그인 요구 대신 안전한 시연 세션 복구 흐름 |
| `403 FORBIDDEN` | 남의 thread ID | 접근 차단 |
| `429 RATE_LIMITED` | 호출량 제한 | 재시도 안내 |
| `503 MODEL_UNAVAILABLE` | 모델 실패 | 모델 오류 안내, 가능하면 검증된 조회 폴백 |
| `503 DATABASE_UNAVAILABLE` | 근거 검색 실패 | 결과 없음과 구분, 재시도 |

## 계약/데이터 검증
- 기존 `packages/vendor-contracts/index.ts`에 신규 Zod request/response schema를 **후속 구현에서** 추가한다. 문서 예시만으로 실구현 계약이라고 가정 금지.
- 기존 `GET /api/v1/vendors`는 원형 반경·20건 제한·Bearer 인증이므로, bounds+전체 결과 검색을 위한 계약과 동기화가 먼저 필요.
- **수용:** AI가 없는 가격을 임의 생성하지 않음, 출처 구별, 스키마 검증, 세션 격리, 여러 턴 문맥 유지, 만료/중복 요청 처리.
