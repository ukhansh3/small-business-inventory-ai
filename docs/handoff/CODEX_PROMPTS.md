# 코덱스 에이전트별 시작 프롬프트 (복사해서 사용)

> **지금은 작업 범위와 구현 계획을 제출하도록 하는 1차 프롬프트다.** 코드를 곧장 수정하거나 운영 DB에 SQL을 실행하는 프롬프트가 아니다. 팀 승인/업무 분리 이후에만 실작업을 수행한다.

## 0. 전체 에이전트 공통 프롬프트

```text
천하장사 데모 프로젝트다. 시작 전에 루트 AGENTS.md, 담당 경로의 AGENTS.md,
docs/decisions/approved-ux.md, docs/reviews/CONFLICTS.md,
docs/handoff/agent-work-packages.md, docs/handoff/definition-of-done.md를 읽어라.
작업 브랜치는 `dev`로 고정하고 main 병합/변경을 하지 마라.
**기존 Supabase DB 재사용은 필수**: 현재 연결 프로젝트/스키마/RLS/RPC/기존 적용 migration을 확인하라.
**기존 모바일·백엔드 앱 소스 재사용은 선택**: 재구현할 수 있지만 DB 계약·기존 팀원 파일은 보호하라.
`docs/handoff/DEV-SCOPE-OVERRIDE.md`를 반드시 읽어라.
제품 요구사항에서 확정된 UX와 문서만 있는 제안 계약을 구별하라.
다른 팀원 파일/브랜치, 과거 migration, 운영 DB, 개인정보는 보호하라.
모호한 사실이나 중요한 기술/정책 결정을 임의로 정하지 말고 사용자에게 질문하라.
지금은 코드를 고치지 말고 변경 대상 파일, 구현 순서, 테스트, 차단 결정 및 위험을 먼저 보고하라.
실행하지 않은 테스트가 통과했다고 주장하지 마라.
```

## 1. ARCH / DB-SECURITY

```text
공통 지침을 따르며 docs/architecture/demo-boundary.md,
docs/database/schema.md, docs/database/rls-matrix.md, migration-plan.md를 검토하라.
기존 Supabase DB를 그대로 연결한 상태에서 공개 승인 업체를 읽기 전용으로 사용하고,
시연 데이터만 세션별 격리할 안전한 신규 테이블/RLS 설계의 실현 가능성을
현재 dev의 migration/RPC 및 실제 DB 권한과 비교해 보고하라. 특히 anonymous Auth가 운영 등록/심사
권한을 우회하지 못하는지 음성 테스트 계획을 작성하라.
운영 DB를 변경/삭제/마이그레이션 적용하지 마라. 승인되지 않은 환경 구성은 BLOCKED로 표시하라.
```

## 2. API / CONTRACT

```text
공통 지침을 따르며 docs/api/endpoint-index.md, openapi.yaml,
packages/vendor-contracts/index.ts, Next.js Route 파일, docs/architecture/data-flow.md를 대조하라.
현행 GET /vendors, /vendors/{id}는 보존하고 viewport bounds/지도 전체 업체와
20개씩 목록 로딩, 시연 세션/커뮤니티/저장 API를 어떻게 수직 구현할지 계획하라.
OpenAPI의 PROPOSED route는 아직 dev/실제 서버에서 구현됐다고 단정할 수 없다. Zod/API/DB drift와 API별
권한 테스트를 빠짐없이 보고하라. 기존 shared contracts를 다른 에이전트와 동시 수정하지 마라.
```

## 3. MOBILE-MAP

```text
공통 지침을 따르며 docs/features/vendor-search.md, docs/ui/screens/vendor-search.md,
docs/ui/design-system.md, docs/ui/navigation.md, MAP-01~07 시나리오를 검토하라.
지도 중심/핀 카드/접힌 요약바/펼친 목록, 여러 품목 일치 정책, 클러스터, 
이 지역 검색(버튼 전 API 0회), bounds, 전체 마커 vs 목록 20개, 거리순·가격순 UI를 분석하라.
현재 WebView 이벤트 계약/Expo Router/카카오 SDK에 필요한 변경 목록과 안전 검증을 정리하라.
기존 지도/인증 코드 재사용은 선택이다. 필요시 새로 작성할 수 있으나 기존 Supabase DB 계약·보안 경계가 유지되도록 API-LEAD와 합의하라. 팀원 파일 임의 삭제 금지.
```

## 4. MOBILE-FEATURES

```text
공통 지침을 따르며 docs/ui/screens/vendor-detail.md, ai-assistant.md, community*.md,
saved.md, profile-ui-only.md와 docs/ui/navigation.md를 검토하라.
5탭(지도/AI/커뮤니티/저장/내 정보), 검정 글씨/주황/흰 배경, 저장 상태 전역 동기화,
로딩·오류·빈 결과 및 접근성 검증 계획을 작성하라.
내 정보 업체 관리 페이지는 UI만 만들고 실제 업체 등록/승인 백엔드는 개발하지 마라.
미구현 클릭을 성공이라고 표시하지 마라.
```

## 5. AI-ENGINE

```text
공통 지침을 따르며 docs/features/ai-assistant.md, docs/api/ai-assistant/*,
docs/architecture/demo-boundary.md를 읽어라.
실제 LLM 서버 호출, 자연어 제약 추출, 공개 DB 근거 기반 결과 DTO,
규격 불일치 가격 비교 중단, 프롬프트 인젝션/환각 방지, 모델 장애/비용 관리,
세션 대화 유지·초기화와 실측 평가 계획을 작성하라.
모델 제공자/키/비용이 정해지지 않았으면 사용자에게 질문하고 BLOCKED로 보고하라.
업체명·가격·배송조건은 LLM 자유문장보다 서버 검증 레코드의 원본 필드를 우선하라.
```

## 6. QA-INTEGRATION

```text
공통 지침을 따르며 docs/handoff/qa-matrix.md,
docs/scenarios/end-to-end-demo.md, docs/reviews/CONFLICTS.md를 읽어라.
RLS 교차 세션/운영 데이터 불변, Android 모바일 지도·WebView bridge,
5탭 시나리오, 저장/커뮤니티/AI 실제 호출 근거를 테스트 시나리오로 작성하라.
명세·OpenAPI·Zod·서버 응답 일치 검증을 설계하라.
`PASS`는 실제 실행 로그가 있을 때만 쓰고 미실행은 `NOT RUN`으로 보고하라.
```
