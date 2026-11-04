# API-COMMUNITY — 댓글 작성

**제안 엔드포인트:** `POST /api/v1/community/posts/{postId}/comments`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
경로 `postId` UUID. JSON `{body:"...",client_request_id?:"uuid"}`. 대댓글 필드는 받지 않음.

## 성공 응답
`201 Comment`; 글 댓글 수 갱신.

## 서버·권한·데이터 규칙
글이 published이며 자기 세션에 속해야 함. 작성자는 서버 actor. 삭제·숨김 글에 댓글 추가 금지.

## 오류
401; 404 게시글 없음; 409 비공개로 상태 변경; 422 본문 없음/대댓글 요청. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
