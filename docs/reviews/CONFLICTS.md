# 통합 문서 충돌·갭 검토표 — v3.1 dev 기준 / 2026-11-04

> `RESOLVED_DOC`는 **문서 상 우선순위 정리**만 의미. 코드·DB 구현/실행 검증이 아니라면 `OPEN_IMPLEMENTATION` 유지.

| ID | 발견된 차이/위험 | 영향 | 문서상 조치 | 상태 |
|---|---|---|---|---|
| X01 | `SPEC.md` 초안은 verified 계정·댓글/저장 제외·반경 검색; 사용자 승인 데모는 로그인 UI 없음·댓글/저장 포함·bounds 검색 | 기능 범위 충돌 | 초기 SPEC는 팀 검토용 원형으로 보존, 최신 승인 `approved-ux.md` 별도 정본. 팀 합의 ADR 필요 | RESOLVED_DOC / OPEN_TEAM_REVIEW |
| X02 | main 모바일 탭 4개/내 업체 vs 목업 5개/저장/내 정보 | 네비게이션 | tabs refactor 작업 지정 | OPEN_IMPLEMENTATION |
| X03 | `colors.ink=#18283A` 남색 vs 사용자 승인 검정 텍스트 | 디자인 | `docs/ui/design-system.md`에 차이 명시, 모바일 tokens 변경 | OPEN_IMPLEMENTATION |
| X04 | `docs/ui/AGENTS.md`에 `Q15 미결정` 흔적 | 잘못된 동작 구현 | 새 파일에서 Q15 확정 정책으로 정정, 결정 정본 명시 | RESOLVED_DOC |
| X05 | 기존 `GET /vendors`는 center/radius/20건; 승인 viewport bounds/지도 전체 업체/목록 20건 | API·DB·성능 | 제안 endpoint + 좌표/전체 마커 조회 설계, Zod/SQL 수정 필요 | OPEN_IMPLEMENTATION |
| X06 | 현재 카카오 WebView는 마커 선택만 전달, 지도 bounds/drag/zoom/cluster/labels 미지원 | 지도 UI | 브리지 이벤트·유효성·클러스터 구현 작업 분리 | OPEN_IMPLEMENTATION |
| X07 | main API는 `Authorization: Bearer` 필수; 승인 UX는 로그인 UI 없음 | 전체 기능 차단 | 내부 안전 세션; 데모와 운영 데이터 분리 팀 승인 | BLOCKED_ARCH_APPROVAL |
| X08 | existing production registration/RPC의 `authenticated`가 익명 세션에 잘못 열릴 위험 | 운영 데이터 | 익명 Auth 권한과 기존 RLS 전체 검사, 운영 DB 변경 전 사람 승인 | SECURITY_BLOCKER |
| X09 | AI 화면은 샘플 검색, 서버 LLM 없음 | AI-07 미충족 | 서버 모델 API, 업체 조회, 사실 검증, 비용 제한 | OPEN_IMPLEMENTATION |
| X10 | 커뮤니티는 정적 2글, 저장 탭/DB 없음 | C/S 미충족 | 세션별 API/DB 및 17 community, 저장 API 구현 | OPEN_IMPLEMENTATION |
| X11 | AI/커뮤니티/저장 문서의 세션 테이블 이름/역할 전제 중복·불일치 가능 | DB | `docs/architecture/demo-boundary.md` + `docs/database/schema.md`를 단일 논리 정본으로 통합 | RESOLVED_DOC / OPEN_SCHEMA |
| X12 | 가격순 정렬은 승인됐지만 규격·세금·배송비 비교 식은 미승인 | 오도 가격 순위 | 비교 가능한 경우에만 가격순, 불가능한 비교는 '가격 비교 불가' 노출; 기술안 승인 전 단위 정렬 금지 | OPEN_POLICY |
| X13 | 한 뷰포트의 전체 업체 지도 표시 vs 무한 zoom-out/서버 비용 | 신뢰·성능 | 결과 묵살 금지, 서버 페이지 수집 및 범위 제한 UX 기술안 검토 | OPEN_POLICY |
| X14 | 실업체 vs `mvp_synthetic_vendors` 가상 데이터의 확인일/물리 스키마 다름 | 오표기/검색 | 출처 분리 adapter, 가상 정보 명시, 공개 데이터 날짜 표시 | OPEN_IMPLEMENTATION |
| X15 | 기존 `register`/`moderation` 코드가 존재하지만 현재 `내 정보`는 UI만 요구 | 범위 확대 위험 | 기존 코드 보존; 새 구현 워크패키지 배정 제외. 준비 중 버튼 오동작 방지 | RESOLVED_DOC / OPEN_UI |
| X16 | 가상 쓰기 데이터 Storage reset/권한·업로드 청소 불명확 | 이미지 누출·비용 | 세션 ID 기반 키/서버 검사/GC·자동 리셋 테스트 | SECURITY_BLOCKER |
| X17 | `docs/api/openapi.yaml` 신설 제안 계약과 현재 Zod/서버 구현이 아직 다름 | 코드/명세 drift | 표에서 현행/제안 구분. 구현할 때 DTO 계약 테스트 필수 | OPEN_IMPLEMENTATION |
| X18 | 배포 URL, API, Kakao 도메인 허용, LLM 키, Auth 대시보드 실제 연결 미검증 | 시연 중 오류 | smoke test 및 환경 확인을 완료 전 필수로 지정 | OPEN_VERIFICATION |

## v3.1 dev 작업 주의
- X01~X18은 v3.0 제작 당시 `main` 코드와 비교한 기록으로 **이번 dev에 대한 최종 검증 결과가 아님**. 구현 전에 현재 `dev` 파일 및 실제 기존 Supabase DB와 재검증한다.
- 사용자 승인: 기존 DB 재사용 필수/기존 앱 코드 재사용 선택/`dev`에서만 작업. `docs/handoff/DEV-SCOPE-OVERRIDE.md`가 이 세 가지에 우선한다.
- 루트/앱별 AGENTS는 2026-11-04 조회한 `dev` 기존 내용에 addendum을 합쳐 준비했다. GitHub 업로드 직전 최신 내용과 비교하고 다른 사람이 수정했으면 업로드 중단 후 재병합한다.
- 이번 ZIP은 제안 문서다. GitHub 업로드/SQL 적용/테스트는 별개이며, 실제 DB에 변경이 적용된 사실을 주장하지 않는다.

| X19 | 기존 운영 DB를 반드시 계속 사용해야 함 | 신규 별도 DB 기본안이 사용자 의사와 충돌 | `DEV-SCOPE-OVERRIDE`에서 기존 DB 유지 확정. 제안 아키텍처/마이그레이션 계획 수정 | OWNER_APPROVED / OPEN_SECURITY_VERIFICATION |
| X20 | 기존 앱 코드 재사용 의무 없음 | 기존 앱 구조에 강제 고정될 위험 | 새 구현 선택 허용. DB 계약/팀 소유 파일 보호 | OWNER_APPROVED |
| X21 | `dev`는 `차승호` 기준. main 자동 병합 금지 | main에 잘못 업로드한 이력 있음 | `dev` 직접 커밋만 허용하고 대상 브랜치 UI에서 재확인 | OWNER_APPROVED |
