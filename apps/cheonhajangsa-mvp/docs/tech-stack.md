# 기술 스택

## 1. 선택과 이유
| 영역 | 선택 | 이유 |
|---|---|---|
| 앱(프론트엔드) | Expo + Expo Router + React Native Web, TypeScript | 시연기획서 10절 결정(새 Expo 앱, 웹 우선). 같은 코드가 웹과 휴대폰 앱으로 돈다 |
| 백엔드 | Vercel Functions(`api/` 폴더, Web 표준 `Request`/`Response`), Node 24 | 앱과 한 배포. 서버 코드 몇 개면 충분해 프레임워크를 두지 않는다 |
| 공통 로직 | `core/` 순수 TypeScript(UI·서버 의존 없음) | 검색 규칙을 서버·테스트·스크립트가 같이 쓴다(골든 케이스 재현) |
| AI | Anthropic SDK(`@anthropic-ai/sdk`), 도구 호출, 기본 모델 `claude-haiku-5-5` | 기획서 7절 |
| DB | 내 Supabase(Postgres), `@supabase/supabase-js`(서버에서 서비스 키) | DB아키텍처 0절. 기록 전용. 없으면 기록만 건너뜀 |
| 판매처 데이터 | `data/*.json` + 형식 검사 스크립트 | DB아키텍처 2절 |
| 인증 | 없음(기기 익명 id 헤더) | 기획서 2절. 운영자 인증은 [다음] |
| 테스트 | Vitest(단위·API), Playwright(최소 E2E, P2) | 빠르고 TypeScript 그대로 |
| 배포 | Vercel(정적 웹 `dist/` + `api/`), `vercel.json`·`.vercelignore`, 서울 리전 icn1, https://cheonhajangsa-mvp.vercel.app | 링크 하나로 강의실·다른 팀 사용 |
| 로컬 API | `tsx server/dev-server.ts`(Node http → 같은 핸들러) | 계정 없이 로컬 개발·테스트 |

## 2. 폴더 구조
```
cheonhajangsa-mvp/
  app/                    화면(Expo Router)
    _layout.tsx           공통 틀: 휴대폰 폭, 예시 데이터 띠
    index.tsx             대화 + 조건 칩 + 결과(S-01~S-03, S-05)
  src/
    components/           화면 조각(대화 말풍선, 선택지, 칩, 칩 편집, 결과 카드, 전화하기 시트, 입력창, 예시 띠)
    hooks/useAssist.ts    대화 상태와 API 호출
    lib/api.ts            API 클라이언트(fetch). 개발 빌드에서 주소가 비면 localhost:8787
    lib/api-types.ts      API 응답 모양
    lib/assist-state.ts   화면 상태 전이(순수 함수, 테스트 대상)
    lib/call.ts           전화하기 판단(예시·휴대폰·PC)
    lib/device.ts         기기 id(localStorage)
  core/                   공통 순수 로직
    schema.ts             데이터 파일 zod 스키마(허용값의 원천)
    types.ts              Vendor, Offer, Item, Location, Condition, VendorCard…(스키마에서 추론)
    time.ts               한국 시간 계산
    distance.ts           하버사인, 도보 분
    search.ts             R-01~R-11, R-15
    format.ts             화면 문구(가격·입고·영업)
    options.ts            되묻기·칩 편집 선택지(서버와 앱이 같이 씀)
    data.ts               데이터 파일 정적 import + 검사(Node API 없이, 함수 번들에 포함)
    validate.ts           데이터 형식 검사(AC-16)
  server/
    env.ts                환경 변수 읽기
    http.ts               JSON 응답, 오류 코드, 기기 인증, 디버그 헤더
    condition.ts          조건 검증 스키마, 조건 칩, 선택지 값
    deps.ts               배포·개발 서버 기본 의존성(데이터·환경 변수)
    handlers/             search.ts, assist.ts, devices.ts, events.ts, item-requests.ts, vendors.ts, locations.ts
    ai/                   types.ts, retrieval.ts(품목 사전 검색), prompt.ts(시스템 프롬프트·도구 2개), protocol.ts(도구 인자 검증), claude.ts(실시간), stored.ts(저장된 응답)
    log/                  logger.ts(인터페이스), supabase.ts, noop.ts
    dev-server.ts         로컬 개발 서버
  api/v1/                 Vercel 함수(핸들러를 부르는 얇은 파일)
  data/                   items.json, locations.json, vendors.json, offers.json
  supabase/migrations/    0001_mvp_logging.sql
  scripts/check-data.ts   npm run check:data
  tests/                  core·server·app(화면 상태) 테스트
  e2e/                    Playwright(P2), playwright.config.ts
  evals/                  cases.json, grade.ts, results/(P2)
  docs/                   이 문서들, planning/(원본 기획 4종)
```

## 3. 모듈 책임
| 모듈 | 책임 | 하지 않는 것 |
|---|---|---|
| `core/search.ts` | 조건 + 데이터 + 시각 → 묶음·순서·카드 | 입출력, AI, 기록 |
| `core/format.ts` | 화면 문구 생성(서버가 보냄) | 판정 |
| `server/ai/*` | AI 호출, 응답 형식 검증, 시간 초과 | 결과 문구 생성 |
| `server/handlers/*` | 입력 검증, 흐름, 기록 호출, 오류 코드 | 규칙 판정(core에 맡김) |
| `server/log/*` | 기록 쓰기(실패해도 throw 안 함) | 응답 결정 |
| `src/hooks/useAssist.ts` | 대화·조건·결과 상태, 오류 시 칩 편집 전환 | 규칙 판정 |

## 4. 환경 변수 (`.env.example`에 이름과 설명만)
| 이름 | 어디 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 서버 | 실시간 AI. 없으면 `AI_MODE=stored`만 가능 |
| `AI_MODE` | 서버 | `live` / `stored` |
| `AI_MODEL` | 서버 | 기본 `claude-haiku-5-5` |
| `AI_TIMEOUT_MS` | 서버 | 기본 8000 |
| `AI_DAILY_LIMIT` | 서버 | 기본 500(P2) |
| `SUPABASE_URL` | 서버 | 내 Supabase 주소. 없으면 기록 생략 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 | 서비스 키. 앱에 절대 넣지 않음 |
| `ALLOW_DEBUG_HEADERS` | 서버 | `true`일 때만 `X-Debug-Now`·`X-AI-Mode` 적용. 배포는 `false` |
| `EXPO_PUBLIC_API_BASE_URL` | 앱 | 배포는 비움(같은 출처). 로컬 개발은 비워 두면 개발 빌드가 `http://localhost:8787`을 쓴다 |
| `DEV_API_PORT` | 로컬 | 기본 8787 |
| `E2E_BASE_URL` | 로컬 | E2E 대상 주소. 기본 `http://localhost:8081` |
