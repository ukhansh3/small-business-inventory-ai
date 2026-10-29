# 천하장사 Android·iOS 앱

React Native 0.88 / Expo SDK 58 / TypeScript / Expo Router 기반 모바일 앱입니다. UI·탭·업체 상세·등록 폼은 네이티브이며, 카카오 지도만 HTTPS 지도 전용 페이지를 제한된 WebView로 표시합니다.

## 현재 구현 범위

- 이메일 회원가입·로그인·로그아웃, Supabase Auth 세션을 기기의 암호화 저장소에 보관
- 업체 초안과 여러 품목·가격·규격·세금·최소 주문·확인일·배송 조건 저장
- 사진 선택·비공개 초안 업로드 (JPEG/PNG/WebP, 3MB 이하, 제출본당 최대 10개)
- 서버 지오코딩 후 운영자 검토 요청·요청 취소·보완 후 재제출
- 운영자 검토 대기 목록·승인·보완 요청, 자기 업체 셀프 승인 차단
- 승인된 현재 공개본만 공간 검색·지도·목록·상세에 표시
- 승인본을 유지하며 새 수정본 작성. 일반 조회와 검토 원본·내부 메모 분리
- 위치 권한 거부·지도 장애·검색 오류·빈 결과를 구분

**2026-10-29 실제 Supabase에 DB 구조 적용을 완료했습니다.** 서버 배포와 모바일 연결 설정, 실제 계정 흐름 검증은 아직 별도입니다. 같은 DB에 SQL을 다시 실행하지 마세요. [DB 적용 안내](../../supabase/README.md), [API/DB 계약](../../docs/contracts/vendor-registration-v1.md)를 먼저 읽습니다. 실제 AI·커뮤니티 글 저장은 아직 샘플 화면입니다.

## 설치·실행

Node.js 24.3 이상 24.x / pnpm 11.25.0. 저장소 전체를 받은 뒤 앱 폴더에서 실행합니다. 공유 계약 패키지 `../../packages/vendor-contracts`도 필요하므로 앱 폴더만 따로 복사하지 않습니다.

```sh
cd apps/mobile
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm start --go
```

같은 네트워크의 Android·iPhone에서 SDK 58과 호환되는 Expo Go로 QR을 엽니다. Expo Go는 개발 테스트 도구이며 정식 설치 파일이 아닙니다.

## 샘플 모드와 실제 DB 모드

`.env.local`에는 공개 값만 설정합니다.

```dotenv
EXPO_PUBLIC_KAKAO_MAP_URL=https://cheonhajangsa.vercel.app/mobile-map
EXPO_PUBLIC_SUPABASE_URL=https://프로젝트참조값.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=공개키
EXPO_PUBLIC_API_BASE_URL=https://민균브랜치서버배포주소
```

예시 값은 실제 발급 값과 배포 주소로 바꿉니다. API URL은 origin이며 `/api/v1`을 붙이지 않습니다. 다른 브랜치의 예전 서버를 가리키면 새 API가 없을 수 있습니다.

Supabase 공개 설정과 API 주소가 없으면 명시적인 샘플 모드를 유지합니다. 등록 화면을 미리 볼 수 있지만 실제 저장·검토 요청·사진 업로드 버튼은 비활성화합니다. 입력은 화면 메모리에만 남고 닫으면 사라집니다.

설정이 준비되면 로그인 사용자만 승인 업체를 조회합니다. 서버/DB 오류가 발생해도 샘플 결과로 바꾸지 않습니다. DB가 미적용이면 API는 `DATABASE_NOT_READY`로 알립니다. 비로그인 공개 여부와 사업자 증빙 방식은 미결정입니다.

환경 변수를 바꾸면 Metro를 재시작합니다. 배포용 앱에는 공개 설정도 빌드 시 반영합니다. Vercel의 환경 변수는 모바일 앱으로 자동 복사되지 않습니다. Supabase 관리자·Kakao REST·OpenAI 키를 `EXPO_PUBLIC_*`에 넣지 않습니다.

## 지도·사진·서버 경계

카카오 허용 도메인에 지도 페이지의 HTTPS origin을 등록합니다. 기존 `/phone`은 과거 웹 프레임 미리보기이며 이 네이티브 앱 실행 화면이 아닙니다.

앱의 로그인만 Supabase Auth를 직접 이용합니다. 핵심 업체 데이터는 사용자 Bearer 토큰으로 HTTPS API를 호출하며 DB의 소유권·검토 상태·RLS를 함께 검사합니다. 주소 좌표 확정과 운영자 권한 지정은 앱이 대신하지 않습니다.

사진은 비공개 버킷에 저장합니다. 일반 이용자에게 긴 유효기간의 signed URL을 전달하지 않고, 사용자 권한을 확인하는 사진 API로 표시합니다. 운영자 내부 메모·과거 승인본·미승인 사진은 공개 상세에 포함하지 않습니다. 사진 선택에 카메라·마이크 권한을 요청하지 않습니다.

## 검증

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm bundle:android
pnpm bundle:ios
pnpm exec expo install --check
pnpm dlx expo-doctor@latest
```

서버와 DB 테스트는 저장소의 `apps/cheonhajangsa`에서 실행합니다. PGlite PostgreSQL/PostGIS와 테스트 Auth/Storage 스키마를 사용하며 공유 DB를 변경하지 않습니다. 실제 Supabase 서비스·다중 세션 경합·실기기 전체 흐름 검증을 대체하지 않습니다.

## 빌드·출시

개발 네이티브 빌드: `pnpm android` / `pnpm ios`. 호환되는 JDK·Android SDK 또는 Xcode가 필요합니다. `android/ios` 폴더는 Expo 설정으로 생성하며 수동 관리하지 않습니다.

EAS 연결과 계정·서명을 준비한 뒤:

```sh
pnpm dlx eas-cli@latest build --platform android --profile preview
pnpm dlx eas-cli@latest build --platform all --profile production
```

이번 DB 작업에서 새 APK/IPA 빌드·스토어 배포는 수행하지 않았습니다. iPhone은 APK를 설치할 수 없으며 TestFlight·App Store 또는 개발 기기 등록 방식이 필요합니다. 모든 구형 기기 호환을 보장하지 않으며 SDK 지원 OS와 실제 기기 검증 범위를 확인합니다.

참고: https://docs.expo.dev/versions/v58.0.0/ , https://supabase.com/docs/guides/auth/quickstarts/react-native , https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
