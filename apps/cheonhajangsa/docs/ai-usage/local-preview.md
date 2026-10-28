# 로컬 앱 구현 및 검증 기록

- 날짜: 2026-10-28
- 요청: Downloads의 AGENTS.md와 DEVELOPMENT_GUIDE.md를 읽고 앱을 만들어 옆 창에 실행
- 도구: Codex, Node.js 24, pnpm, Next.js, TypeScript, ESLint, Vitest, CUA 브라우저의 Playwright 로케이터
- 위임: 하위 에이전트에 위임하지 않음
- 사람 검토: 아직 없음. 팀원의 코드 리뷰·승인이나 정식 MVP 완료로 간주하지 않음

## 구현 범위

별도 로컬 Next.js 앱의 fixture UI를 생성했다. 핵심 파일은 `components/app.tsx`, `components/ui/button.tsx`, `components/icons.tsx`, `features/search/model.ts`, `features/community/fixtures.ts`, `app/globals.css`, `tests/search.test.ts`다. 제공 문서 사본과 저장소 SPEC/ontology 참조 사본을 보존했다. 기존 탐색 저장소와 이전 MVP는 수정하지 않았다.

## 계약 충돌과 제외

C1 수량·단위, C2 실거래 관계, C3 배송 판정, C4 `/api/v1` 전환은 승인되지 않았으므로 구현하지 않았다. fixture 모델은 SPEC의 품목·반경·기존 배송 지원 의미를 참고한다. 실제 파일럿 지역, 품목, 인증·공개 범위를 확정하지 않았다. 데모 지역·품목 선택은 가상 화면 검증값이다.

실제 API, DB/PostGIS migration, RLS, Supabase Auth, Kakao SDK, OpenAI SDK 연결은 미구현이다. Kakao 대신 다른 지도 제공자를 도입하지 않았다. 위치 관계도는 실제 지도가 아님을 화면에서 명시한다. AI 탭도 실제 AI 미연결임을 표시하며, 수량 조건을 받으면 조건을 몰래 제거하지 않고 승인 대기를 안내한다. 작성·신고·운영자 기능은 동작하는 척하지 않으며 글 작성은 저장되지 않는 미게시 초안 미리보기다.

## 실제 검증

- `pnpm typecheck`: 통과
- `pnpm lint`: 통과
- `pnpm test`: Vitest 8개 통과
- `pnpm build`: 프로덕션 빌드 통과
- 브라우저 1440px: 가로 넘침 없음, 위치 마커·목록 ID 집합 동일 확인
- 브라우저 375px: 가로 넘침 없음, 하단 탭·도우미 검색·결과 카드 확인
- 100m 반경 결과 없음, 검색 오류 상태, 가격 null 업체의 상세(합계 계산 불가·확인일 없음·재확인 필요) 확인
- 도우미 fixture 조회와 미게시 초안 폼 미리보기 확인

`pnpm test:e2e` 자동화 스위트는 작성·실행하지 않았다. 브라우저 시나리오는 CUA의 Playwright API로 확인했다. 실제 지도, OpenAI 장애, Supabase 권한·RLS, 가격 제보 원자적 저장, 신고·숨김, 실제 파일럿 인증은 검증할 구현이 없어 미검증이다. 이를 통과했다고 보고하지 않는다.

## 발견 및 수정

TypeScript 7과 린트 파서 호환 문제를 지원되는 TypeScript 6으로 조정했다. pnpm 네이티브 설치 스크립트를 필요한 패키지만 명시 허용했다. 생성된 Next 개발 산출물이 ESLint에 들어간 문제를 빌드 디렉터리 제외로 수정했고 소스 규칙을 완화하지 않았다. Next Link와 폼 접근성, 네이티브 dialog focus 처리를 수정했다. 빌드의 로컬 프로세스 권한 문제는 승인된 권한으로 다시 실행해 확인했다.


## 카카오 지도 연결 추가 (2026-10-28)

사용자가 카카오 지도 연결을 명시적으로 요청했다. `lib/kakao/sdk.ts`와 `components/kakao-map.tsx`에 SDK 로더·실제 지도 인스턴스·마커·가격 라벨·선택 연결·리사이즈·오류 fallback을 추가했다. 새 런타임 의존성이나 공개 계약 변경은 없다. 실제 업체 수집과 Kakao Local API 호출은 추가하지 않았다.

린트, 타입 검사, 단위 테스트 총 10개, 프로덕션 빌드를 실행해 통과했다. SDK 키가 없는 상태의 fallback과 목록 유지를 화면에서 확인했다. JavaScript 키는 사용자가 발급·설정할 예정이므로 실제 카카오 지도 렌더링·도메인 인증 성공은 아직 미검증이다. 키나 토큰 값은 이 문서에 기록하지 않는다.

### 카카오 지도 실제 연결 확인

