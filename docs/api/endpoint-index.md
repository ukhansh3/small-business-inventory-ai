# HTTP API 전체 인벤토리 — 문서/실제 구현 구분

| 메서드 | 경로 | 상태 | 상세 명세 |
|---|---|---|---|
| `POST` | `/api/v1/ai/messages` | 제안·미구현 | [`docs/api/ai-assistant/post-messages.md`](../../docs/api/ai-assistant/post-messages.md) |
| `DELETE` | `/api/v1/ai/threads/{threadId}` | 제안·미구현 | [`docs/api/ai-assistant/delete-thread.md`](../../docs/api/ai-assistant/delete-thread.md) |
| `GET` | `/api/v1/ai/threads/{threadId}/messages` | 제안·미구현 | [`docs/api/ai-assistant/get-thread-messages.md`](../../docs/api/ai-assistant/get-thread-messages.md) |
| `DELETE` | `/api/v1/community/comments/{commentId}` | 제안·미구현 | [`docs/api/community/comments/delete-comment.md`](../../docs/api/community/comments/delete-comment.md) |
| `PATCH` | `/api/v1/community/comments/{commentId}` | 제안·미구현 | [`docs/api/community/comments/patch-comment.md`](../../docs/api/community/comments/patch-comment.md) |
| `GET` | `/api/v1/community/moderation/reports` | 제안·미구현 | [`docs/api/community/moderation/get-reports.md`](../../docs/api/community/moderation/get-reports.md) |
| `POST` | `/api/v1/community/moderation/reports/{reportId}/decision` | 제안·미구현 | [`docs/api/community/moderation/post-decision.md`](../../docs/api/community/moderation/post-decision.md) |
| `GET` | `/api/v1/community/posts` | 제안·미구현 | [`docs/api/community/posts/get-posts.md`](../../docs/api/community/posts/get-posts.md) |
| `POST` | `/api/v1/community/posts` | 제안·미구현 | [`docs/api/community/posts/post-post.md`](../../docs/api/community/posts/post-post.md) |
| `POST` | `/api/v1/community/posts/images` | 제안·미구현 | [`docs/api/community/posts/post-post-image.md`](../../docs/api/community/posts/post-post-image.md) |
| `DELETE` | `/api/v1/community/posts/{postId}` | 제안·미구현 | [`docs/api/community/posts/delete-post.md`](../../docs/api/community/posts/delete-post.md) |
| `GET` | `/api/v1/community/posts/{postId}` | 제안·미구현 | [`docs/api/community/posts/get-post.md`](../../docs/api/community/posts/get-post.md) |
| `PATCH` | `/api/v1/community/posts/{postId}` | 제안·미구현 | [`docs/api/community/posts/patch-post.md`](../../docs/api/community/posts/patch-post.md) |
| `GET` | `/api/v1/community/posts/{postId}/comments` | 제안·미구현 | [`docs/api/community/comments/get-comments.md`](../../docs/api/community/comments/get-comments.md) |
| `POST` | `/api/v1/community/posts/{postId}/comments` | 제안·미구현 | [`docs/api/community/comments/post-comment.md`](../../docs/api/community/comments/post-comment.md) |
| `DELETE` | `/api/v1/community/posts/{postId}/like` | 제안·미구현 | [`docs/api/community/interactions/delete-like.md`](../../docs/api/community/interactions/delete-like.md) |
| `PUT` | `/api/v1/community/posts/{postId}/like` | 제안·미구현 | [`docs/api/community/interactions/put-like.md`](../../docs/api/community/interactions/put-like.md) |
| `POST` | `/api/v1/community/posts/{postId}/reports` | 제안·미구현 | [`docs/api/community/moderation/post-report.md`](../../docs/api/community/moderation/post-report.md) |
| `DELETE` | `/api/v1/community/posts/{postId}/save` | 제안·미구현 | [`docs/api/community/interactions/delete-save.md`](../../docs/api/community/interactions/delete-save.md) |
| `PUT` | `/api/v1/community/posts/{postId}/save` | 제안·미구현 | [`docs/api/community/interactions/put-save.md`](../../docs/api/community/interactions/put-save.md) |
| `GET` | `/api/v1/demo/session` | 제안·미구현 | [`docs/api/demo-session/get-current.md`](../../docs/api/demo-session/get-current.md) |
| `POST` | `/api/v1/demo/session/start` | 제안·미구현 | [`docs/api/demo-session/post-start.md`](../../docs/api/demo-session/post-start.md) |
| `GET` | `/api/v1/map/markers` | 제안·미구현 | [`docs/api/vendor-search/get-map-markers.md`](../../docs/api/vendor-search/get-map-markers.md) |
| `GET` | `/api/v1/map/vendors` | 제안·미구현 | [`docs/api/vendor-search/get-map-list.md`](../../docs/api/vendor-search/get-map-list.md) |
| `GET` | `/api/v1/saved` | 제안·미구현 | [`docs/api/saved/get-saved.md`](../../docs/api/saved/get-saved.md) |
| `DELETE` | `/api/v1/saved/vendors/{vendorId}` | 제안·미구현 | [`docs/api/saved/delete-vendor-save.md`](../../docs/api/saved/delete-vendor-save.md) |
| `PUT` | `/api/v1/saved/vendors/{vendorId}` | 제안·미구현 | [`docs/api/saved/put-vendor-save.md`](../../docs/api/saved/put-vendor-save.md) |
| `GET` | `/api/v1/vendors` | 현재 main 확인 | [`docs/api/vendor-search/get-vendors.md`](../../docs/api/vendor-search/get-vendors.md) |
| `GET` | `/api/v1/vendors/{id}` | 현재 main 확인 | [`docs/api/vendor-search/get-vendor-detail.md`](../../docs/api/vendor-search/get-vendor-detail.md) |

실제 main에는 업체 관리 관련 **이 표에 없는** 기존 route들도 있다. 이 표는 이번 데모에 직접 연결되는 endpoint 명세만 나열하며, 모든 기존 코드를 열거한 것은 아니다.
마커 전체 결과 수집·리셋은 추가 승인/보안 검증이 필요한 기술 제안. `openapi.yaml` 경로가 곧 배포되었다는 뜻이 아니다.
