# 현행 MVP 골든테스트

정본은 [golden_cases.yaml](golden_cases.yaml)이다. YAML 1.2의 부분집합인 JSON 문법으로 저장하며 실제 입력·기대값·AC 번호를 담는다. 필수 10개를 유지한다.

| 파일 | 역할 |
|---|---|
| `tests/harness/golden_cases.yaml` | 승인된 입력·기대값. 테스트 코드와 분리 |
| `apps/cheonhajangsa-mvp/tests/harness/mvp-golden.test.ts` | 파일을 읽어 실제 함수·API 핸들러를 호출하고 `toStrictEqual`로 비교 |
| `apps/cheonhajangsa-mvp/scripts/check-golden-report.ts` | 각 필수 ID의 정확히 한 번 통과 검사. 누락·skip·실패 시 종료 코드 1 |
| `.github/workflows/mvp-qa.yml` | 타입·데이터·전체 테스트·골든 보고서 검사 |
| `docs/prompts/delegation_ac04.md` | 위임·결함 주입·복구 기록 |

## 실행

Node.js 24에서 실행한다. 외부 AI·운영 DB·지도 키는 필요 없다.

```bash
cd apps/cheonhajangsa-mvp
npm ci
npm run test:golden
npm test -- --reporter=default --reporter=json --outputFile=golden-report.json
npm exec -- tsx scripts/check-golden-report.ts golden-report.json
```

`golden-report.json`은 로컬 검증용이며 커밋하지 않는다. AI 결정은 stub이지만 검색·계산·API·클라이언트 상태 처리는 실제 구현이다. 모델의 문장 해석 능력은 Evals에서 별도로 평가한다.

## 이력과 변경 규칙

- [golden-cases.yaml](golden-cases.yaml)은 이전 발견 게이트 초안이다. 현재 러너가 읽지 않으며 10개 통과 집계에 넣지 않는다.
- 필수 케이스를 skip·xfail로 통과시키거나 결과에 맞춰 기대값을 바꾸지 않는다.
- 계약 변경이 승인되면 SPEC·해당 AC·케이스·러너를 함께 갱신한다.
- 결함 주입은 임시 변경이다. 복구 후 재실행까지 기록해야 완료다.

## 결함 주입 재현

앱 폴더에서 `npm exec -- tsx scripts/check-golden-mutations.ts`를 실행한다. 다른 편집·테스트와 동시에 실행하지 않는다. 러너는 기준선 통과 후 `core/price.ts`의 단가를 0으로, `core/search.ts`의 배송 조건을 무조건 가능으로 각각 임시 변경한다. 대응 골든 실패를 검사하고 `finally`에서 원본 바이트를 복원한다. 복원 후 다시 10/10이 아니면 실패한다. [실행 결과](../../docs/evaluation/results/golden-mutation-2026-11-17.json)를 참고한다.
