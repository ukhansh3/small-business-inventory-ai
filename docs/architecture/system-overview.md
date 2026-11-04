# 기술 시스템 개요 — 제안 (현재 코드와 구별)

## 현재 main에서 확인된 구성
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

## 운영 데이터 보호를 위한 **권고 구현 옵션**
1. **권고:** 시연 전용 Supabase 프로젝트/DB에 공개 가능 업체 정보의 *출처/갱신일을 명시한 읽기전용 스냅샷*과 시연 쓰기 테이블을 모두 배치. 인증/DB 정책/시드 리셋을 운영과 물리적으로 분리. 원본 실데이터와 갱신 주기를 보장할 수 없다면 `최근 동기화` 시각 표시.
2. 대안: 동일 DB 내 스키마/테이블 분리 + 익명 Auth 사용자 구별 + write 권한 차단을 엄격한 RLS로 보장. **현재 `authenticated` 역할이 실제 등록 RPC에 접근할 가능성**을 모두 검증해야 하므로 운영 환경에서는 기본 선택 금지.
3. 별도 시연 프로젝트를 사용한다면 운영 DB에서 직접 읽는다고 가정하지 않는다. 승인된 공개 정보의 수동 또는 안전한 단방향 복제 방식을 사람에게 확인받는다.

**팀 승인 전 어느 옵션도 적용하지 말 것.** 인증 없는 공개 쓰기, shared service_role 우회, 모바일에 비밀키 저장은 절대 불가.
