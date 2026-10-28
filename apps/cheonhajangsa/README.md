> 팀원은 먼저 [TEAM_SETUP.md](TEAM_SETUP.md)를 읽으세요. 이 저장소의 `apps/cheonhajangsa`가 공동 작업 기준 경로입니다. 실제 비밀키와 설치 APK는 Git에 포함하지 않습니다.

# 천하장사 로컬 프로토타입

제공된 AGENTS.md와 DEVELOPMENT_GUIDE.md를 참고한 **UI/fixture 검증 앱**입니다. 실제 MVP 완료나 팀 계약 승인, 인증·DB·AI·지도 연동 완료를 뜻하지 않습니다. 기존 탐색 저장소와 이전 가게곁 MVP는 변경하지 않았습니다.

## 실행

Node.js 24 LTS, pnpm 11을 사용합니다.

```sh
pnpm install
pnpm dev
```

`http://127.0.0.1:4310`에서 확인합니다. 로컬 실행 중인 미리보기는 원격 배포가 아닙니다.

## 이번 구현

- React/Next.js App Router, TypeScript, Tailwind, React Hook Form, Zod, TanStack Query
- 제한된 fixture의 품목·위치·반경·배송 지원 검색
- 같은 응답 업체 ID를 사용하는 위치 관계도·목록과 상세
- 가격 null, 세금·배송비·포장 규격·출처·확인일·30일 초과 재확인 표시
- 지도 키가 없음을 명시한 좌표 관계도. 실제 지도나 카카오 SDK 연결처럼 표시하지 않음
- OpenAI 미연결을 명시한 결정적 검색 입력 시연. 수량 조건은 몰래 무시하지 않고 승인 대기 안내
- 세 유형의 샘플 게시글 필터와 미게시 글 초안 미리보기
- 저장·댓글·알림, 실제 게시·신고·인증은 미구현/준비 중 표시

## 승인되지 않아 구현하지 않은 것

가이드 C1 주문 수량·단위, C2 실거래 관계, C3 배송 판정 변경, C4 `/api/v1` 전환을 구현하지 않았습니다. 공개 제품 API, DB migration, RLS, 인증 정책은 추가하지 않았습니다. 저장소의 SPEC/ontology는 참조 사본으로 `docs/reference/`에 보존하고 변경하지 않았습니다. `features/search/model.ts`는 공개 계약이 아닌 화면 fixture 모델입니다.

## 검사

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Playwright 자동 E2E와 실제 외부 서비스 통합 테스트는 현재 미구현입니다. 화면 검증 증거와 실제 검사 결과는 `docs/ai-usage/local-preview.md`에 기록합니다. Supabase RLS, 실제 지도·AI, 게시·신고·운영자 권한 검증까지 완료해야 정식 MVP가 됩니다.


## 카카오 지도 연결

공식 Kakao Maps JavaScript SDK를 로드하고 현재 검색 응답의 업체 좌표만 마커로 표시합니다. 가격 라벨·마커 클릭은 같은 업체 하단 카드 선택과 연결됩니다. 좌표 없는 업체의 핀은 만들지 않으며 Places 검색으로 업체를 추가하지 않습니다. 실제 업체 데이터 연동은 별개입니다.

1. 카카오 개발자 콘솔에서 JavaScript 키를 발급합니다. REST/Admin 키를 사용하지 않습니다.
2. 해당 앱·키의 JavaScript SDK 허용 도메인에 `http://127.0.0.1:4310`과 `http://localhost:4310`을 등록합니다. 지도 API 사용 설정도 확인합니다.
3. `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY=발급한_JavaScript_키`를 넣습니다.
4. 개발 서버를 재시작하고 새로고침합니다. 실행 중인 Next.js 개발 서버는 환경 파일 변경을 감지해 다시 로드할 수도 있습니다.

키가 없거나 SDK가 실패하면 가상 좌표 관계도와 검색 목록을 유지하고 설정/오류 상태를 구분해 표시합니다. 로딩 제한 시간은 15초이고 재시도 버튼을 제공합니다. SDK 스크립트는 중복 로드하지 않으며, 마커·이벤트·오버레이와 ResizeObserver는 제거 시 정리합니다. 지도 하단 카카오 저작권 표시 영역을 카드로 가리지 않도록 캔버스와 카드 영역을 분리합니다.

지도 API에는 화면 지역에 관한 요청이 전달될 수 있습니다. 업체 좌표는 현재 모두 테스트용 가상 좌표입니다. 키가 설정되기 전에는 실제 SDK 렌더링 성공을 검증할 수 없습니다.

공식 설정 안내: https://apis.map.kakao.com/web/guide/


## Android APK와 휴대폰 미리보기

사용자의 명시적 요청으로 Android 테스트 APK를 추가했습니다. 웹/백엔드 계약은 바꾸지 않고 기존 Next.js 정적 화면을 표준 Android Java WebView 셸에 포함합니다. 빌드는 `pnpm build:apk`, 파일은 `android/dist/cheonhajangsa-debug.apk`입니다. 상세 제한·설치·빌드 방법은 `android/README.md`를 참조하세요.

로컬 미리보기: `http://127.0.0.1:4310/phone` — 휴대폰 프레임 안에서 기존 화면을 사용할 수 있습니다. 이 화면은 웹 UI 미리보기이며 실제 Android 실행 검증과 구분합니다.


## Kakao Local 서버 주소 변환

`lib/server/kakao-geocode.ts`의 `geocodeVendorAddress`가 서버 전용 REST 키를 Authorization 헤더에 넣어 실제 주소 변환을 수행합니다. 브라우저나 APK에서 REST 키를 사용하지 않습니다. 업체 등록·데이터 검토용 내부 모듈이며 새 공개 API 경로나 인증 정책을 추가하지 않았습니다.

```sh
pnpm geocode:address "공개 업체의 도로명 주소"
```

Node.js 24가 `.env.local`을 읽습니다. 빈 주소·키 누락·인증·요청 한도·네트워크 장애·잘못된 좌표를 구분합니다. 결과 없음은 좌표를 생성하지 않고 `no_results`, 여러 주소가 일치하면 `needs_review`를 반환합니다. 반환된 후보는 모두 `unreviewed` 상태이며 승인·DB 저장을 자동 수행하지 않습니다. 원본 REST 키나 upstream 오류 본문을 로그에 출력하지 않습니다.

실제 공개 주소 조회와 단위 테스트를 검증했습니다. 이 기능은 전화번호·가격·업체 존재 정보를 자동 수집하는 기능이 아닙니다. Supabase가 아직 연결되지 않아 DB 저장은 미구현입니다.
