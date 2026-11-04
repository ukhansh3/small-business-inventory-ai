# 천하장사 — 코덱스 개발 인계 패키지 v3.0 (2026-11-04)

**상태: 문서·설계안 작성 완료 / GitHub 코드 수정 없음 / 실제 DB migration·배포·Android 시뮬·전체 테스트 미실행.**

이 ZIP은 기존 v2.4(기능·API·DB·UI 초안 + 결정 기록) **전체를 보존**하고, 빠진 AGENTS/아키텍처/계약/검토/시나리오/코덱스 작업 분담을 추가한 **작업 제안**이다. 사용자 승인 UX와 기술 제안이 다르므로, 팀 코드에 넣기 전에 반드시 검토한다.

## 핵심 파일 순서
1. `DECISIONS.md`, `docs/decisions/approved-ux.md`: 최신 승인 UX/범위.
2. `docs/reviews/CONFLICTS.md`: 현재 main 대비 충돌/보안 차단 요소.
3. `AGENTS.md` + 각 하위 AGENTS: 코덱스·팀원 보호/결정 규칙.
4. `docs/architecture/{system-overview,demo-boundary,data-flow}.md`: Auth/데모 DB/세션/데이터 흐름.
5. `docs/features/`, `docs/ui/`, `docs/api/`, `docs/database/`: 기능별 구현 근거.
6. `docs/api/openapi.yaml` (**새 기능은 PROPOSED**, 현행 서버와 동일하지 않음), `docs/api/conventions.md`, `docs/database/rls-matrix.md`.
7. `docs/scenarios/`, `docs/handoff/`: 화면 시나리오, 에이전트 분담 및 합격 기준.

## 사용자 확정 이번 데모
- 실동작: 지도 탐색/업체 상세, **실제 모델+업체 검색 AI**, 커뮤니티, 업체·글 저장.
- UI만: `내 정보·업체 관리`; 기존 등록/승인 코드는 보존하되 신규 백엔드는 이번 구현 제외.
- 로그인 UI 없음, 내부 안전한 시연 세션만; 데이터는 세션별 분리, 새 시연 시작 시 초기화.
- 실제 공개 업체 읽기 전용, 가상 가격/업체는 표시 및 분리. 5탭, 흰 배경·검정 텍스트·주황 포인트.

## 실구현 차이 / 작업 차단
- 현재 `main`은 4탭/로그인 필요/AI 샘플/커뮤니티 정적/저장 부재.
- `docs/api/openapi.yaml`은 **목표 인터페이스 제안**이다. Zod, 서버, DB와 자동 일치한다는 뜻 아님.
- **데모 프로젝트/운영 DB 격리 방식**, anonymous Auth 및 권한/RLS, LLM 키/예산 등은 실행 전 승인 필요; 모든 에이전트는 모호하면 사용자에게 질문하고 중단.
- 기존 `SPEC.md`/운영 migration/연구 증거를 삭제하거나 임의 덮어쓰지 말 것.
- 실제 PR 생성/DB 반영/테스트 실행은 이번 산출물에 포함하지 않았다.

## 검사 스크립트
`python scripts/check_spec_package.py` 로 zip 내 Markdown 링크 존재·AGENTS 구성·OpenAPI 파싱/경로 문서 대응을 정적 점검할 수 있다. (실제 코드 동작 테스트는 아님.)

## 이전 버전
`docs/reviews/v2_4_original_readme.md`에 v2.4 원문을 보존함.
