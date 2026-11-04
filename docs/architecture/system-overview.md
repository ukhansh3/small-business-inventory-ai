# 기술 시스템 개요 — 제안 (현재 코드와 구별)

## v3.0 작성 당시 main에서 관찰된 구성 (dev/실제 DB 재검증 필요)
- Expo SDK 58 / React Native + Expo Router: `apps/mobile`.
- Next.js 웹 및 API Route Handler / 카카오 지도 WebView 페이지: `apps/cheonhajangsa`.
- 공유 Zod: `packages/vendor-contracts/index.ts`.
- Supabase Auth/Postgres/PostGIS/RLS/Storage. 기존 등록/검토 API와 migration 존재, 변경·삭제 금지.
- 기존 공개 업체 API도 `endpoint()`가 **Bearer 세션을 요구**. 로그인 화면만 제거한다고 해결되지 않음.
- AI 탭은 샘플 키워드 검색만, 커뮤니티는 예시 글, 저장 탭은 없음. 새 구현은 전부 `NOT IMPLEMENTED`.

## 제안하는 데모 데이터 경계 (실행 전 팀 승인 필요)
```text
Expo 모바일 (로그인 UI 없음, 5탭)
    │  내부 비대화형 세션 / Bearer (클라이언트에는 publishable key만)
    ▼
Next API (Zod 검증 / rate limit / 데모 actor 권한 / AI 키 서버 보관)
    ├─ 공개 업체 조회 어댑터 (읽기 전용, 승인·공개 레코드만)
    ├─ 지도 가시 영역 검색 + 전체 마커 스트리밍 + 목록 20건
    ├─ AI: 의도 파싱 → 공개 업체 조회 → 모델 설명 → 구조화 결과 검증
    └─ 시연용 커뮤니티 / 저장 / 대화 / 시연 관리자 API
          ▼
시연 DB 영역 (세션 별 RLS, 쓸 수 있는 범위 제한)
          ▲
새 시연 시작/만료 시 시연 행만 초기화
```

## 이번 dev 데모의 확정 DB 경계 (구조는 구현 제안)
- **기존 Supabase 프로젝트/DB를 반드시 재사용**한다. 신규 별도 Supabase 프로젝트로 대체하거나 운영 데이터를 복사한 DB를 정본으로 삼지 않는다.
- 승인된 공개 업체/품목/가격/원본 출처는 기존 테이블에서 **읽기 전용**으로 조회한다.
- 커뮤니티·AI 대화·즐겨찾기·세션별 시연 쓰기 자료는 기존 DB에 **새로운 분리 영역(테이블/스키마 및 RLS)**을 설계한다. 구체적 테이블/권한/세션·Storage 정책은 DB 소유자 승인 전에는 PROPOSED다.
- 새 시연 시작은 해당 세션의 시연용 쓰기 기록만 초기화한다. 기존 승인 업체/가격/검토 기록이나 실사용자 자료에 `DELETE`, `TRUNCATE`, `DROP`을 실행하지 않는다.
- 새 migration은 추가만 허용하고 실제 운영 DB 적용은 검토·백업·권한 검증 후 사람 승인이 필요하다.
- **앱 코드 재사용은 선택.** 기존 Expo/Next.js를 참조·재구현할 수 있지만 DB 계약 및 서비스 비밀키 보호는 유지한다.
- 인증 없는 공개 쓰기, shared service_role 우회, 클라이언트 비밀키 삽입은 절대 허용하지 않는다.
