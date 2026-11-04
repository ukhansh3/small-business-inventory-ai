# API-AI-GET-THREAD — GET /api/v1/ai/threads/{threadId}/messages (제안)

- **구현 상태:** 미존재. 대화 기록 AI-10을 충족하기 위한 **제안 API**.
- 입력: `threadId` UUID + 서버 검증된 시연 세션, 필요 시 페이지 커서.
- 출력 제안: `threadId`, `messages[]`(role: user/assistant, id, content, createdAt), 구조화된 이전 추천 카드의 **당시 근거/출처 및 확인일**, `nextCursor`.
- 동일 시연 세션의 데이터만 노출. 타 세션 thread 접근은 403 또는 노출 최소화를 위한 404.
- 대화를 다시 볼 때 최신 업체 가격이라고 가장하지 않는다. 과거 가격은 당시 확인일과 함께 표시하고, 최신 가격 조회가 필요한 경우 새 검색을 유도한다.
- DB/RLS: `docs/database/ai-assistant.md`. 스키마/최대 저장 턴 수/보존 기간은 추후 확정.
- 테스트: 같은 세션 복원 성공, 타 세션 복원 거절, 세션 초기화 후 조회 불가, 페이지 중복 없음.
