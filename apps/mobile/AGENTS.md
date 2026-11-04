# 모바일 앱 추가 규칙

루트 `AGENTS.md`, `DEVELOPMENT_GUIDE.md`, `SPEC.md`가 우선합니다. 이 파일은 `apps/mobile`에만 적용되는 추가 규칙입니다.

## 역할

- 실제 Android·iOS 사용자 앱은 이 폴더의 Expo·React Native 앱입니다.
- 라우트는 `src/app/`, 공용 UI는 `src/components/`, API·세션은 `src/lib/`, 표시 규칙은 `src/domain/`에 둡니다.
- `apps/cheonhajangsa/android`의 과거 WebView APK를 현재 앱 기준으로 사용하지 않습니다.

## 계약

- API 응답을 화면에서 임의 추론하지 말고 `packages/vendor-contracts`와 서버 응답을 따릅니다.
- `live`, `mvp_demo`, 로컬 샘플을 시각적으로 구분합니다.
- 실제 API 오류를 샘플 성공 화면으로 바꾸지 않습니다.
- null 가격·배송비·확인일을 0원·무료·최신으로 표시하지 않습니다.
- 지도와 목록은 같은 vendor ID 집합을 사용합니다.
- 서버 비밀키를 `EXPO_PUBLIC_*` 변수나 앱 번들에 넣지 않습니다.

## Expo 확인

Expo·React Native API를 변경하기 전에 `package.json`의 Expo major를 확인하고 해당 버전 공식 문서를 사용합니다. 새 native module은 `npx expo install`로 SDK 호환 버전을 설치하며, 추가 후 development build 필요 여부를 확인합니다.

## 검증

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm bundle:android
pnpm bundle:ios
```

화면 흐름 변경은 Android·iOS 중 실행한 환경과 미검증 환경을 PR에 구분합니다. 인증·위치·사진 권한은 거부·재시도·설정 없음 상태를 함께 확인합니다.
