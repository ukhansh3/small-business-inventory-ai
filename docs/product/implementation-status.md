# 앱 기능 구현 현황

기준은 `main` 앱 통합 커밋 `06e83e5`의 `apps/cheonhajangsa-mvp/`다. 아래는 코드와 저장된 검증 기록의 범위다. 사용자 수요 판단은 [문제 정의](../PROBLEM.md)에서 확인한다.

| 영역 | 현행 코드 | 검증 상태와 한계 |
|---|---|---|
| 공개 시연 | Expo 웹 앱과 Vercel Functions. 로그인 없이 지도와 AI 도우미를 체험한다. | [시연 URL과 사용 순서](../../README.md#mvp-사용자-가이드). 배포본 전체 QA는 별도다. |
| 지도·업체 조회 | 카카오 지도 핀, 업체 목록·상세, 위치 변경, 업체명·업종 검색. | 공공 원문 업체의 실제 가격·재고는 미확인이다. |
| AI 검색 | 상추 조건 질문, 결과 후보, 조건 칩 수정, 저장 응답과 수동 검색 대체 흐름. | 앱의 단위·API 테스트와 [Evals 결과](../../apps/cheonhajangsa-mvp/evals/results)가 있다. 과거 실행 결과와 현재 배포 검증을 구분한다. |
| 단가 진단 | 텍스트·사진 입력의 kg당 가격 환산과 시세 비교. | 사진은 실시간 AI가 필요하다. 예시 판매처의 가격은 실거래가가 아니다. |
| 회원 기능 | 이메일 계정·프로필, 업체 저장, 게시글·댓글·신고, 업체 문의 대화 코드. | [회원 통합 당시 기록](../../apps/cheonhajangsa-mvp/docs/member-integration.md)이 있다. 실제 계정·DB·복수 사용자 시나리오는 별도 확인이 필요하다. |
| 업체 등록·검토 | 현행 앱의 시연 경로에 포함되지 않는다. | 당시 계약과 DB 검증 기록은 아래에서 확인한다. |
| 루트 SPEC 기준 | AC04 배송 판정 추가 필드와 루트 골든 YAML·CI 연동은 미완료다. | 앱 자체 Vitest·Playwright와 발견 게이트 골든 케이스를 구분한다. |

로컬 실행과 배포 구성은 [현행 앱 README](../../apps/cheonhajangsa-mvp/README.md), 세부 동작 판정은 [앱 수용 기준](../../apps/cheonhajangsa-mvp/docs/acceptance-criteria.md)을 참고한다.

## 이전 앱 검증 기록

- `290da35` 당시의 승인 업체 검색·등록·검토와 공공업체 시연은 [이전 구현 현황](https://github.com/ukhansh3/small-business-inventory-ai/blob/06e83e595f12bbb1286d161f2420c649f15e2d66/docs/product/implementation-status.md)에 보존돼 있다.
- [업체 등록 계약](../contracts/vendor-registration-v1.md), [Supabase 적용 기록](../database/deployments/2026-10-29/README.md), [가상 업체 검증 기록](../database/deployments/2026-10-29/fixtures/README.md).
