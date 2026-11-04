# GET /api/v1/demo/session — 현재 시연 세션 (제안)

**상태:** PROPOSED / 미구현. Bearer 또는 서버의 비대화형 세션 확인.

- Response 200 제안: `{sessionId,displayName,startedAt}`. 민감한 Auth JWT, DB secret, 다른 사용자 닉네임 목록 노출 금지.
- 401/503은 로그인 화면 대신 자동 세션 복구 UI로 연결. UI가 `내 정보` 구현 전이라 해도 앱 시작 및 모든 쓰기 권한에는 필요.
