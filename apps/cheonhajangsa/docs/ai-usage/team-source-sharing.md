# 팀 소스 공유 검증 기록

- 날짜: 2026-10-28
- 사용자 요청: 현재 앱 전체를 팀 저장소에 올리고 각자 브랜치에서 개발하도록 구성.
- 도구: Codex, Git, pnpm, GitHub 연결 도구.
- 변경: 앱 소스를 `apps/cheonhajangsa`로 가져오고 실행·환경 변수·브랜치 협업 안내와 빌드 산출물 제외 규칙을 추가했다. 새로운 제품 계약이나 DB 스키마는 구현하지 않았다.
- 실제 실행: Node.js 24 / pnpm 11.25.0, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (3개 파일, 17개 테스트 통과), `pnpm build` 통과.
- 실제 키와 스테이징 파일을 값으로 대조한 검사: 일치 없음. `.env.local`은 무시됨. APK·서명 키·빌드 산출물은 커밋 대상에서 제외.
- 검증 한계: Playwright E2E·Supabase DB/RLS·실제 AI 통합 검증은 수행하지 않았다. 앱은 샘플 업체·가격을 사용하는 프로토타입이다.
- 사람 검토: 이 공유 작업의 코드 리뷰와 main 병합 승인은 아직 받지 않았다. 검토용 PR에서 진행한다.