사용자가 JavaScript SDK 허용 도메인과 카카오맵 사용 설정을 완료한 뒤 실제 지도 타일과 가상 업체 마커 3개가 표시되는 것을 브라우저에서 확인했다. 가격 라벨에서 샘플 식자재 B를 선택하면 하단 카드가 같은 업체와 19,500원 가격으로 변경된다. 마커와 목록의 업체 ID 집합은 demo-v01, demo-v02, demo-v03으로 일치했다. 키 값은 기록하지 않았으며 .env.local은 커밋 대상이 아니다. 실제 업체·DB·AI 연결 상태는 변경되지 않았다.


## Android APK 및 휴대폰 프레임 검증 (2026-10-28)

사용자가 Android APK 설치 파일과 참고 이미지처럼 휴대폰 프레임 안의 화면을 명시적으로 요청했다. Next.js 정적 내보내기와 표준 Android Java WebView 셸을 사용했으며 별도 JS 네이티브 프레임워크·DB·공개 API는 추가하지 않았다. `/phone`은 iframe 기반 UI 미리보기이며 Android OS나 에뮬레이터로 표현하지 않는다.

실행 검증:
- `pnpm lint`, `pnpm typecheck`, `pnpm test`(총 10개), `pnpm build:android:web` 통과
- `aapt` 패키지·버전·API 24 이상 및 대상 API 34 확인
- APK 내부 `classes.dex`, `assets/web/index.html`, `_next` JavaScript 포함 및 .env 파일 미포함 검사 통과
- `apksigner verify --verbose`: v2/v3 서명 검증 통과
- API 35 읽기 전용 테스트 에뮬레이터에 최종 APK 설치 성공 및 MainActivity 실행 Status ok
- WebView 읽기 전용 진단: pageReady true, cards 3, markers 3, kakaoReady true, 지도 타일 6개 로딩 확인
- 브라우저 `/phone` 안에서 실제 카카오 지도와 업체가 표시됨을 확인

초기 패키징에서 `_next` 디렉터리가 기본 asset 제외 규칙에 걸린 문제와 javac 한글 경로 인코딩을 수정했다. Android의 외부 CDN 평문 차단은 보호를 해제하지 않고 Kakao 정적 CDN GET을 HTTPS로 가져오도록 수정했다. 빌드 산출물을 ESLint에서 제외했으며 소스 규칙을 완화하지 않았다.

산출물은 `android/dist/cheonhajangsa-debug.apk`, 체크섬·버전 정보는 `android/dist/release-info.json`에 있다. 개발용 서명·가상 데이터 앱이다. Google Play 배포, 실제 단말 테스트, 자동 Playwright E2E, Supabase 인증·RLS·공간 DB, 실제 OpenAI 도구 연결, 팀원 리뷰, Vercel 운영 배포는 완료하지 않았다. 가이드의 정식 MVP 완료 조건을 충족했다고 보고하지 않는다. 새 Git commit이나 push는 수행하지 않았다.


## Kakao Local REST 실제 호출 연결 (2026-10-28)

사용자가 제공한 REST 키를 저장한 뒤 실제 연결을 요구하여 서버 전용 주소 변환 모듈과 관리용 CLI를 추가했다. 파일: `lib/server/kakao-geocode.ts`, `scripts/geocode-address.mjs`, `tests/geocode.test.ts`. Node 내장 모듈과 기존 Zod를 사용해 새 런타임 의존성·공개 API 계약·인증 범위 변경은 없다.

공개된 아주대학교 도로명 주소로 실제 카카오 Local API 호출을 1회 실행해 `status: ok`, 후보 1건과 정상 위도·경도 응답을 확인했다. 이 주소는 개인 매장 주소가 아니다. 키·Authorization 헤더 값은 기록하지 않았다. 반환 좌표를 샘플 업체의 실제 위치로 바꾸거나 자동 승인하지 않았다. DB 저장은 Supabase 연결 이후 별도 작업이다.

린트·타입 검사와 전체 단위 테스트 17개가 통과했다. 지오코딩 테스트는 정상·키 누락·잘못된 주소·다중 결과·결과 없음·인증/권한 오류·한도 초과·네트워크/서버 장애·잘못된 좌표를 검증한다. 기존 APK에는 서버 코드나 REST 키를 포함하지 않았다.


## 주황색 UI 테마 변경

사용자 요청으로 카카오 지도 SDK·배경·데이터는 유지하고 앱의 공통 테마, 버튼, 가격, 탭, 카드 강조 색상을 주황색으로 변경했다. 새 기능·DB 계약 변경은 없다. 실제 브라우저의 주황색 버튼과 기존 지도 로딩을 확인했다. Android용 내보내기·타입 검사·APK 빌드와 서명 검증을 통과했고 APK·ZIP을 갱신했다. Supabase 키는 환경 설정 확인 시 없었으며 사용자가 설정 파일에 추가할 예정이다.
