# 천하장사 개발 가이드

상태: `차승호` 브랜치 팀 검토안  
기준: `main` 커밋 `290da35` (2026-11-04)

이 문서는 현재 저장소를 새로 설계하는 문서가 아니라, 이미 구현된 모바일·서버·Supabase 구조를 팀이 같은 방식으로 수정하도록 정리한 가이드다.

## 1. 제품과 개발 원칙

천하장사의 현재 P0 실험은 승인된 공급업체를 지도·목록에서 찾고 품목·가격·배송 조건을 확인하는 흐름이다. 업체 직접 등록과 운영자 검토는 이 데이터를 유지하는 방법이다.

- 인터뷰 문제와 제품 기능을 구분한다.
- 공개 가격을 실시간 최저가 또는 업체 보증 견적으로 표현하지 않는다.
- AI와 커뮤니티는 샘플이며 P0 구현 계약이 아니다.
- 기능 수보다 데이터 출처·비교 가능성·권한·오류 구분을 우선한다.

## 2. 현재 아키텍처

```text
Expo React Native 앱 (apps/mobile)
  ├─ Supabase Auth: 로그인·세션
  └─ HTTPS API 호출
          ↓
Next.js 서버 (apps/cheonhajangsa)
  ├─ /api/v1/vendors 등 Route Handler
  ├─ 권한 확인·Zod 검증·지오코딩
  ├─ /mobile-map 카카오 지도 페이지
  └─ Supabase service role은 필요한 서버 작업에만 사용
          ↓
Supabase PostgreSQL/PostGIS/Storage
  ├─ 승인 업체·revision·품목·가격
  ├─ RLS/RPC
  ├─ 비공개 업체 사진
  └─ 별도 mvp_public_vendors 시연 테이블
```

현재 지도 페이지는 Vercel에 배포 기록이 있지만 전체 업체 API의 상시 배포를 뜻하지 않는다. API는 로컬 서버 실연결을 확인한 상태다. Vercel API 이전은 새 ADR과 배포 검증 후 상태를 바꾼다.

## 3. 기술 스택

| 영역 | 현재 선택 |
|---|---|
| 모바일 | TypeScript, React Native, Expo Router |
| 서버·지도 | TypeScript, Next.js App Router, Route Handler |
| 계약 검증 | Zod (`packages/vendor-contracts`) |
| DB | Supabase PostgreSQL + PostGIS |
| 인증 | Supabase Auth |
| 파일 | Supabase Storage, 비공개 버킷 |
| 지도 | 카카오 지도 JavaScript SDK를 WebView 페이지에서 사용 |
| 주소 좌표 | 카카오 REST 지오코딩, 서버에서만 호출 |
| 테스트 | Vitest, PGlite 테스트 대역, 필요 시 Playwright |
| 앱 배포 | Expo EAS 후보, 정식 스토어 배포 미완료 |

## 4. 디렉터리 책임

```text
apps/mobile/
  src/app/           Expo Router 화면
  src/components/    화면 공용 컴포넌트
  src/domain/        모바일 도메인 변환·표시 규칙
  src/lib/           API·Supabase·세션
  tests/             모바일 단위·계약 테스트

apps/cheonhajangsa/
  app/api/v1/        HTTP API
  app/mobile-map/    모바일 WebView 지도
  lib/server/        인증·DB·외부 API 서버 로직
  lib/contracts/     서버 어댑터. 공용 DTO는 packages를 우선
  tests/             API·DB·지도 계약 테스트

packages/vendor-contracts/
  index.ts           공유 Zod DTO와 타입 정본

supabase/migrations/
  적용 순서가 고정된 SQL. 적용 후 파일 수정 금지
```

과거 웹 프로토타입과 Java WebView APK가 서버 폴더에 남아 있지만 실제 사용자 앱 기준은 `apps/mobile`이다. 삭제·이동은 이번 평가 보완과 분리한 구조 정리 PR에서 결정한다.

## 5. 데이터 종류

### 승인 업체 (`live`)

업체 소유자가 초안을 만들고 운영자가 승인한 현재 공개본이다. 수정은 새 revision을 거친다.

### 공공업체 시연 (`mvp_demo`)

