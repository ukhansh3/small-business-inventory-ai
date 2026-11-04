# API 공통 계약 — 설계 정렬 문서

- 현재 구현 = 공유 Zod/Route Handler/적용 DB RPC. `docs/api/openapi.yaml`은 **이번 시연을 위한 PROPOSED 통합 목표안**으로, 실제 서버가 지원한다고 주장하지 않는다.
- Prefix `/api/v1`, JSON UTF-8, `Content-Type: application/json`, 모든 쓰기 `Cache-Control: private, no-store`.
- 인증: 사용자 로그인 페이지는 없지만 서버가 확인한 비대화형 시연 세션/Bearer 유지. `sessionId`, `actorId`, `isAdmin` 등 client-supplied 값으로 인증하지 않음.
- 응답 성공 코드: 목록/상세 200, 생성 201, 멱등 설정 PUT 200, 수정 PATCH 200, 삭제 DELETE는 게시글·댓글 204(no body), 좋아요·게시글 저장·업체 저장 해제는 기존 개별 명세에 맞춰 200(해제 상태 JSON).
- 표준 오류: `{error:{code,message,requestId,fieldErrors?}}`. 에러 본문에 secret/PII/SQL/타인 세션 존재 여부 금지.
- 페이지: 커뮤니티/저장 cursor, 지도 업체 목록은 안정 정렬+20개 page; 경계 조건·데이터 변경 시 스냅샷 정책 구현 전 검증.
- 가격 `null`을 0원/무료로 표시 금지. 실제 published DTO의 price는 필수 양수이며 가상/미확인은 데이터 출처별 계약으로 분리.
- 시연 자료/원본 공개 업체의 ID/출처가 충돌해도 중복/변조되지 않게 `(source,id)`로 구별.
- PUT/DELETE 재전송 멱등. AI/게시글 POST는 client idempotency UUID 검증 권고.
- 과도한 범위/크기/요청/토큰 비용은 서버에서 제한하되 **상한값은 기술 제안**. 사용자가 승인한 '지도 전체 결과'를 조용히 일부로 줄이지 않음.

## 구현 체크 포인트
1. `docs/api/openapi.yaml` → Zod schema 및 HTTP Route와 일치 검증(현재 미실행).
2. 서버→모바일 응답 DTO/nullable 일치, 권한별 401/403/404/422/429/503 처리.
3. DB RPC와 RLS는 루트 `AGENTS.md`의 승인 게이트 통과 후만 적용.
