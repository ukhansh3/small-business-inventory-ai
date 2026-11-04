# 기능 요구사항 — AGENTS.md (이번 데모 제안)

최상위 `AGENTS.md`와 `docs/decisions/approved-ux.md`, `docs/reviews/CONFLICTS.md`를 반드시 선행해서 읽는다.

## 책임
- 사용자 승인 UX와 미승인 구현 제안을 분리하고 기능별 상태·수용 기준 갱신.
- 명세는 사용자 UX 확정 / 구현 기술 제안 / 현행 코드 확인 / 미완료를 명확히 구분한다.
- 현재 담당 폴더 밖 변경은 코드 소유자와 PR 단위로 사전 협의한다. 다른 팀원의 작업을 지우거나 덮어쓰지 않는다.
- 모호한 기술·정책은 임의 확정하지 않고 사용자에게 질문한다. 당장 진행 불가하면 `BLOCKED: OWNER_DECISION_REQUIRED`를 남긴다.

## 공통 안전 규칙
- 로그인 화면은 노출하지 않되 서버 인증·RLS/Storage 권한을 제거하지 않는다.
- 시연 데이터는 방문자 세션별 격리; 운영 업체·가격·원본 인터뷰·기존 승인 기록 불변.
- 모바일/웹뷰에는 secret/service_role/LLM API 키 금지. 입력 검증·rate limit·출력 검증·타 세션 차단.
- 내 정보·업체 관리는 UI만! 새 등록·검토·승인 기능을 완료로 표시하거나 구현하지 않는다.
- 테스트가 실제 실행되지 않았다면 `NOT RUN`, 계약이 제안이라면 `PROPOSED`로 기록.

## 작업 전에/후에
1. 관련 `docs/features/`, `docs/ui/screens/`, `docs/api/`, `docs/database/` 및 `docs/handoff/` 파일을 읽는다.
2. API 변경은 `docs/api/openapi.yaml` 및 `packages/vendor-contracts`와 일치시키고, 서버/모바일 소비자 업데이트.
3. DB 변경은 append-only migration + RLS 매트릭스 + 시연 리셋 범위 증명 필요.
4. 작은 PR로 변경, 테스트/스크린샷/로그에서 PII 마스킹, 사람 리뷰 후 merge.
