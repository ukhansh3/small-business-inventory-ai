# PUT /api/v1/saved/vendors/{vendorId} — 업체 저장

**상태:** S-01/02/08 기반 제안 / 미구현.

## Request
- `vendorId`: UUID 경로값. 본문 없음.
- 서버 인증된 시연 세션의 내부 actor를 사용. `data_kind`를 body에서 임의 지정하게 하지 않음: 서버가 ID 출처를 확인.

## Response
`200 {"vendor_id":"<UUID>","is_saved":true,"saved_at":"<ISO8601>"}`. `<UUID>`/`<ISO8601>`은 형식 자리표시자.

## 권한·동작
- 존재하고 **현재 조회 가능**한 공개 승인 업체 또는 시연 업체만 북마크 가능.
- UNIQUE `(demo_session_id,actor_id,vendor_source,vendor_id)`; 반복 PUT 멱등, 기존 `saved_at` 유지.
- 실업체 `vendors` / `vendor_items` 데이터를 쓰지 않고 시연 `demo_vendor_saves`에만 기록.
- UUID 충돌 방지를 위해 출처(`live`/`synthetic_demo`)는 서버 검증하여 별도 저장하고 조회에 함께 반영.
- 오류: 401 세션 만료, 404 업체 부재/미공개/다른 세션, 422 ID 형식, 503 DB 장애.

## 테스트
반복 PUT 한 개만 생성, 서로 다른 시연끼리 독립, 타 세션 업체 쓰기 거부, 본문 위조·출처 위조 거부, 저장 탭/상세 UI 정합성.
