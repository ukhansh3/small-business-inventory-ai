# 천하장사 개발 인계 v3.1 — dev 업로드 전용

**사용자 승인 정책:** 기존 Supabase DB 연결/재사용 **필수**, 기존 앱 소스 코드 재사용 **선택**, `dev` 이외 브랜치 변경 금지. 원본 DB를 절대 초기화·삭제·재생성하지 않는다.

- 본 폴더는 `dev` 브랜치 루트에 덮어쓰도록 준비된 **명세 문서**이며 실행 코드를 수정하지 않는다.
- v3.0의 기능·UI·API·DB 명세를 유지하고 dev 범위 문서를 추가했다.
- 루트 `README.md`는 **패키지에서 제외하여 기존 dev 버전 유지**.
- 루트/`apps/mobile`/`apps/cheonhajangsa` AGENTS.md는 dev 기준 기존 텍스트에 addendum을 붙여 준비했다. 업로드 직전 충돌 여부 반드시 확인.
- `docs/api/openapi.yaml`의 신규 엔드포인트, DB 테이블 및 아키텍처는 **PROPOSED**, 미구현/미적용 상태.
- 새 DB migration의 실제 적용은 팀/DB 소유자 승인 후. 개발 에이전트가 운영 DB를 실수로 reset하지 않게 안전장치 필요.
- 시연용 데이터 초기화는 **시연 세션 쓰기 자료만**. 원본 업체·가격·등록·검토 데이터 초기화 금지.
- 브랜치 확인: GitHub 상단 `dev` + 업로드 화면의 `Commit directly to the dev branch` 확인 후 커밋.
- 기존 앱을 새로 짜는 경우에도 API/DB 연결 호환성과 비밀키·RLS·권한 검증 필수.

## 읽을 순서
1. `AGENTS.md` → `docs/handoff/DEV-SCOPE-OVERRIDE.md` → `DECISIONS.md`
2. `docs/reviews/CONFLICTS.md` → `docs/decisions/approved-ux.md`
3. `docs/features/`, `docs/ui/`, `docs/api/`, `docs/database/`
4. `docs/handoff/CODEX_PROMPTS.md`, `docs/handoff/agent-work-packages.md`

**검증 상태:** 문서 정적 검사만 가능. 기존 DB 접속, SQL 적용, Expo/Next 테스트, Android 실기기 테스트는 이 ZIP에서 수행하지 않았다.
