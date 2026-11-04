# API-COMMUNITY — 시연 관리자 신고 처리

**제안 엔드포인트:** `POST /api/v1/community/moderation/reports/{reportId}/decision`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
경로 `reportId` UUID. JSON `{action:"hide|delete|dismiss",reason:"...",expected_status?:"pending"}` 제안. `dismiss`는 신고 종료만 하고 글 유지.

## 성공 응답
`200 {report_id,post_id,report_status,post_visibility,moderated_at}`.

## 서버·권한·데이터 규칙
현재 시연 moderator 확인. hide/delete는 글을 해당 세션의 일반 피드·상세·저장/검색에서 차단. 감사로그 append. **실제 vendors/운영자 계정·staff 역할 절대 변경 금지**.

## 오류
401; 403 moderator 아님; 404 타 세션 신고; 409 중복 처리/상태 충돌; 422 사유 없음. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
