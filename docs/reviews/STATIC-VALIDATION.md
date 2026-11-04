# v3.0 정적 검증 결과 (작성 시점)

- Markdown 링크/필수 AGENTS/엔드포인트별 OpenAPI 29 operation 존재: `PASS` (검사 스크립트 아래 명령으로 재현 가능).
- OpenAPI 3.1 YAML 파싱: `PASS`.
- 개별 명세의 좋아요·게시글 저장·업체 저장 **해제 200 응답**과 OpenAPI 차이: 발견 후 문서에서 일치시킴.
- `GET /saved` 실제 제안 예시의 `saved_at / available / vendor / post`와 OpenAPI 응답 형태: 맞춤.
- 현재 main Zod/Route ↔ 제안 OpenAPI **완전 일치**: `NOT VERIFIED` (신규 endpoint 없음, 구현 전 검증 필수).
- DB migration/RLS/Storage 보안 테스트: `NOT RUN`; Android/iOS/LLM 실제 호출: `NOT RUN`; GitHub commit/push: `NOT DONE`.
- 기술 미확정/보안 차단은 `docs/reviews/CONFLICTS.md`의 X07/X08/X12/X13/X16 등을 유지.
