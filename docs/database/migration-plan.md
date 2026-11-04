# Supabase 마이그레이션·리셋 도입 순서 (실행되지 않음)

- 현재 운영 DB는 **변경하지 않는다.** `supabase/migrations/*` 원본 적용 여부·차이 확인 후 기존 DB와 호환되는 **추가 migration 초안을 작성**. 실제 DB에 적용하지 않음.
- 마이그레이션 파일 하나의 이름 충돌 없도록 타임스탬프 접두어, up만 지원하는 환경이면 복구는 백업/새 migration으로 수행.
- Phase 0: **기존 Supabase DB 재사용 필수**. 기존 DB의 실제 테이블/적용 migration/RLS/RPC/Storage를 읽기 전용으로 인벤토리 확인. 시연용 별도 스키마/테이블·권한 격리안과 anonymous Auth 가능 여부를 관리자에게 승인 요청.
- Phase 1: demo sessions/actors + RLS + 로그/스토리지 최소 정책 + 통합 test.
- Phase 2: 커뮤니티/이미지/신고 + RLS + full text 정책.
- Phase 3: vendor saves / post saves / AI messages + RLS.
- Phase 4: map viewport bounds PostGIS 검색 RPC, 전체 마커 배치 조회와 stable 20건 pagination. 승인 공개 레코드에만 적용.
- Phase 5: reset 트랜잭션 / 스토리지 청소/TTL + 위험·롤백 검증.

**절대 금지:** 기존 migration 편집, 운영 승인 업체 UPDATE/DELETE, 실사용자 role 자동 할당, 운영 Supabase service_role 키를 모바일에 노출.

**dev 우선 규칙:** `docs/handoff/DEV-SCOPE-OVERRIDE.md`. 별도 DB 신규 생성·이전은 기본안 아님. Existing DB reset/seed 덮어쓰기 금지.
