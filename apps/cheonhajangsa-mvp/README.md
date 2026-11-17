# 천하장사 MVP 실행 안내

현재 평가·협업 기준은 저장소 **main**의 `apps/cheonhajangsa-mvp/`다. Expo Router 웹 앱과 Vercel API로 구성된다. 실제 설치형 Android/iOS 배포 완료를 뜻하지 않는다.

**[배포 앱 열기](https://cheonhajangsa-mvp.vercel.app/)** · [기존 MVP 사용자 가이드](../../README.md#mvp-사용자-가이드) · [MVP 범위와 AC](../../docs/SPEC.md)

## 1. 처음 실행하기

Node.js 24와 npm을 사용한다. 저장소를 받은 다음 모든 명령을 이 앱 폴더에서 실행한다.

```bash
git clone --branch main https://github.com/ukhansh3/small-business-inventory-ai.git
cd small-business-inventory-ai/apps/cheonhajangsa-mvp
npm ci
```

팀에서 받은 `.env.local`이 있으면 그대로 사용한다. 새로 설정하는 경우에만 `.env.example`을 복사한다. 기존 파일을 덮어쓰지 않는다.

터미널 두 개를 앱 폴더에서 열고 각각 실행한다.

```bash
npm run dev:api
```

```bash
npm run web
```

`http://localhost:8081/?test=1`에서 연다. 테스트 기기 표시는 시세·측정 제외용이며 커뮤니티 글까지 자동으로 지우지는 않는다. 기본 위치는 아주대 정문이며 화면에서 위치를 바꿀 수 있다.

## 2. 환경 변수

| 변수 | 용도·비어 있을 때 |
|---|---|
| `AI_MODE=stored` | 키 없이 저장 응답 사용. 예시는 상추, 상추 2키로 급해요, 상추 5키로 오늘 배달, 상추 2키로 만원 부르던데, 대파 있어요?, 오늘 날씨 어때 |
| `AI_MODE=live`, `ANTHROPIC_API_KEY` | 실제 모델 해석과 사진 진단. 서버 전용, 유료 |
| `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_VISION_TIMEOUT_MS` | 모델·텍스트/사진 대기 한도. 모델을 바꾸면 평가 조건도 기록 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 서버 DB·Auth. 없으면 회원 기능은 503, 익명 검색은 가능하나 기록·품목 요청 저장 불가 |
| `EXPO_PUBLIC_KAKAO_JS_KEY` | 카카오 JavaScript 키. 없거나 도메인이 미등록이면 지도 오류, 목록 조회는 가능 |
| `EXPO_PUBLIC_API_BASE_URL` | 로컬 기본값은 localhost:8787, 배포는 같은 출처. 별도 API 서버를 쓸 때만 지정 |
| `DEV_API_PORT` | API 포트, 기본 8787. 변경 시 클라이언트 API 주소도 맞춤 |
| `ALLOW_DEBUG_HEADERS=false` | 배포에서는 false. 로컬 고정 시각·AI 모드 테스트 시에만 true |
| `AI_DAILY_LIMIT` | 기본 하루 500회. DB 한도 기능 연결 시 적용 |

`EXPO_PUBLIC_*`에는 서버 비밀키를 넣지 않는다. `.env.local`은 커밋하지 않는다. 키가 없는 stored 모드는 임의 자연어를 해석하지 않으며 목록에 없는 문장에는 수동 조건 입력 흐름이 열린다.

카카오 개발자 콘솔의 JavaScript SDK 도메인에 실제 웹 주소를 등록한다. 팀 배포와 localhost:8081의 기존 등록 여부를 확인하고 다른 포트는 별도로 등록한다.

## 3. 사용 시나리오와 기대 결과

1. **지도**에서 업체명·업종을 검색하거나 핀·목록으로 상세를 연다. 공공 업체의 가격·재고는 미확인으로 표시한다(AC-28~AC-30).
2. **AI 도우미**에서 `상추`를 보낸다. 필요한 시점·수령 방법을 고른다. 수량이 없어도 검색하며 필요하면 결과 칩에서 고친다(AC-5·AC-14).
3. **새 대화** → `상추 2키로 만원 부르던데`. kg당 5,000원이 표시된다. 시세 표본이 부족하면 억지 판정을 만들지 않는다(AC-17·AC-19·AC-24).
4. 예시 번호는 실제로 발신하지 않는다(AC-13). 미지원 품목·AI 실패·지도 오류를 실제 성공처럼 표시하지 않는다.
5. 로그인 후 **커뮤니티**에서 구매처 질문·가격 제보·거래 경험을 작성하고, **저장**의 게시글/업체에서 다시 확인한다(AC-M01~AC-M05).
6. 업체 문의는 소유자 계정이 연결된 업체에서만 가능하다. 리뷰·문의에 필요한 DB가 없는 경우 오류나 연결 불가 상태를 확인한다(AC-M06).

사진에는 실시간 AI가 필요하다. 진단 이미지를 DB에 저장하지 않으며 추출 값만 필요한 범위에서 기록한다. 시세 공유는 사용자 동의 후 적용한다. 이미지 바이트 상한은 3MiB이며 base64 전송 본문은 약 4MiB다.

## 4. DB 설정

팀이 사용하는 원격 DB에 migration을 임의로 재실행하지 않는다. 현재 적용 여부를 담당자에게 확인한다. 신규 프로젝트를 세울 때에는 [supabase/README.md](supabase/README.md)와 migration 의존성을 확인한 뒤 적용한다.

- 익명 기록·호출 한도·가격 진단·테스트 기기 제외는 앱의 0001~0005 migration을 따른다.
- 커뮤니티·저장 기본 테이블은 `202611080001_member_features.sql`에 있다.
- 이후 리뷰·문의·이용 기록·가상 시연 매장도 각 기능에 필요한 추가 migration이 있다. 파일 존재를 원격 적용 완료로 간주하지 않는다.
- 회원 정책은 닉네임, 3개 글 분류, 삭제 상태 전이, 신고 수동 검토다.
- 이메일 확인을 사용하는 프로젝트에서는 Supabase Auth의 사이트/리디렉션 URL과 실제 앱 주소를 맞춘다.
- 회원 API는 Bearer 토큰을 서버에서 검증한다. 익명 기기 ID는 로그인 권한이 아니다.

현재 Supabase 적용 상태·메일 수신·복수 사용자 실연결 확인은 [검증 기록](../../docs/evaluation/midterm-2-readiness.md)을 따른다. 역사적 [회원 통합 기록](docs/member-integration.md)의 미완료 표시는 당시 상태다.

## 5. 검사와 평가

```bash
npm run typecheck
npm run check:data
npm test
npm run test:golden
npm run lint
npm run build:web
```

| 작업 | 명령·실제 경로 |
|---|---|
| 골든 10개 | `npm run test:golden`, 입력 `../../tests/harness/golden_cases.yaml`, 러너 `tests/harness/mvp-golden.test.ts` |
| 골든 보고서 검사 | [실행법](../../tests/harness/README.md), `scripts/check-golden-report.ts` |
| 텍스트 Evals 32개 | `npm run evals`, 입력 `../../evals/evalset.jsonl`, 러너 `scripts/run-evals.ts` |
| 텍스트 결과 | `../../evals/results/*.json`, `../../evals/results/history.csv` |
| 사진 Evals 11개 | `npm run evals:images`, `evals/image-cases.json`, `evals/results/` |
| 브라우저 E2E | `npm run e2e`, `e2e/`. 먼저 API·웹 실행, 설치된 Chrome 사용 |

텍스트·사진 Evals는 실제 모델을 호출하므로 비용이 든다. 팀에 알리고 실행한다. 합격선·분모·범주별 선정 기준은 [EVAL_DESIGN.md](../../evals/EVAL_DESIGN.md)에 있다. 기존 앱의 `evals/cases.json`은 과거 비교 자료이며 현행 텍스트 러너는 루트 JSONL을 읽는다.

배포 사이트의 읽기 중심 화면을 확인하려면 PowerShell에서 다음처럼 실행한다. 글 등록 등 쓰기 검증은 본인 테스트 계정과 표시된 테스트 글만 사용한다.

```powershell
$env:E2E_BASE_URL='https://cheonhajangsa-mvp.vercel.app'
npm run e2e
Remove-Item Env:E2E_BASE_URL
```

자동으로 브라우저를 찾지 못하면 설치된 Chromium 계열 실행 파일의 절대 경로를 `E2E_CHROME_PATH`에 설정한다. 이 경로는 개발 환경 설정이며 저장소에 개인 경로를 하드코딩하지 않는다. 이번 격리 환경에서는 Chrome 미발견·Edge 프로세스 시작 오류로 CLI E2E가 실행되지 않아 앱 내 브라우저로 핵심 화면을 확인했다. 두 검증 방식을 구분해 기록한다.

## 6. 배포와 코드 구조

팀 배포는 민혁이 관리한다. 이 저장소의 main 변경이 자동으로 팀 Vercel에 반영된다고 가정하지 않는다. 별도 프로젝트에 배포하려는 경우에만 해당 Vercel 프로젝트 연결·환경 변수·카카오 도메인을 준비한다. 작업 중인 로컬 검증을 위해 운영 DB나 팀 배포 설정을 바꾸지 않는다.

| 폴더 | 내용 |
|---|---|
| `app/`, `src/` | 화면·상태·API 호출 |
| `core/`, `data/` | 결정적 검색·가격 계산·고정 데이터 |
| `server/`, `api/v1/` | 입력·권한 검증, AI, DB, Vercel 진입점 |
| `supabase/migrations/` | DB 변경 이력 |
| `tests/`, `e2e/`, `evals/` | 자동 테스트·브라우저·모델 품질 평가 |

현행 API 응답은 [src/lib/api-types.ts](src/lib/api-types.ts)와 서버 핸들러를 확인한다. AI는 문장 의도를 구조화하며 판매처 필터·정렬·가격 계산은 코드가 수행한다.
