# 천하장사

자영업자가 익숙하지 않은 품목이나 공급업체를 알아볼 때 가격·품질·배송 조건을 비교하도록 돕는 **모바일 공급업체 탐색 MVP**입니다.

현재 저장소에는 실제 Supabase를 사용하는 업체 등록·검토·검색 흐름과 별도의 공공업체 시연 데이터가 구현돼 있습니다. 코드 구현은 사용자 문제와 수요가 검증됐다는 뜻이 아닙니다. 문제 근거는 인터뷰 문서, 제품 결정은 ADR, 동작 계약은 SPEC에서 각각 확인합니다.

## 현재 기준

- 기준 커밋: `290da35` (`main`, 2026-11-04)
- 사용자 앱: `apps/mobile` — Expo·React Native Android/iOS
- API·지도 페이지: `apps/cheonhajangsa` — Next.js Route Handler와 카카오 지도 WebView 페이지
- 운영 데이터베이스: Supabase PostgreSQL·PostGIS
- 공용 계약: `packages/vendor-contracts`

## 구현 상태

| 영역 | 현재 상태 |
|---|---|
| 이메일 인증·세션 | Supabase 로그인 실연결 확인, 전체 계정 수명주기 추가 검증 필요 |
| 승인 업체 검색 | 실제 Supabase 승인본·품목·가격 조회 확인 |
| 지도·목록·상세 | 카카오 지도와 업체 핀·상세 표시 확인 |
| 업체 등록·검토 | DB·API·모바일 화면 구현, 사장→운영자 전체 흐름 실기기 검증 필요 |
| 공공업체 MVP | 공공 원문 8곳과 가상 시연 가격을 별도 테이블·화면으로 분리 |
| AI 도우미 | 샘플 화면, 실제 모델·DB 근거 검색 미연결 |
| 커뮤니티 | 샘플 화면, 작성·댓글·신고·DB 저장 미구현 |

세부 상태와 검증 범위는 [구현 현황](docs/product/implementation-status.md)을 정본으로 사용합니다.

## 문제 근거 상태

- 자영업자 인터뷰 12건을 수행했습니다.
- `I01~I06`, `I09`, `I10`, `I12`의 9건은 구조화된 요약이 있습니다.
- `I07`, `I08`, `I11`은 음성은 있으나 구조화·직접 인용 대조가 남아 있습니다.
- 가격만이 아니라 품질·배송·운반·기존 관계가 선택 기준으로 관찰됐습니다.
- 공개 커뮤니티 공유와 지도 사용 필요성은 인터뷰만으로 확인되지 않았습니다.

따라서 지도형 업체 탐색은 검증 완료 요구사항이 아니라 **데이터 확보 가능성과 사용 행동을 시험하는 제품 실험**으로 다룹니다.

## 문서 정본

| 문서 | 역할 |
|---|---|
| [AGENTS.md](AGENTS.md) | 사람·AI 에이전트의 절대 작업 규칙 |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | 현재 아키텍처, 역할, 개발·검증 절차 |
| [SPEC.md](SPEC.md) | 범위, API, 수용 기준과 합격선 |
| [ontology.yaml](ontology.yaml) | 인터뷰로 역추적되는 문제 도메인 개념 |
| [문제 정의](docs/product/problem-statement.md) | 대상·비대상·대가·반증 조건 |
| [인터뷰 인덱스](docs/interviews/index.md) | 인터뷰별 자료·분석 상태 |
| [증거 원장](docs/evidence/evidence-ledger.md) | 주장과 지지·반대 근거 연결 |
| [ADR 목록](docs/decisions/README.md) | 방향 변경과 승인 기록 |
| [DB 적용 안내](supabase/README.md) | migration, 환경변수, 권한 검증 |

문서가 충돌하면 최신 채택 ADR → SPEC → ontology → 공용 계약 → 개발 가이드 순으로 판단합니다. 인터뷰 사실은 인터뷰 로그와 증거 원장을 우선합니다.

## 로컬 실행

### API·지도 서버

```bash
cd apps/cheonhajangsa
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm dev
```

### 모바일 앱

```bash
cd apps/mobile
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm start
```

실제 키는 커밋하지 않습니다. 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`, 카카오 REST 키 등은 모바일의 `EXPO_PUBLIC_*` 변수에 넣지 않습니다.

## 데이터 구분

- `live`: 업체가 제출하고 운영자가 승인한 공개본
- `mvp_demo`: 공공 업체 원문과 명시적으로 분리된 가상 시연 가격·조건
- `[가상테스트]`: 자동 테스트와 화면 검증용 fixture

가상 가격을 실제 업체 가격, 견적 또는 검증된 거래 정보로 표현하지 않습니다. [공공업체 MVP 출처와 제한](docs/data-sources/public-vendor-mvp.md)을 확인합니다.

## 브랜치와 승인

- `main`에 직접 작업하지 않습니다.
- 개인 브랜치에서 커밋하고 PR로 변경 이유·검증 명령·미검증 항목을 공유합니다.
- DB schema, API 계약, 인증·공개 범위, 제품 P0 변경은 팀원 승인 후 병합합니다.
- 평가 보완 변경은 개인 브랜치의 PR에서 검토합니다.

## 팀원

- 202128675 김민균
- 202020794 차승호
- 202220437 송민혁

## 개인정보

실명, 개인 연락처, 정확한 매장 주소, 동의서 원본과 전체 전사본은 공개 저장소에 커밋하지 않습니다. 인터뷰 인용은 익명화하고 음성과 대조된 경우에만 직접 인용으로 표시합니다.
