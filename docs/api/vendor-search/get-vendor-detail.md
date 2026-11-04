# API-SEARCH-002 — GET /api/v1/vendors/{id}

- 상태: **현재 main 코드 확인**
- 코드: `apps/cheonhajangsa/app/api/v1/vendors/[id]/route.ts`
- DTO: `publishedVendorSchema` (`packages/vendor-contracts/index.ts`)
- DB RPC: `public.get_published_vendor`

## 목적
검색/지도에서 선택한 업체의 현재 승인된 공개 정보를 한 건 조회한다.

## 요청
`GET /api/v1/vendors/00000000-0000-4000-8000-000000000001`

- Path `id`: UUID 필수(표시한 UUID는 예시).
- **현재** `Authorization: Bearer <Supabase access token>` 필요.
- 요청 본문 없음.

## 200 응답
`publishedVendorSchema` 단일 객체. 필수 업체 필드: `id`, `revision_id`, `name`, `description`, `category`, `contact`, `address`, `latitude`, `longitude`, `opening_hours`, `fulfillment`, `delivery_terms`, `items[]`, `image_ids[]`, `data_kind: "live"`. 선택적으로 `distance_m`이 포함될 수 있으나 상세 응답에 거리 표시를 가정하지 않는다.

품목 `items[]`는 가격·수량·규격·세금·최소 주문 수량·배송비(미확인 시 null 가능)·가격 확인일·출처를 포함한다. 배송비가 null이면 무료라고 표시하지 않는다.

## 오류
- 401: 로그인 누락/무효
- 404 `NOT_FOUND`: 없거나 비공개·미승인 등 접근 가능한 공개본 없음
- 422 `INVALID_INPUT`: 잘못된 UUID
- 503: 인증/DB/계약 장애
- 500: 기타 내부 오류

## 화면 연결
- 지도 핀 탭만으로 이 API를 반드시 호출할 필요는 없다. 검색 응답에 카드 정보가 이미 있다.
- 하단 `업체 상세 보기` 탭 시 이 엔드포인트로 상세 조회를 수행한다.
- 중간에 업체가 숨김/비공개 전환되면 404 안내 후 이전 화면으로 돌아갈 수 있어야 한다.

## 별도 정책
시연용 업체와 실제 승인 업체의 상세 API 경로 및 식별자 분리는 `demo` 데이터 설계에서 별도 결정해야 하며 이 API가 그 역할까지 수행한다고 가정하지 않는다.

## Q-DETAIL-01~08 사용자 승인 후 화면/계약 연결 (v2.1)
- 사용자 승인: 기본 정보, 취급 품목과 상세 가격·배송 조건, 저장/전화/지도 이동, 검색어 일치 품목 우선, 미확인 안내, 시연 출처 구분, 주문/결제 제외.
- **기존 GET 계약은 유지.** UI 표시 정렬·전화·지도 복귀·저장 액션이 곧 새 상세 API 필드/엔드포인트 승인을 뜻하지 않음.
- 실제 공개 vendor DTO는 `price`/`quantity`/`minimum_packages`/`checked_on` 필수. `delivery_fee`는 null 가능. `price=null` 응답으로 간주 금지.
- `GET /api/v1/vendors/{id}`는 현재 Bearer 인증이 필요하므로 로그인 없는 시연 UX를 위해 자동 세션 등 인증 연결과 시연 DTO 분리를 별도 설계해야 함.
- 저장은 별도 저장 기능의 API/DB 명세에서 정의하고 실제 공개 업체 수정 API와 혼동하지 않는다.
- UI 정본: `docs/ui/screens/vendor-detail.md` / 기능 정본: `docs/features/vendor-detail.md`.
