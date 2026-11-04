# API·지도 서버 추가 규칙

루트 `AGENTS.md`, `DEVELOPMENT_GUIDE.md`, `SPEC.md`가 우선합니다. 이 파일은 `apps/cheonhajangsa`에만 적용되는 추가 규칙입니다.

## 역할

- 이 폴더는 Next.js API Route Handler와 모바일 WebView용 카카오 지도 페이지를 제공합니다.
- 과거 웹 프로토타입 화면과 Java WebView APK가 남아 있지만 실제 사용자 앱은 `apps/mobile`입니다.
- 구조 이동·삭제는 별도 PR과 팀 승인 없이 수행하지 않습니다.

## 서버 규칙

- 요청·응답은 `packages/vendor-contracts`의 Zod schema로 검증합니다.
- 사용자 ID·역할·업체 소유권은 Bearer 토큰과 DB에서 확인합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 필요한 서버 작업에만 사용하고 일반 공개 조회 우회에 사용하지 않습니다.
- 이미 적용된 migration을 수정하지 않습니다.
- 승인본을 직접 덮어쓰지 않고 revision RPC를 사용합니다.
- DB 오류·외부 API 오류·결과 없음·설정 없음 상태를 구분합니다.
- `mvp_demo`를 `/vendors` 응답이나 승인 업체 테이블에 합치지 않습니다.
- 사진 object path와 내부 운영 메모를 일반 응답에 포함하지 않습니다.

## 외부 지도·주소

- 카카오 JavaScript 키와 REST 키의 용도를 구분합니다.
- 지오코딩 후보가 없거나 모호하면 제출을 거부하며 임의 좌표를 생성하지 않습니다.
- 지도 페이지에는 표시 가능한 승인 업체 좌표만 전달합니다.

## 검증

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

실제 Supabase를 사용하는 검증은 테스트 프로젝트 또는 명시적으로 승인된 환경에서만 수행하고, 삭제·reset·운영자 자동 승격을 하지 않습니다.
