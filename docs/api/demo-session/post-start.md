# POST /api/v1/demo/session/start — 시연 시작/초기화 (제안)

**상태:** PROPOSED / 현재 미구현. 정확한 URL·TTL·인증 방식은 팀/사용자 기술 승인 필요.

- 첫 시작: 비대화형 Auth/내부 토큰으로 `demoSessionId` 발급, 닉네임 자동 설정. 고정 공용 계정 재사용 금지.
- 새 시작: 현재 인증된 세션의 시연 자료만 정리/무효화하고 **새 session** 발급. 기존 원본 업체/타 세션 수정 금지.
- Response 201 제안: `{sessionId,displayName,startedAt}`. sessionId는 권한 증거가 아니라 UI 식별 정보.
- 실패: 401 인증 필요, 409 동시 reset, 503 시연 인프라 사용 불가.
- 보안: request body actorId/isModerator/sessionId 값만으로 삭제 대상 설정 금지. idempotency·Storage GC·트랜잭션 보장 필요.
