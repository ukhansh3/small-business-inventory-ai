# API·지도 서버 개발 보충 가이드

제품·아키텍처·협업의 정본은 루트 [`DEVELOPMENT_GUIDE.md`](../../DEVELOPMENT_GUIDE.md)입니다. 이 문서는 `apps/cheonhajangsa`의 서버·지도 역할만 설명합니다.

## 현재 역할

- Next.js App Router 기반 `/api/v1/*` Route Handler
- 모바일 WebView용 `/mobile-map` 카카오 지도 페이지
- Supabase Auth 토큰·소유권·운영자 권한 검증
- 카카오 REST 주소 지오코딩
- 과거 웹 프로토타입 보관

실제 Android·iOS 사용자 화면은 `apps/mobile`입니다. 이 폴더의 `app/page.tsx`, `app/phone`, `android`는 현재 모바일 정본이 아닙니다.

## 계약과 데이터

- 요청·응답 DTO는 `packages/vendor-contracts`를 사용합니다.
- 업체 등록 흐름은 `docs/contracts/vendor-registration-v1.md`를 따릅니다.
- 적용된 migration은 수정하지 않고 새 migration을 추가합니다.
- 일반 업체 `live`와 공공업체 시연 `mvp_demo`를 서로 다른 API·테이블로 유지합니다.
- 지오코딩 후보가 없거나 모호하면 임의 좌표를 만들지 않습니다.

## 실행과 검증

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

실제 Supabase 연결 검증과 로컬 PGlite 테스트를 구분합니다. 실제 DB reset·삭제·운영자 승격은 자동화하지 않습니다. 지도 페이지 Vercel 배포와 전체 API 상시 배포도 별도 상태로 기록합니다.
