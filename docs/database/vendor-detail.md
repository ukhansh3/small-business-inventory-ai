# DB-VENDOR-DETAIL-001 — 업체 상세 조회와 저장의 경계

- 상태: **현재 main migration 기반 설명 + 승인된 제품 요구사항**
- DB 정본: `supabase/migrations/202610280001_vendor_registration.sql`
- 실제 공개 업체 상세: `GET /api/v1/vendors/{id}` → `public.get_published_vendor`

## 기존 정보의 위치

| 데이터 | 기존 근거 | 새 스키마 여부 |
|---|---|---|
| 업체 ID·공개 여부 | `public.vendors` current revision/hidden | 필요 없음 |
| 이름·유형·주소·영업시간·연락처·설명·좌표·배송 조건 | `public.vendor_revisions` 현재 승인본 | 필요 없음 |
| 품목명·규격·수량·가격·부가세·최소 주문 수량·배송비·확인일 | `public.item_revisions` 공개 가능한 판매 품목 | 필요 없음 |
| 이미지 ID | `public.vendor_images` 승인본 참조 | 필요 없음 |
| 업체 저장 | **별도 saved-vendors 기능에서 설계** | 미래 추가/시연 저장소 필요 가능 |
| 가상 업체 상세 | 별도 synthetic/mvp demo 데이터 원본 | 기존 공개 RPC와 혼동 금지 |

## 승인된 불변조건

- 상세 조회는 승인된 현재 공개 정보만 반환하며 숨김/승인 대기 버전·내부 운영 메모를 공개하지 않는다.
- 가상 시연 정보는 실제 업체 직접 제공 가격으로 반환하지 않고 data_kind/안내로 구분한다.
- 지도 검색어에 따른 품목 순서 변경은 **클라이언트 표현 정책**이므로 그 자체로 DB 변경이 필요하지 않다.
- 업체 저장 토글은 실제 업체 마스터 테이블에 저장 여부를 기록하는 식으로 구현하지 않는다. 시연 세션별 분리 데이터를 사용하며 데모 초기화도 해당 분리 저장소만 대상으로 한다.
- 기존 적용 migration을 수정하지 않는다. 데이터 구조 변경은 새 migration과 관련 API/DTO/테스트를 함께 검토한다.

## 현재 계약의 제약

- `publishedVendorSchema`의 `price`, `quantity`, `minimum_packages`, `checked_on`은 실제 공개 응답에서 필수 값. `delivery_fee`는 `null` 허용.
- 실제 공개 DTO에서 가격 null을 지원한다고 가정하지 않는다. 미확인 가격 표시 요구는 **다른 데모 데이터 계약** 또는 별도의 승인된 DTO 확장 시에만 실제로 적용할 수 있다.
- `source_type`은 실제 공개 가격에서 `vendor_provided`; 시연 타입이 이 필드를 가장하여 반환하면 안 된다.
- 사용자 로그인 UI 없는 자동 시연은 현재 auth.uid() 제약과 다르므로 안전한 별도 시연 세션 경계가 필요.

## 테스트

- 공개 승인 업체의 상세, 숨김/미승인 업체의 상세 거부.
- 가격·배송비 null/0 차이, 세금 종류별 표시 정확성.
- 다른 시연 사용자의 저장 목록에 접근/수정 불가.
- 시연 데이터 초기화는 실제 업체·revision·이미지·운영자 권한에 영향 없음.
