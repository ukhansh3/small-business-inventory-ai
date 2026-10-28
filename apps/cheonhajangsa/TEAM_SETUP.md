# 천하장사 팀 개발 시작 가이드

## 공통 기준

같은 GitHub 저장소와 앱 코드를 사용하되, 각자 자기 컴퓨터에 내려받고 서로 다른 브랜치에서 작업합니다. 다른 사람의 작업 폴더를 공유하거나 같은 브랜치에 동시에 push하지 않습니다.

- 저장소: https://github.com/ukhansh3/small-business-inventory-ai
- 앱 경로: `apps/cheonhajangsa`
- 최초 공유 기준 브랜치: `codex/cheonhajangsa-team-app`
- `main` 반영 전에는 아래 기준 브랜치에서 시작합니다. PR이 병합된 뒤 새 작업은 최신 `main`에서 시작합니다.
- 원격에 push하려면 저장소 쓰기 권한이 필요합니다. 권한이 없으면 저장소 소유자가 팀원 계정을 초대해야 합니다.

## 1. 내려받기

```sh
git clone --branch codex/cheonhajangsa-team-app https://github.com/ukhansh3/small-business-inventory-ai.git
cd small-business-inventory-ai
```

이미 저장소가 있다면 작업 중인 파일을 먼저 보존하고:

```sh
git fetch origin
git switch codex/cheonhajangsa-team-app
```

## 2. 자기 브랜치 만들기

아래는 이름 예시입니다. 실제 담당 이슈가 있다면 가이드의 `feat/<이슈번호>-<작업명>` 형식을 사용하세요. 세 사람이 같은 브랜치 이름을 쓰지 않습니다.

```sh
git switch -c feat/my-map-ui
```

역할별 예시: 프론트 `feat/my-map-ui`, 데이터/DB `feat/my-vendor-data`, 서비스/AI `feat/my-assistant`.

공용 계약·migration·디자인 토큰은 동시에 수정하지 말고 담당자와 순서를 먼저 정합니다. 현재 SPEC/ontology는 미승인 초안이며, 수량·배송 판정·API 버전·공개 범위를 편의로 확정하지 않습니다.

## 3. 실행 환경

Node.js **24 LTS**, pnpm **11.25.0**을 사용합니다. `.node-version`과 `package.json`에 기준이 있습니다. pnpm이 없으면 공식 설치 안내에 따라 준비합니다.

```sh
cd apps/cheonhajangsa
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

- 기본 화면: http://127.0.0.1:4310
- 휴대폰 프레임: http://127.0.0.1:4310/phone
- Mac에서 `start-local.command`를 실행해도 됩니다. 다른 개발자에게 특정 사용자의 런타임 경로를 요구하지 않습니다.

## 4. 환경변수와 키

Git에는 키 이름만 있는 `.env.example`만 들어 있습니다. 각자 `.env.local`을 만들며 이 파일은 자동으로 Git에서 제외됩니다.

| 값 | 용도 | 키 없이 가능한 것 |
|---|---|---|
| `NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY` | 실제 카카오 지도 | 위치 관계도·샘플 목록·상세 확인 |
| `KAKAO_REST_API_KEY` | 서버/CLI 주소→좌표 변환 | 주소 변환을 제외한 UI·단위 테스트 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 API 주소 | 현재 fixture 기반 UI |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 클라이언트 키 | 현재 fixture 기반 UI |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 관리자 키 | 현재 fixture 기반 UI |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | 추후 실제 AI 연결 | 현재 샘플 도우미 |

Supabase URL은 대시보드 URL이 아니라 `https://<project-ref>.supabase.co`입니다. 현재 앱은 Supabase 데이터를 읽고 쓰는 기능이 아직 없으므로 키를 넣는 것만으로 DB 연동이 완료되지 않습니다.

공동 개발용 프로젝트에 팀원을 초대하거나 각자 개발 프로젝트를 사용하세요. 비밀키는 Git·이슈·PR·공개 채팅에 붙이지 않습니다. 서버 키는 UI 코드나 APK에 넣지 않습니다. DB를 직접 사용하는 사람에게만 필요한 접근을 별도로 제공합니다.

카카오 키에는 각자 사용하는 웹 도메인을 등록합니다:

```text
http://127.0.0.1:4310
http://localhost:4310
```

공유 기기나 LAN 주소로 확인한다면 그 실제 origin도 키 설정에 등록해야 합니다. `.env.local` 변경 후 개발 서버를 다시 시작하세요.

## 5. 검사와 push

앱 폴더에서:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

작업한 파일을 확인한 뒤 저장소 루트에서 필요한 파일만 stage합니다. `git add .`로 인터뷰 원본이나 임시 파일을 함께 올리지 마세요.

```sh
git status
git add apps/cheonhajangsa/components
# 실제 수정한 경로를 선택해서 추가
git commit -m "feat: describe your change"
git push -u origin feat/my-map-ui
```

PR의 base는 현재 공동 기준 브랜치(병합 후에는 `main`)로 정합니다. 다른 팀원 최소 1명의 리뷰와 검사를 거친 뒤 병합합니다. main 직접 push·force push는 하지 않습니다.

## 6. 현재 구현 범위

- 실제 Kakao 지도 SDK, 동일 fixture 결과를 쓰는 지도·목록·업체 상세
- 가격 null·출처·확인일·오래된 가격 표시
- 서버 전용 카카오 주소 변환 모듈과 관리용 CLI
- 주황색 UI, 휴대폰 프레임, 샘플 도우미·커뮤니티 화면
- Android WebView 테스트 APK 생성 소스

미구현: Supabase/PostGIS 검색·저장, 실제 인증·RLS, 실제 AI, 신고/운영자 처리. 자동 Playwright E2E도 아직 작성되지 않았습니다. 준비 중 기능을 동작하는 것처럼 표현하거나 인터뷰 수요 검증 완료로 기록하지 않습니다.

## 7. Android APK

일반 UI 작업에는 Android 도구가 필요 없습니다. APK를 만들 담당자만 `android/README.md`의 Android SDK/JDK를 준비하고 실행합니다.

```sh
pnpm build:apk
```

APK·keystore·빌드 파일은 Git에서 제외됩니다. 기존 개발용 keystore는 공유하지 않으므로 팀원이 새 키로 만든 APK를 기존 앱 위에 업데이트할 때 서명이 다를 수 있습니다. 정식 배포 서명은 팀에서 별도로 관리해야 합니다.
