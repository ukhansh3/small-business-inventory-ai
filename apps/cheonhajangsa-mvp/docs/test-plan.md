# 테스트 계획

## 1. 핵심 사용자 흐름
| 흐름 | 자동 | 수동 |
|---|---|---|
| 상추 → 되묻기 3번 → 결과 → 전화하기 | API 테스트(저장된 응답) | 로컬 웹, 배포 링크 |
| 칩으로 양 바꾸기 | API 테스트(AC-14) | 웹 |
| AI 실패 → 칩 편집 → 결과 | API 테스트(AC-15) | 저장된 응답 끄고 키 없이 live로 확인 |
| 대파 → 요청 남기기 | API 테스트(AC-10) | 웹 |

## 2. 단위 테스트 (`tests/core`)
AC-1·2·4·6·7·8·9·12·16. 시각은 `now` 인자, 데이터는 `tests/fixtures/`(테스트 전용 판매처 A~G).

## 3. API 테스트 (`tests/server`)
핸들러를 `Request`로 직접 호출(서버를 띄우지 않음).
- `/search`: 정상, 400 `INVALID_INPUT`, 400 `ITEM_NOT_ACTIVE`, 응답 모양(API 명세 2.5·2.6)
- `/assist/turns`: ask 순서(AC-5), notice 2종(AC-10·11), 503(AC-15), 404/409 세션, 201자
- 디버그 헤더: `ALLOW_DEBUG_HEADERS`가 false면 무시

## 4. 인증·권한
- `X-Device-Id` 없으면 401
- 응답·번들에 서비스 키·Anthropic 키가 없음: `dist/`에서 키 이름 문자열 검색(빌드 후)

## 5. DB 무결성 (P1)
DB아키텍처 3.1 SQL을 로컬 Postgres에서 실행하고 거부돼야 할 입력 확인(같은 품목 중복 요청, 판매처 없는 전화하기, 없는 세션의 조건). 2026-11-04 설계 문서 단계에서 한 번 확인함(DB아키텍처 변경 기록).

## 6. 최소 E2E (P2)
Playwright: 배포 또는 로컬 웹에서 '상추' → 선택지 3번 → 결과 카드 1개 이상 → 전화하기 누르면 예시 안내.
- `e2e/search.spec.ts`, `playwright.config.ts`. 브라우저는 설치된 Chrome(`channel: "chrome"`), 요청에 `X-Test-Device: true`
- 로컬: `npm run dev:api`, `npm run web`을 띄운 뒤 `npm run e2e`. 배포: `E2E_BASE_URL=https://cheonhajangsa-mvp.vercel.app npm run e2e`

## 8. evals (P2)
- `evals/cases.json` 26건(조건 추출 16, 범위 밖 품목 6, 무관한 말 4), 채점 `evals/grade.ts`(테스트 `tests/evals/grade.test.ts`), 실행 `npm run evals`(실시간 Claude, 비용 발생)
- 목표: 조건 정확도 90% 이상, 지어낸 값 0건, 범위 판별 100%(개발기획서 9절). 결과는 `evals/results/{날짜}_{프롬프트 버전}_{모델}.json`
- 프롬프트(`server/ai/prompt.ts`)나 모델을 바꾸면 다시 돌린다
- v2: 글 evals에 가격 한 줄 6건(32건, 프롬프트 v2). 사진 evals `npm run evals:images`: 합성 이미지 11장(`evals/make_images.py` → `evals/images/`, 기대값 `evals/image-cases.json`, 채점 `evals/grade-images.ts`). 목표: 상추 줄(무게·금액) 정확도 90% 이상, 지어낸 상추 금액·무게 0, 영수증 아님 판별 100%. 한계: 합성 이미지라 실제 휴대폰 사진(흔들림·기울어짐·구김)은 따로 확인해야 한다
- E2E: `e2e/price.spec.ts`(가격 한 줄 → kg당 5,000원 판정·더 싼 곳)

## 7. 빌드·배포 검증
| 명령 | 기대 |
|---|---|
| `npm run typecheck` | 오류 0 |
| `npm test` | 실패 0, skip 0 |
| `npm run check:data` | 통과 |
| `npm run build:web` | `dist/` 생성 |
| 배포 후 Windows Chrome | 시나리오 1·3 수동 통과, 예시 띠 보임 |
