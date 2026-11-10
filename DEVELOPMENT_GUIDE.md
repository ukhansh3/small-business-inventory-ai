# 천하장사 개발 가이드

현재 개발·시연 대상은 `apps/cheonhajangsa-mvp/`의 Expo 웹 앱이다. 브라우저 UI는 카카오 지도와 같은 출처의 Vercel API를 사용한다. 검색·단가 계산은 앱의 TypeScript 코드에서 수행하고, 서버가 AI 도구 입력과 회원 권한을 검증한다.

| 영역 | 위치 |
|---|---|
| 화면·클라이언트 API | `apps/cheonhajangsa-mvp/app/`, `src/` |
| Vercel API·서버 | `apps/cheonhajangsa-mvp/api/v1/`, `server/` |
| 검색·가격·시연 데이터 | `apps/cheonhajangsa-mvp/core/`, `data/` |
| 프롬프트·JSON Schema | [파싱 계약](apps/cheonhajangsa-mvp/src/cheonhajangsa/prompts/parse_query.md) |
| 회원·기록 DB | 앱의 `supabase/migrations/`. 실제 원격 적용 여부는 별도로 확인한다. |

## 로컬 실행과 검증

[앱 README](apps/cheonhajangsa-mvp/README.md)에 따라 Node.js 24와 환경 변수를 준비한다. 명령은 앱 폴더에서 실행한다.

1. `npm ci`
2. 터미널 두 개에서 각각 `npm run dev:api`, `npm run web`
3. 수정 범위에 따라 `npm run typecheck`, `npm test`, `npm run check:data`, `npm run lint`, `npm run build:web`

제품 범위와 검증 상태는 [SPEC](docs/SPEC.md), [구현 현황](docs/product/implementation-status.md)을 확인한다. 브랜치·권한·비밀키 규칙은 [AGENTS](AGENTS.md)를 따른다. 이전 네이티브 앱 및 업체 등록 설계는 [통합 전 개발 가이드](https://github.com/ukhansh3/small-business-inventory-ai/blob/eef584915ac9205471ecfe211a3459bfc8700b07/DEVELOPMENT_GUIDE.md)에 보존돼 있다.
