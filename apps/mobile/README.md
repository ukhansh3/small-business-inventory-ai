# 천하장사 모바일 앱

React Native 0.88 / Expo SDK 58 / TypeScript / Expo Router 기반 Android·iOS 공통 앱입니다. 화면, 탭, 업체 상세, 업체 등록 폼은 네이티브 컴포넌트입니다. 카카오 JavaScript 지도만 제한된 WebView 영역에서 기존 SDK를 사용합니다. 전체 웹사이트를 앱 안에서 실행하지 않습니다.

## 실행

Node.js 24.3 이상 24.x, pnpm 11.25.0을 사용합니다.

```sh
cd apps/mobile
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm start --go
```

같은 네트워크의 Android·iPhone에서 SDK 58과 호환되는 Expo Go로 QR을 열어 화면을 확인합니다. Expo Go는 테스트 도구이며 배포용 설치 파일이 아닙니다. 네트워크가 격리돼 있으면 개발 서버에 연결할 수 없습니다.

개발용 네이티브 빌드는 `pnpm android` 또는 `pnpm ios`입니다. 해당 플랫폼 SDK/JDK/Xcode가 필요합니다. CLI가 생성하는 android/ios 폴더는 직접 관리하지 않습니다.

## 지금 제공하는 화면

- 주황색 브랜드, 네이티브 탭·상세 이동, 안전 영역과 키보드 대응
- 업체명·취급 품목으로 샘플 업체 탐색, 지도 선택과 상세 연결
- 사용자 요청 시에만 위치 권한 요청, 거부·오류 시 기본 지역 유지
- 업체와 여러 품목·필수 가격을 입력하는 등록 폼
- 운영자 검토 후 공개 흐름 안내
- 실제 AI가 아닌 샘플 조회 도우미, 가상 커뮤니티, 내 업체 화면

실제 로그인·서버 제출·승인·DB 저장은 연결하지 않았습니다. 등록 폼 입력은 메모리에만 있으며 화면을 닫으면 사라집니다. 폼 검증은 API/DB 계약이 아니라 UI 미리보기 검증입니다. 전체 제출에는 세금·배송·좌표 등 서버 검증도 추가해야 합니다.

## 카카오 지도 연결

기존 지원 프로젝트 `../cheonhajangsa`를 HTTPS로 배포하고, 그 배포 서버에 `NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY`를 설정합니다. 카카오 허용 도메인에는 해당 HTTPS origin을 등록합니다.

모바일 `.env.local`에는 아래 공개 주소만 넣습니다.

```dotenv
EXPO_PUBLIC_KAKAO_MAP_URL=https://본인배포주소/mobile-map
```

위 주소는 예시이며 그대로 사용하지 않습니다. 전달받은 실제 배포 주소는 `https://cheonhajangsa.vercel.app`이며 `/mobile-map` 경로 배포를 확인했습니다. 주소 미설정·연결 오류 시 안내와 업체 목록을 유지합니다. 앱 번들 생성 성공이 실제 지도 연결 성공을 뜻하지 않습니다. Vercel 환경 변수는 모바일 앱의 환경 변수로 자동 복사되지 않습니다. 모바일 환경 변수를 변경하면 개발 서버를 재시작하고 배포용 앱은 다시 빌드합니다.

지도 메시지는 정해진 형식과 현재 표시된 업체 ID만 받습니다. 입력 검색어나 연락처를 지도 페이지로 전달하지 않습니다. 지도 중심 좌표는 지도 표시에 사용되며 앱에서 DB에 저장하지 않습니다.

## 키와 서버 경계

`EXPO_PUBLIC_*` 값은 설치 파일에서 읽을 수 있는 공개 값입니다. Supabase service role, Kakao REST, OpenAI 키를 넣지 않습니다. 기존 웹 `.env.local`을 모바일 폴더에 그대로 복사하지 않습니다.

공개 앱 → HTTPS API 서버 → 권한 검사 → Supabase 순으로 실제 서비스를 연결할 예정입니다. 서버 지오코딩과 운영자 승인은 앱이 대신 처리하지 않습니다. 서버 API는 별도 계약 구현이 필요하며 현재 자동 연결되지 않습니다.

## 검사

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm bundle:android
pnpm bundle:ios
pnpm exec expo install --check
```

번들 생성은 APK/IPA 컴파일이나 실기기 테스트와 다릅니다. 출시 전 지원 OS와 최소·최신 버전, 작은 화면·큰 화면·태블릿, 글자 확대, 위치 거부, 네트워크 끊김을 실제 기기에서 검증합니다. SDK 58 공식 문서 기준 Android 7+, iOS 16.4+가 지원 대상이며 모든 구형 기종을 보장하지 않습니다. 의존 라이브러리와 실제 빌드 결과에 따라 최종 지원 범위를 확인합니다.

## 설치·출시

`eas.json`에 development / preview / production 빌드 설정이 있습니다. EAS 계정과 프로젝트 연결을 한 뒤 다음 명령을 사용합니다.

```sh
pnpm dlx eas-cli@latest build --platform android --profile preview
pnpm dlx eas-cli@latest build --platform all --profile production
```

이 명령은 이번 작업에서 실행하지 않았습니다. 클라우드 빌드는 계정·서명 설정과 비용 확인이 필요합니다. iPhone은 APK를 설치할 수 없으며 개발 빌드 기기 등록 또는 TestFlight·App Store 방식으로 배포합니다. 스토어 계정·서명·심사는 아직 진행하지 않았습니다.

공식 참고: https://docs.expo.dev/versions/v58.0.0/ , https://docs.expo.dev/build/setup/ , https://docs.expo.dev/versions/v58.0.0/sdk/webview/
