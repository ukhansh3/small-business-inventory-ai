# API-COMMUNITY — 게시글 저장

**제안 엔드포인트:** `PUT /api/v1/community/posts/{postId}/save`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
경로 `postId` UUID. 요청 본문 없음.

## 성공 응답
`200 ReactionState` (`is_saved=true`).

## 서버·권한·데이터 규칙
자기 세션 게시글만 저장. UNIQUE `(post_id,actor_id)`; 저장 탭 S-01~S-10 사용자 승인 완료. UI는 `docs/ui/screens/saved.md` 참조.

## 오류
401; 404 다른 세션/숨김/삭제. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
