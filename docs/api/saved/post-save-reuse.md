# 게시글 저장 API 재사용 (새 엔드포인트 중복 생성 금지)

**상태:** C-05/S-01/02/08 승인, 기술 명세 제안/미구현.
- `PUT /api/v1/community/posts/{postId}/save`: [`../community/interactions/put-save.md`](../community/interactions/put-save.md).
- `DELETE /api/v1/community/posts/{postId}/save`: [`../community/interactions/delete-save.md`](../community/interactions/delete-save.md).
- 저장 탭의 `GET /api/v1/saved?type=post`는 커뮤니티 `community_post_saves`를 **동일 정본**으로 조회한다. 저장 탭을 위해 `/saved/posts`라는 두 번째 쓰기 API나 테이블을 만들지 말 것.
- 게시글 삭제/숨김/타 세션의 경우 본문·이미지를 출력하지 않음. 좋아요 테이블과 별도.
