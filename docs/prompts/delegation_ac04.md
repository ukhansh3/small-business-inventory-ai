# AC04 위임과 검증 기록

기준 커밋은 `fbc0563d360d5d93bb4cdea16346cd529334ab1f`다. 사용자가 배송 판정과 새 골든 세트의 진행을 승인했다. 기준은 [SPEC](../SPEC.md)과 [현행 골든 YAML](../../tests/harness/golden_cases.yaml)이다.

## 1차 위임 기준

현행 MVP의 필수 케이스를 YAML에 작성하고, 앱의 Vitest가 고정 시각·fixture와 가짜 모델을 사용해 실제 검색·단가·서버 핸들러를 검사한다. 배송 코드와 운영 DB는 이 단계에서 바꾸지 않는다. 실행 명령은 앱 폴더에서 `npm run test:golden`이다.

**실행 기록** 구현 전 8개 통과, AC04 2개 실패. 현재 스키마가 배송 미확인 값을 거부한다는 것을 확인했다.

## 2차 위임 기준

기존 그룹과 검색 결과 구조를 유지하고 승인된 배송 필드를 추가한다. 데이터에서 확인할 수 없는 배송·목적지는 미확인으로 표시한다. 승인한 골든 기대값을 바꾸지 않는다. 운영 DB와 배포는 범위에 포함하지 않는다.

**실행 기록** 타입 검사, 데이터 검사, 전체 Vitest 163개와 필수 골든 10개가 로컬에서 통과했다. JSON 리포트 검사기는 골든 ID가 각각 한 번 통과했음을 확인했다.

**결함 주입** 단가를 임시로 0원으로 반환했을 때 MVP-G24가 실패했다. 배송 불가·미확인을 배송 가능으로 처리했을 때 MVP-G04가 실패했다. 두 변경을 복구한 뒤 필수 골든을 다시 실행했다.

## 2026-11-17 재현 가능한 결함 주입 검사

main `3848120`에서 분기한 로컬 평가 보완 작업으로 재검사했다. 과거 실행 기록을 덮어쓰지 않는다. 골든 기대값·모델·운영 DB는 변경하지 않았다.

명령은 앱 폴더에서 `npm exec -- tsx scripts/check-golden-mutations.ts`다. 러너는 `apps/cheonhajangsa-mvp/scripts/check-golden-mutations.ts`, 실제 보고서는 [golden-mutation-2026-11-17.json](../evaluation/results/golden-mutation-2026-11-17.json)이다.

| 임시 변경 파일 | 바꾼 내용 | 실제 실패 | 복구 |
|---|---|---|---|
| `apps/cheonhajangsa-mvp/core/price.ts` | `Math.round(amount_won / qty_kg)` 대신 0 반환 | MVP-G24 | 원본 바이트 복원 |
| `apps/cheonhajangsa-mvp/core/search.ts` | 업체 지원·배송 동 검사 대신 모든 delivery를 가능 처리 | MVP-G04 | 원본 바이트 복원 |

주입 전 10/10, 각 결함 실행 종료 코드 1, 복구 후 10/10을 확인했다. skip·미실행·중복 ID도 거부한다. 임시 결함을 포함한 배포나 운영 데이터 변경을 의미하지 않는다.
