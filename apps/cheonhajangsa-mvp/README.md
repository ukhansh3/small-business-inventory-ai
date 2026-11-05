# 천하장사

개업 초기 식당 사장님이 "상추"처럼 한 마디만 하면, 근처에서 상추를 파는 곳을 지도와 목록으로 찾아 주는 앱입니다.
AI가 양·필요한 때·받는 방식을 되묻고, 조건에 맞는 판매처를 거리·영업 여부·입고 시간 순으로 보여 줍니다.
받은 가격이나 영수증·결제내역 사진을 보내면 동네 시세보다 비싸게 사는지 알려 줍니다(단가 진단).

아주대 AI캡스톤디자인 12조 천하장사(김민균·차승호·송민혁)

**앱 링크: https://cheonhajangsa-mvp.vercel.app**

- 앱만 써 볼 사람 → [1. 써 보는 방법](#1-써-보는-방법-다른-팀용)
- 우리 팀원(코드 실행·수정) → 바로 아래 [0. 팀원용 시작하기](#0-팀원용-시작하기)

---

## 0. 팀원용 시작하기

이 앱은 팀 저장소 `민혁` 브랜치의 `apps/cheonhajangsa-mvp/` 폴더에 있다. 아래 명령은 모두 **이 폴더 안에서** 실행한다.

### 처음 한 번
1. Node.js 24를 설치한다(https://nodejs.org).
2. 저장소를 받고 앱 폴더로 들어간다.
   ```bash
   git clone -b 민혁 https://github.com/ukhansh3/small-business-inventory-ai.git
   ```
   ```bash
   cd small-business-inventory-ai/apps/cheonhajangsa-mvp
   ```
3. 패키지를 설치한다.
   ```bash
   npm ci
   ```
4. 민혁에게 직접 받은 `.env.local` 파일을 이 폴더(`apps/cheonhajangsa-mvp/`)에 그대로 넣는다.
   - **`cp .env.example .env.local`은 실행하지 않는다.** 받은 키 파일이 빈 파일로 덮어써진다.
   - 파일 이름은 점으로 시작해 Finder·탐색기에서 안 보일 수 있다. 맥 Finder는 `Cmd+Shift+.`로 보인다.

### 실행
터미널 두 개를 열고 각각 앱 폴더에서 실행한다.
```bash
npm run dev:api
```
```bash
npm run web
```
브라우저에서 http://localhost:8081/?test=1 을 연다. 화면 위에 '테스트 기기'가 보이면 정상이다(우리가 시험한 기록이 동네 시세·측정에 섞이지 않는다).

### 이미 되어 있으니 하지 않는 것
- **DB 마이그레이션(아래 '기록 DB')을 다시 실행하지 않는다.** 팀이 같은 Supabase를 쓰고 0001~0005가 이미 적용돼 있다. 다시 실행하면 "이미 있음" 오류가 난다. DB를 바꾸는 SQL은 실행 전에 팀에 먼저 공유한다.
- **카카오 도메인 등록은 하지 않아도 된다.** `http://localhost:8081`과 배포 링크가 이미 등록돼 있다. 다른 포트로 열면 지도가 안 뜬다.
- **배포(`vercel link`·`vercel deploy`)는 하지 않는다.** 배포 링크는 민혁 계정에 있다. 다른 계정으로 하면 링크가 따로 생긴다. 고친 코드는 push하고 알려 주면 민혁이 확인 후 배포한다.

### 고친 뒤
1. 검사를 돌린다: `npm run typecheck`, `npm test`, `npm run check:data`
2. 각자 브랜치나 `민혁` 브랜치에 push하고 팀 카톡에 알린다.
3. `.env.local`은 git에 올라가지 않는다(`.gitignore`). 카톡·노션·메일에도 올리지 않는다.

### 비용이 드는 명령
`npm run evals`, `npm run evals:images`는 실시간 Claude를 여러 번 불러 민혁 계정으로 비용이 나간다. 필요할 때만, 팀에 알리고 돌린다. 앱을 쓰는 것도 AI를 부르지만 한 번에 소액이다(하루 AI 500회 한도는 배포 앱과 같이 쓴다).

### Windows(PowerShell)
명령은 같다. 환경 변수를 앞에 붙이는 명령만 다르게 쓴다.
```powershell
$env:E2E_BASE_URL="https://cheonhajangsa-mvp.vercel.app"; npm run e2e
```

---

## 1. 써 보는 방법 (다른 팀용)

설치나 가입 없이 위 링크를 휴대폰이나 PC 브라우저(Chrome 권장)로 열면 됩니다.

0. 처음 화면은 지도와 아래 목록입니다. 수원 영통구·팔달구의 식자재 가게(판매처 9곳 + 공공데이터 가게 273곳)가 내 위치에서 가까운 순으로 나옵니다. 지도의 점을 누르면 그 가게가 목록 맨 위에 나옵니다. 목록 위 손잡이로 지도·목록 크기를 바꿉니다.
1. 위 입력창에 필요한 재료를 한 마디로 씁니다. 예: `상추`
2. 앱이 되묻는 질문에 버튼으로 답합니다.
   - 얼마나 필요하세요? → 1kg / 2kg / 5kg / 1박스(4kg) / 잘 모르겠어요
   - 언제까지 필요하세요? → 지금 바로 / 오늘 안 / 내일
   - 직접 가지러 가세요, 배달이 필요하세요? → 직접 갈게요 / 배달해 주세요
3. 결과 목록에서 판매처를 고르고 **전화하기**를 누릅니다.
4. 조건을 바꾸고 싶으면 결과 위의 조건 칩(예: `2kg ▾`)을 누릅니다. AI를 다시 거치지 않고 바로 다시 찾습니다.
5. 처음부터 다시 하려면 오른쪽 위 **새로 찾기**를 누릅니다.

### 단가 진단 (새 기능)
- **받은 가격을 적기**: `상추 2키로 만원 부르던데` → kg당 가격, 동네 시세보다 비싼지 싼지, 더 싸게 파는 곳
- **영수증·결제내역 사진**: 입력창 왼쪽 📷 → 종이 영수증, 모바일 영수증, 쿠팡 등 주문내역, 거래명세서, 상품 화면 사진 → 줄마다 kg당 가격과 판정
- 사진은 진단에만 쓰고 **저장하지 않습니다**(읽은 값만 남고, 카드번호·이름 같은 정보는 읽지 않습니다). [이 가격 동네 시세에 보태기]를 누르면 가게 이름 없이 kg당 가격만 동네 시세에 들어갑니다.
- 지금은 상추만 비교합니다. 다른 품목 줄은 "아직 상추만 비교해요"로 나옵니다.

### 해 볼 만한 문장
| 입력 | 앱이 하는 일 |
|---|---|
| `상추` | 양 → 언제 → 받는 방식을 차례로 되묻는다 |
| `상추 2키로 급해요` | 문장에 있는 양·급함은 건너뛰고 받는 방식만 묻는다 |
| `상추 5키로 오늘 배달` | 되묻지 않고 바로 결과를 보여 준다 |
| `대파 있어요?` | 아직 상추만 된다고 안내하고, [요청 남기기]를 누르면 요청이 저장된다 |
| `오늘 날씨 어때` | 재료를 말해 달라고 안내한다 |
| `상추 4kg에 15000원 샀어요` | kg당 3,750원, 동네 시세와 비교 |

### 알아 두실 점
- **판매처는 모두 예시 데이터입니다.** 가게 이름·번호·가격은 실제가 아니고, 화면 위에 노란 띠로 표시됩니다. 전화하기를 눌러도 실제로 전화가 걸리지 않고 "예시 번호예요" 안내가 나옵니다.
- **품목은 상추만** 됩니다. 다른 재료는 요청만 남길 수 있습니다.
- 지도의 흐린 초록 점은 **공공데이터 가게**(소상공인시장진흥공단 상가(상권)정보, 2026-09-30 기준)입니다. 실제 가게지만 가격·재고·전화번호는 확인하지 않아 보여 주지 않습니다. [카카오맵에서 보기]로 위치를 볼 수 있습니다.
- **내 위치는 아주대 정문**으로 고정돼 있습니다. 거리는 여기서 잰 값입니다.
- 영업 중·닫힘은 **지금 한국 시간**으로 판단합니다. 밤에 열면 대부분 '닫힌 곳'으로 나옵니다.
- AI 답은 보통 2~5초 걸립니다. AI가 응답하지 못하면 "조건을 직접 골라 주세요"와 함께 선택 화면이 열리고, 그대로 검색할 수 있습니다.
- 화면 위에 '저장된 응답'이 보이면 실시간 AI 대신 미리 저장한 응답으로 동작하는 중입니다(정해진 몇 문장만 됩니다).

### 팀원·리허설용: 테스트 기기 표시
시험 삼아 쓸 때는 링크 끝에 `?test=1`을 붙여 한 번 엽니다(https://cheonhajangsa-mvp.vercel.app/?test=1). 화면 위에 '테스트 기기'가 보이면 그 브라우저의 기록과 [동네 시세에 보태기]는 동네 시세와 측정에서 빠집니다. 끄려면 `?test=0`으로 한 번 엽니다.

### 무엇이 기록되나요
서비스 개선과 과제 평가를 위해 아래만 저장합니다. 이름·전화번호·위치 같은 개인정보는 받지 않습니다.
- 브라우저마다 무작위로 만든 기기 번호(로그인 없음)
- 입력한 문장, 고른 선택지와 조건, 검색 결과 수
- 전화하기·새로 찾기·요청 남기기를 누른 기록

---

## 2. 직접 실행하기 (개발자용)

> 우리 팀원은 이 절 대신 위 [0. 팀원용 시작하기](#0-팀원용-시작하기)를 따른다. 이 절은 자기 키·DB로 처음부터 세우는 경우다.

### 준비
- Node.js 24
- 선택: Anthropic API 키(실시간 AI), Supabase 프로젝트(기록). 둘 다 없어도 실행된다(아래 참고).

### 실행
```bash
npm ci
cp .env.example .env.local
```
`.env.local`을 열어 필요한 값만 채운다. 비워 두면 이렇게 동작한다.

| 값 | 비웠을 때 |
|---|---|
| `ANTHROPIC_API_KEY` | `AI_MODE=stored`(저장된 응답)만 쓸 수 있다 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 기록을 건너뛴다. 검색·대화는 정상, [요청 남기기]만 "저장하지 못했어요"가 뜬다 |
| `EXPO_PUBLIC_API_BASE_URL` | 비워 둔다. 로컬 개발 빌드는 자동으로 `http://localhost:8787`을 쓴다 |
| `EXPO_PUBLIC_KAKAO_JS_KEY` | 지도 자리에 "지도를 불러오지 못했어요"가 뜨고 목록은 그대로 쓴다. 카카오 개발자 콘솔의 JavaScript SDK 도메인에 `http://localhost:8081`을 등록해야 한다 |

`.env.local`은 git에 올리지 않는다. 서비스 키·API 키를 `EXPO_PUBLIC_`로 시작하는 이름에 넣지 않는다(앱 번들에 들어간다).

터미널 두 개에서:
```bash
npm run dev:api
```
```bash
npm run web
```
브라우저에서 http://localhost:8081 을 연다.

### 검사
```bash
npm run typecheck
```
```bash
npm test
```
```bash
npm run check:data
```
```bash
npm run build:web
```

### evals와 E2E
```bash
npm run evals
```
AI 입력 해석을 `evals/cases.json` 32건으로 잰다(실시간 Claude, `ANTHROPIC_API_KEY` 필요, 비용 발생). 결과는 `evals/results/`.

```bash
npm run e2e
```
사진 읽기는 `npm run evals:images`(합성 영수증 11장, 비용 발생).

로컬 웹(`dev:api`·`web` 실행 중)에서 '상추' → 결과 → 전화하기, 가격 한 줄 진단 흐름을 설치된 Chrome으로 확인한다. 배포 링크로 돌리려면 `E2E_BASE_URL=https://cheonhajangsa-mvp.vercel.app npm run e2e`(Windows는 위 0절의 PowerShell 형식).

### 기록 DB(선택)
팀 Supabase에는 이미 적용돼 있다. 새 Supabase 프로젝트를 만들 때만 실행한다. Supabase SQL Editor에서 `supabase/migrations/`의 0001~0005를 차례로 한 번씩 실행한다(0004 단가 진단 기록, 0005 시세에서 테스트 기기 제외). 0003은 호출 한도(기기별 시간당 60턴, 세션 AI 6회, 하루 AI 500회, 행동 기록 분당 120건)다. 표는 `chj` 스키마에 만들어지고, 서버는 서비스 키로 `public.chj_*` 함수만 부른다.

### 배포(Vercel)
팀 배포 링크는 민혁 계정에서만 배포한다. 아래는 자기 Vercel에 따로 세울 때의 방법이다.
```bash
npx vercel link
```
```bash
npx vercel deploy --prod
```
환경 변수는 Vercel 프로젝트에 넣는다: `EXPO_PUBLIC_KAKAO_JS_KEY`(빌드 때 들어감), `ANTHROPIC_API_KEY`, `AI_MODE`(`live`/`stored`), `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_DAILY_LIMIT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOW_DEBUG_HEADERS=false`.

---

## 3. 구조

| 폴더 | 내용 |
|---|---|
| `app/`, `src/` | 화면(Expo Router + React Native Web). 상태와 API 호출은 `src/hooks/useAssist.ts` 한 곳 |
| `core/` | 검색 규칙(최소 판매량, 영업·입고 판정, 배달 지역, 정렬, 가격 표시). UI·서버에 의존하지 않는 순수 TypeScript |
| `server/` | API 처리, AI(Claude Haiku 5.5 도구 호출, 저장된 응답), 기록(Supabase) |
| `api/v1/` | Vercel 함수(`server/handlers`를 부르는 얇은 파일) |
| `data/` | 품목·위치·판매처·판매 정보 JSON, 공공데이터 가게 `public_stores.json`(`scripts/build-public-stores.ts`로 상가정보 원본에서 만듦, 원본은 올리지 않음). `npm run check:data`로 형식 검사 |
| `supabase/migrations/` | 기록 DB 표와 함수 |
| `tests/` | 규칙·API·화면 상태 테스트(Vitest) |

AI는 사장님 문장에서 품목·양·급함·받는 방식만 뽑는다. 판매처를 거르고 줄 세우는 일과 화면 문구는 모두 코드가 데이터로만 만든다. AI가 가게 이름이나 가격을 지어낼 수 없다.

### API
| 경로 | 하는 일 |
|---|---|
| `POST /api/v1/assist/turns` | 대화 한 턴(문장 또는 선택지) → 되묻기·안내·결과 |
| `POST /api/v1/search` | 조건으로 바로 검색(칩 수정, AI 없음) |
| `POST /api/v1/devices` | 기기 등록 |
| `POST /api/v1/events` | 전화하기·새로 찾기 기록 |
| `POST /api/v1/item-requests` | 품목 요청 남기기 |
| `POST /api/v1/price-checks` | 사진 단가 진단 |
| `PATCH /api/v1/price-checks/{id}` | 동네 시세에 보태기 |
| `GET /api/v1/market` | 동네 시세 |
| `GET /api/v1/stores` | 지도용 가게(판매처 + 공공데이터) |

모든 요청에 헤더 `X-Device-Id`(uuid)가 필요하다.
