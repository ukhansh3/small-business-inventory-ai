# 구현 계획 (5일, 11/04~11/09)

각 단계 끝에: `npm run typecheck && npm test` → 해당 단계 검증 명령 → `progress.md` 갱신.

| 단계 | 작업 | 완료 조건 | 검증 | 날짜 |
|---|---|---|---|---|
| 1 | 프로젝트 뼈대: Expo(웹) + TypeScript strict + Vitest + 폴더 구조 + `.env.example` + git init | 빈 화면이 웹에서 뜨고 빈 테스트가 돈다 | `npm run typecheck`, `npm test`, `npx expo export -p web` | 11/04 |
| 2 | `core/types.ts`, `data/*.json`(가상 8~10곳 + 테스트 고정 판매처), `core/validate.ts`, `scripts/check-data.ts` | AC-16 통과, 실제 데이터 검사 통과 | `npm run check:data`, `npm test` | 11/05 |
| 3 | `core/time.ts`, `distance.ts`, `format.ts`, `search.ts` | AC-1·2·4·6·7·8·9·12 통과 | `npm test` | 11/05 |
| 4 | `server/http.ts`, 핸들러 `search`, `dev-server.ts`, `api/v1/search.ts` | API-02 응답이 명세 모양, AC-14 통과 | `npm test`, `curl` 로컬 | 11/06 |
| 5 | `server/ai/*`(프롬프트, 응답 검증, 저장된 응답, 시간 초과), 핸들러 `assist` | 저장된 응답으로 AC-5·10·11·15 통과. 키가 있으면 실시간 1회 수동 | `npm test`, `curl` | 11/06~07 |
| 6 | 화면: `useAssist`, ChatLog·AskOptions·ConditionChips·ChipEditor·ResultList·VendorCard·CallSheet·NoticeCard, 예시 띠 | 웹에서 시나리오 1·2·3이 끝까지 | 수동(로컬 웹), `npm run typecheck` | 11/07~08 |
| 7 | (P1) 기록: `server/log/supabase.ts`, 마이그레이션 0001, API-06·04·05 | Supabase 있으면 기록 생김, 없으면 정상 동작 | `npm test`(noop), 수동 | 11/08 |
| 8 | 배포: `vercel.json`, 웹 빌드 + 함수 배포, 환경 변수 | Windows Chrome에서 링크로 시나리오 1·3 | 수동, `npm run build:web` | 11/09 |
| 9 | (P1) README 사용 방법, 상세·위치(시간 남으면) | README만 보고 실행 가능 | 수동 | 11/09 |

## v2 단계 (2026-11-04 결정, `feature-v2.md`)
| 단계 | 작업 | 완료 조건 | 검증 | 날짜 |
|---|---|---|---|---|
| 10 | 문서: feature-v2, mvp-scope 5절, AC-17~30, API 명세(API-15~18), DB(0004), 규칙 예외 | 문서 간 충돌 없음, consistency-report 갱신 | 검토 | 11/04 |
| 11 | 단가 진단 서버: `core/price.ts`(R-16~R-20), 시세(R-18), AI 사진 읽기·`check_price`, API-15·16·17, 0004 마이그레이션 | AC-17~26 통과, 실시간 사진 1장 수동 | `npm test`, 로컬 Postgres | 11/05~06 |
| 12 | 단가 진단 화면: 입력창 📷, 사진 줄이기, 진단 카드, 보태기 동의, 결과 위 시세 한 줄, 이미지 evals(합성 10장+) | 로컬 웹에서 사진·가격 한 줄 진단 끝까지, evals 목표 통과 | 수동, `npm run evals` | 11/06~07 |
| 13 | 공공데이터: 상가정보(영통·팔달) 받아 걸러 `data/public_stores.json` + 형식 검사 + API-18 | AC-27 통과 | `npm run check:data`, `npm test` | 11/07 |
| 14 | 지도 홈: 카카오맵, 핀, 목록 시트, 기존 대화·결과·진단을 시트로 옮김 | AC-28~30, 기존 E2E 수정 후 통과 | 수동, `npm run e2e` | 11/07~08 |
| 15 | 배포·README·리허설 준비(기능 고정) | 배포 링크에서 v2 완료 판정 | 수동, E2E(배포) | 11/08~09 |

사용자가 할 일: 카카오 개발자 JavaScript 키 발급과 도메인 등록(14단계 전), 공공데이터 상가정보 파일 내려받기 또는 API 활용 신청(13단계 전), Supabase에 0004 실행(11단계 후).

## 위험과 대응
| 위험 | 대응 |
|---|---|
| Expo 웹 + Vercel 함수 조합 설정이 막힘 | 1단계에서 빈 함수까지 먼저 배포해 본다(늦어도 3일째). 막히면 정적 웹은 Vercel, API는 같은 프로젝트 `api/`만 남기는 최소 설정 |
| Anthropic 키가 늦게 옴 | 저장된 응답 모드로 끝까지 개발·시연 가능. 시연 중 밝힌다 |
| AI가 형식을 자주 깸 | 도구 호출 1개 + 서버 검증 + 실패 시 칩 편집(AC-15) |
| 일정 지연 | 자를 순서: P2 전부 → P1-3·P1-4 → P1-1 기록 → 배달 선택지 |
| 한국 시간 버그 | 시각을 인자로 받는 순수 함수 + AC-7·8 테스트 |
