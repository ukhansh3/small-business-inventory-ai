# 모바일 개발 보충 가이드

제품·아키텍처·협업의 정본은 루트 [`DEVELOPMENT_GUIDE.md`](../../DEVELOPMENT_GUIDE.md)입니다. 이 문서는 모바일 전용 차이만 설명합니다.

## 기준

- React Native·Expo SDK 58·Expo Router·TypeScript·pnpm
- 실제 사용자 앱 경로: `apps/mobile`
- route: `src/app/`
- 공용 UI: `src/components/`
- API·Supabase·세션: `src/lib/`
- 모바일 표시 규칙: `src/domain/`

## 구현 규칙

- HTML·CSS·브라우저 전역에 의존하는 기존 웹 UI를 복사하지 않습니다.
- 카카오 지도 JavaScript SDK는 전용 HTTPS WebView 페이지로 격리합니다.
- 기기 위치는 필요한 시점에만 요청하고, 거부해도 지역 기반 탐색이 가능해야 합니다.
- 모바일 폼 검증은 서버 소유권·승인 검사와 RLS를 대체하지 않습니다.
- API·DB 응답은 `packages/vendor-contracts`와 루트 SPEC을 따릅니다.
- `mvp_demo`에는 가상 경고를 유지하며 일반 승인 업체와 섞지 않습니다.

## 실행과 검증

```bash
pnpm install --frozen-lockfile
pnpm start
pnpm test
pnpm typecheck
pnpm lint
pnpm bundle:android
pnpm bundle:ios
```

새 native module은 `npx expo install`로 SDK 호환 버전을 설치합니다. Android·iOS 중 실행하지 않은 플랫폼을 검증 완료로 기록하지 않습니다. Expo Go에 없는 native module은 development build가 필요합니다.

Vercel은 네이티브 앱 배포를 대신하지 않습니다. 앱 빌드·배포는 Expo EAS 또는 각 스토어 절차를 사용하고, Vercel은 지도 페이지나 API 호스팅에만 사용할 수 있습니다.
