# 천하장사 MVP

상추 판매처 찾기 앱(Expo 웹 + Vercel 함수). 5일 MVP, 11/11 중간평가② 시연.

## 문서 우선순위 (충돌 시 위가 이긴다)
1. `docs/mvp-scope.md`
2. `docs/acceptance-criteria.md`
3. `docs/planning/API명세서.md`
4. `docs/planning/DB아키텍처.md`
5. `docs/planning/개발기획서.md`, `docs/planning/시연기획서.md`
6. 구현 중 기록한 가정(`docs/consistency-report.md`, `docs/progress.md`)

충돌은 숨기거나 조용히 고치지 말고 `docs/consistency-report.md`에 기록한다.

## 작업할 때 볼 문서
- 구조·모듈·환경 변수: `docs/tech-stack.md`
- 화면·상태·연결 API: `docs/component-map.md`
- 규칙·금지 사항: `docs/coding-rules.md`
- 순서·완료 조건: `docs/implementation-plan.md`
- 검증: `docs/test-plan.md`

Expo API를 쓸 때는 루트 `AGENTS.md`(Expo 템플릿 안내: SDK 58 문서 확인, `npx expo install` 사용)를 따른다.

## 작업 원칙
- 문서에 없는 기능을 넣지 않는다. [다음] 기능은 만들지 않는다.
- API를 바꾸면 API 명세를, DB를 바꾸면 DB 문서와 마이그레이션을 함께 고친다.
- 각 작업 뒤 `npm run typecheck && npm test`, 각 단계 뒤 `docs/progress.md` 갱신.
- 테스트하지 않은 것을 완료로 쓰지 않고, 실패를 통과로 보고하지 않는다.
- 비밀값은 저장하지 않는다. 원격 push는 사용자 지시가 있을 때만.