공공 원문의 업체명·업종·주소와 가상 가격·조건을 명시적으로 분리한 시연 데이터다. 승인 업체 검색과 섞지 않으며 업체가 제공한 가격으로 표현하지 않는다.

### 테스트 fixture

자동 테스트와 시뮬레이터 확인용이다. 이름에 `[가상테스트]`를 붙이고 실제 서비스 데이터로 복사하지 않는다.

## 6. 주요 흐름

### 업체 검색

1. 모바일이 중심 좌표·반경·검색어·분류를 보낸다.
2. 서버가 인증 토큰과 query schema를 검증한다.
3. DB가 현재 승인본과 공개 가능한 품목만 반환한다.
4. 서버가 공용 contract로 응답을 검증한다.
5. 모바일 목록과 지도는 같은 vendor ID 집합을 표시한다.

### 업체 등록·검토

1. 사장 계정이 업체·품목·가격·사진 초안을 저장한다.
2. 서버가 사용자 토큰에서 주체를 결정한다.
3. 주소는 서버에서 좌표를 확인한다.
4. 제출된 revision을 운영자가 승인 또는 보완 요청한다.
5. 승인 시 기존 공개본을 보존하며 새 현재본으로 전환한다.

세부 계약은 `docs/contracts/vendor-registration-v1.md`를 따른다.

## 7. API 변경 규칙

- 요청·응답 변경은 `packages/vendor-contracts`를 먼저 수정한다.
- 서버 테스트와 모바일 소비 코드를 같은 PR에서 수정한다.
- 응답에서 `null`, `0`, 빈 문자열의 의미를 섞지 않는다.
- 오류는 인증 실패, 권한 실패, 입력 오류, 결과 없음, 외부 장애, DB 준비 안 됨을 구분한다.
- 클라이언트가 보낸 `user_id`, `role`, 승인 상태를 신뢰하지 않는다.
- `service_role`을 일반 조회 편의를 위해 사용하지 않는다.

## 8. 환경변수

서버 전용:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
KAKAO_REST_API_KEY
NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY
```

모바일 공개 설정:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_KAKAO_MAP_URL
```

모바일 공개 변수에 서버 비밀키를 넣지 않는다. 실제 값은 `.env.local`에 두고 Git에 커밋하지 않는다.

## 9. 팀 역할과 인터페이스

- 모바일 담당: 화면·탐색 흐름·권한 UX·API 소비·모바일 테스트
- 서버 담당: 인증·DTO·API·외부 지도/지오코딩·서버 테스트
- DB 담당: migration·RLS·RPC·Storage·seed/fixture 경계·복구 절차

역할은 코드 소유권이 아니다. 공용 contract와 SPEC을 인터페이스로 사용하며, API 예시를 메신저에만 남기지 않는다.

## 10. 브랜치 작업 순서

1. 최신 `main`에서 개인 브랜치를 만든다.
2. 관련 ADR·SPEC·contract·테스트를 읽는다.
3. 작은 단위로 구현하고 테스트를 먼저 또는 함께 추가한다.
4. 앱별 `test`, `typecheck`, `lint`를 실행한다.
5. 동작이 바뀌면 구현 상태와 검증 기록을 갱신한다.
6. PR에서 팀원 검토 후 `main`에 병합한다.

## 11. 완료 기준

- 관련 테스트·typecheck·lint가 통과한다.
- 실제 연결을 주장하면 실행 환경·날짜·증거가 있다.
- 샘플과 실제 데이터가 UI와 문서에서 구분된다.
- SPEC·contract·구현 상태가 같은 동작을 말한다.
- 미검증 항목을 숨기지 않는다.

## 12. 구조 개편 원칙

장기적으로 서버 폴더 이름과 중복 lockfile을 정리할 수 있지만, 현재 구현을 깨뜨리는 대규모 이동은 평가 문서 수정과 분리한다. 구조 개편 PR은 다음을 만족해야 한다.

- 파일 이동만 하는 커밋과 동작 변경 커밋을 분리
- Vercel·Expo 경로와 import 대조
- 두 앱 전체 테스트·빌드 통과
- README·AGENTS·배포 문서의 경로 동시 수정
- 팀원 1명 이상의 승인
