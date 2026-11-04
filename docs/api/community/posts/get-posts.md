# API-COMMUNITY — 게시글 피드 조회

**제안 엔드포인트:** `GET /api/v1/community/posts`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
`category=all|purchase_question|price_report|trade_experience`, `cursor?`, `limit?` (기본 20, 제안 상한 50). 카테고리 생략 시 `all`.

## 성공 응답
`200 Page<PostSummary>`: `{items:[...],next_cursor:"opaque-or-null"}`; 최신순 `created_at DESC, id DESC`. `comment_count`/`like_count`는 실제 세션의 공개 글에 대한 집계.

## 서버·권한·데이터 규칙
같은 demo_session의 `published` 글만 조회. 최신순 커서, category 변경 시 새 첫 페이지. 같은 글 중복 미노출.

## 오류
401 세션 만료; 422 필터/커서 오류; 503 DB 장애. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
