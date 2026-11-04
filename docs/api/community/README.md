# 커뮤니티 엔드포인트 목록 (모두 기술 제안, main 미구현)

> 사용자 승인: C-01~C-10의 기능/UX. 다음 경로·DTO는 서버 구현 후보이며 아직 확정된 실제 서비스 API가 아니다.

| 메서드 | 경로 | 명세 |
|---|---|---|
| `GET` | `/api/v1/community/posts` | [`posts/get-posts.md`](./posts/get-posts.md) |
| `POST` | `/api/v1/community/posts` | [`posts/post-post.md`](./posts/post-post.md) |
| `GET` | `/api/v1/community/posts/{postId}` | [`posts/get-post.md`](./posts/get-post.md) |
| `PATCH` | `/api/v1/community/posts/{postId}` | [`posts/patch-post.md`](./posts/patch-post.md) |
| `DELETE` | `/api/v1/community/posts/{postId}` | [`posts/delete-post.md`](./posts/delete-post.md) |
| `POST` | `/api/v1/community/posts/images` | [`posts/post-post-image.md`](./posts/post-post-image.md) |
| `GET` | `/api/v1/community/posts/{postId}/comments` | [`comments/get-comments.md`](./comments/get-comments.md) |
| `POST` | `/api/v1/community/posts/{postId}/comments` | [`comments/post-comment.md`](./comments/post-comment.md) |
| `PATCH` | `/api/v1/community/comments/{commentId}` | [`comments/patch-comment.md`](./comments/patch-comment.md) |
| `DELETE` | `/api/v1/community/comments/{commentId}` | [`comments/delete-comment.md`](./comments/delete-comment.md) |
| `PUT` | `/api/v1/community/posts/{postId}/like` | [`interactions/put-like.md`](./interactions/put-like.md) |
| `DELETE` | `/api/v1/community/posts/{postId}/like` | [`interactions/delete-like.md`](./interactions/delete-like.md) |
| `PUT` | `/api/v1/community/posts/{postId}/save` | [`interactions/put-save.md`](./interactions/put-save.md) |
| `DELETE` | `/api/v1/community/posts/{postId}/save` | [`interactions/delete-save.md`](./interactions/delete-save.md) |
| `POST` | `/api/v1/community/posts/{postId}/reports` | [`moderation/post-report.md`](./moderation/post-report.md) |
| `GET` | `/api/v1/community/moderation/reports` | [`moderation/get-reports.md`](./moderation/get-reports.md) |
| `POST` | `/api/v1/community/moderation/reports/{reportId}/decision` | [`moderation/post-decision.md`](./moderation/post-decision.md) |

- 공통 인증·응답·오류·페이지 규약: [`conventions.md`](./conventions.md)
- 단일 엔드포인트가 GET/POST를 함께 다루더라도 **메서드별 개별 명세**를 유지한다.
- 이미지 업로드: `POST /posts/images`는 게시글 작성 전 임시 이미지 업로드 가정의 설계안. 임시 객체 정리/저장 키/스토리지 업로드 정책은 구현 검증 필요.
- 새 시연 시작 리셋 API는 **공통 시연 세션 명세가 정본**이며, 커뮤니티 API에 중복 정의하지 않는다.
