# 코덱스 병렬 구현 분담 — 권고 PR 시퀀스

> **개발 작업 지시서, 실행되지 않음.** 모든 에이전트는 변경 전 `AGENTS.md`/해당 하위 지침/승인 정책을 읽고 애매한 결정은 사용자에게 묻는다. 공유 DB·팀 브랜치 보호를 우선한다.

## 시작 전 사람에게 일괄 확인할 기술 결정
1. 데모 Supabase 프로젝트 분리 및 실제 공개 업체의 읽기전용 데이터 사본/동기화 출처·권한(권고안) 승인.
2. anonymous Auth/내부 세션 발급 방식, 시연 관리자 입구·역할, 자동 리셋 트리거 검증.
3. LLM 제공자·서버 키·호출 비용/횟수, 외부 데이터 사용 허락, 시연용 이미지 자산.
4. 지도 광역 최대 bounds/성능(전체 업체 누락 없이 제한 안내), 가격순 비교 규격/산식.

## 에이전트·브랜치 권장 소유권
| 순서 | 담당 | 주 파일·수용 기준 | 다른 담당과 접점 | 완료 증거 |
|---|---|---|---|---|
| P0 | TECH-LEAD | API/OpenAPI/Zod 모형, 환경·데모 경계 PR | 전체 | 승인된 ADR, CI 및 gap table |
| P1 | DB-SECURITY | 새 demo migration/RLS/Storage 정책/reset 설계 | API-LEAD | A/B 세션 격리·운영 불변 테스트 |
| P2 | API-LEAD | Next API 세션/지도/커뮤니티/저장/AI 서버 | DB-SECURITY / mobile | 계약/권한 테스트/에러 모델 |
| P3 | MOBILE-MAP | map WebView bridge/cluster/bounds/bottom sheet | API-LEAD | Q1~Q24 시나리오, Android 영상 |
| P4 | MOBILE-APP | 5탭, 업체 상세, 커뮤니티/저장 UI, 내 정보 UI-only | API-LEAD | 화면 상태/접근성/스크린샷 |
| P5 | AI-ENGINE | real LLM/parsing/grounded compare, 비용/주입 방어 | API-LEAD | no-hallucination/eval/result IDs |
| P6 | QA-INTEGRATION | E2E/접근제어/API·Zod/OpenAPI, Android demo | 모든 담당 | 전체 통합 체크리스트 |

**병렬 가능 범위:** P1/ P3/ P4는 계약 인터페이스 승인 후 병렬 진행. 하나의 파일(`packages/vendor-contracts/index.ts`, 루트 AGENTS, migration)을 여러 에이전트가 동시에 수정 금지. DB 파괴적 작업은 별도 승인.

## PR마다 요구
- 담당 scope/path와 변경 diff, 수용 기준/명세 링크, 실행한 test 명령과 실제 결과.
- `PROPOSED` 계약을 구현한 경우 OpenAPI+Zod+Route+모바일 사용처+RLS 일치 증명.
- 다른 팀원의 코드 충돌을 발견하면 자동 재작성/force push 대신 BLOCKED 보고.
- 성공/실패 상태를 반드시 분리; 다음 에이전트가 누락된 작업을 파악할 수 있도록 handoff 노트 작성.

## Codex 최초 실행 프롬프트 (그대로 전달 가능)
> `AGENTS.md`와 `docs/decisions/approved-ux.md`, `docs/reviews/CONFLICTS.md`, 본 문서, 담당 폴더 AGENTS를 먼저 읽어라. 현재 main과 브랜치 diff를 조사하고 **코드나 DB는 아직 수정하지 말고** 실행 계획/변경 파일/차단 결정을 1차 보고해라. 승인된 UX와 미확정 기술 제안을 구분하라. 모르는 사항은 사용자에게 질문하고 절대 임의 결정하지 마라. 운영 DB, 기존 migration, 다른 팀원의 코드는 무단 수정하지 마라. 작업을 받으면 단일 소유 scope의 작은 PR로 구현하고 테스트 실측 결과를 보고하라.`
