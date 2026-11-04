# API-COMMUNITY — 시연 관리자 신고 큐 조회

**제안 엔드포인트:** `GET /api/v1/community/moderation/reports`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
`status=pending|resolved|all`(기본 pending), `cursor?`, `limit?`.

## 성공 응답
`200 Page<ModerationReport>`: 신고와 대상 글 요약, 처리 상태.

## 서버·권한·데이터 규칙
현재 시연 범위 moderator에게만 노출. 일반 데모 멤버에 역할/타인 신고 개인정보 미노출. 공개 운영 staff_roles와 별개.

## 오류
401; 403 관리자 아님; 422 필터; 503. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
