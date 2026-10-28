# 천하장사 MVP Development Guide

> 상태: 팀 검토용 초안 · GitHub 미반영 · 구현 전 계약 확정 필요
> 기준일: 2026-10-28
> 대상: 프론트엔드 1명, 백엔드 2명, AI 코딩 에이전트
> 목적: 세 명이 병렬로 개발해도 화면·API·DB의 의미가 어긋나지 않게 하는 단일 개발 기준

이 문서는 현재 팀이 정한 제품 방향, 모바일 목업, 저장소의 `SPEC.md`·`ontology.yaml`·`AGENTS.md`, 지난 발표 자료를 구현 관점에서 합친 **개발 초안**이다. 인터뷰에서 검증된 문제와 팀이 선택한 해결책을 혼동하지 않는다. 지도, 커뮤니티, AI 도우미는 현재 팀이 개발하기로 한 해결책 가설이며, 사용자 요구로 이미 검증됐다고 표현하지 않는다.

---

## 1. 제품 한 문장

**천하장사**는 초기·초보 요식업 자영업자가 주변 식자재·소모품 업체의 품목, 가격, 최소 주문량, 배송 조건, 정보 출처를 지도에서 비교하고, 다른 사장님의 거래 경험과 AI 검색 보조를 이용해 거래처 탐색 시간을 줄이는 모바일 중심 서비스다.

### 1.1 근거가 확인된 문제

- 새로운 품목이나 거래처를 찾을 때 비교 가능한 정보가 한곳에 모여 있지 않다.
- 현재는 직접 발품을 팔거나 지인에게 묻고, 업체가 먼저 방문하기를 기다리는 방식에 의존한다.
- 공개 업체 정보와 실제 거래 경험 정보 사이에 차이가 있다.
- 지난 발표는 총 13개 접촉 사례를 보고했으나, 저장소의 인터뷰 집계와 범위는 최종적으로 다시 대조해야 한다. 숫자를 임의로 통합하거나 늘리지 않는다.

### 1.2 아직 검증해야 하는 해결책

- 지도가 목록보다 실제 탐색 시간을 줄이는가?
- 커뮤니티의 가격 제보·거래 경험을 사장님들이 직접 남기는가?
- AI 대화가 필터 입력보다 편리하고, 잘못된 추천 없이 사용 가능한가?
- 업체 정보의 최신성과 신뢰도를 누가 어떤 비용으로 유지하는가?

---

## 2. 정본과 충돌 해결 순서

구현 시 다음 순서로 판단한다.

1. 팀이 승인하고 `docs/decisions/`에 기록한 최신 ADR
2. `SPEC.md`의 범위, 동작, Acceptance Criteria
3. `ontology.yaml`의 개체, 속성, 관계, 의미
4. 이 `DEVELOPMENT_GUIDE.md`의 기술·협업 방식
5. 승인된 목업과 디자인 토큰
6. `README.md`의 프로젝트 개요

문서가 충돌하면 개발자가 임의로 한쪽을 선택하지 않는다. 이 문서의 **계약 변경 승인 필요** 항목은 `SPEC.md`와 `ontology.yaml`까지 함께 수정·승인된 뒤 구현한다.

---

## 3. MVP 범위

### 3.1 P0 — 이번 MVP에서 반드시 연결할 핵심 흐름

1. 사용자가 기준 위치 또는 지역을 정한다.
2. 품목, 주문 수량, 거리, 수령 방식을 입력한다.
3. 동일한 검색 결과를 지도와 목록으로 확인한다.
4. 업체 상세에서 가격, 규격, 최소 주문량, 배송 조건, 출처, 확인 날짜를 본다.
5. AI 도우미가 자연어를 같은 검색 조건으로 구조화하고 같은 검색 API를 호출한다.
6. 사장님 커뮤니티에서 구매처 질문, 가격 제보, 거래 경험을 작성·조회한다.
7. 가격 제보는 업체·품목·가격 정보와 함께 저장되며, 신고된 게시물은 운영자가 숨길 수 있다.
8. 제한된 지역과 1~2개 품목군에서 실제 배포 URL로 동작한다.

### 3.2 P1 — 화면에 보일 수 있으나 이번 P0 완료 조건은 아님

- 게시물 댓글, 저장, 알림
- 사장님 간 개인 메시지
- 아는 가게 팔로우와 거래처 이용 수 표시
- 음성 입력
- 사용자별 추천·개인화
- 여러 업체 가격 비교표
- 업체의 직접 정보 수정 요청

목업의 `저장` 탭과 댓글 수는 P1이다. P0에서 노출한다면 비활성 상태 또는 `준비 중`으로 명확히 표시한다. 작동하는 것처럼 꾸미지 않는다.

### 3.3 명시적 비범위

- 결제, 주문 체결, 배송 중개, 자동 연락
- 공동구매, 남은 재료·중고 설비 거래
- POS 연동, 실시간 재고, 자동 발주
- 전국 업체 데이터 완성, 실시간 최저가·재고 보장
- 업체 웹사이트 무단 크롤링
- 사업자등록증 자동 심사
- 별점으로 업체 품질을 단정하는 기능
- AI가 임의의 업체·가격·후기·재고를 만들어 추천하는 기능

---

## 4. 구현 전 승인해야 하는 계약 변경

다음 네 항목은 목업·발표 방향과 현재 저장소 계약 사이의 차이다. 코드부터 만들지 말고 `SPEC.md`, `ontology.yaml`, AC, 골든 테스트를 동시에 고친다.

### C1. 검색에 주문 수량과 단위를 추가

현재 `SearchRequest`에는 주문 수량이 충분히 표현되지 않는다. 다음 필드를 추가해야 한다.

```ts
requestedQuantity: number;
requestedUnit: "kg" | "l" | "ea" | "box" | "pack";
```

- `requestedQuantity <= 0`은 400 오류다.
- 품목의 기준 단위와 호환되지 않으면 자동 환산하지 않고 재질문한다.
- 요청 수량이 업체의 최소 주문량보다 작으면 기본 결과에서 제외한다.
- 최소 주문량과 같으면 포함한다.
- 포장 단위가 다르면 비교 가능한 환산 규칙이 명시된 경우에만 계산한다.

### C2. `업체`와 `거래처 관계`를 분리

- `Vendor`: 누구나 확인 가능한 공급 업체 자체. 이름, 주소, 공개 연락처, 제공 품목 등.
- `TradingRelationship`: 특정 가게가 실제로 특정 업체와 거래한 관계. 실제 이용 여부, 마지막 거래일, 공개 동의 범위 등.
- `TradeExperience`: 실제 거래 경험을 바탕으로 작성한 게시물.

명함을 받았거나 업체를 알고 있다는 사실만으로 `거래 중`으로 표시하지 않는다. `N곳 이용 중`은 검증되고 공개 동의된 관계만 집계한다. 이 기능을 P0로 올리지 않는다면 스키마만 성급하게 만들지 않는다.

### C3. 배송 판정 규칙 통일

발표와 현재 SPEC의 표현을 다음 세 상태로 통일할 것을 제안한다.

```ts
type DeliveryEligibility = "supported" | "outside_area" | "unknown" | "pickup_only";
```

- 일반 검색에서는 업체를 숨기지 않고 배송 상태를 표시한다.
- `배송 가능` 필터를 켜면 `pickup_only`는 제외한다.
- 목적지가 명시된 서비스 지역 밖이면 `outside_area`로 표시한다.
- 서비스 지역 정보가 부족하면 `unknown`이며, 배송 가능으로 단정하지 않는다.
- 확정 배송 여부는 외부 문의가 필요할 수 있음을 표시한다.

### C4. API 경로를 `/api/v1`로 통일

기존 SPEC의 `/search`, `/posts` 등을 다음처럼 버전 경로로 옮길 것을 제안한다. 승인 전에는 양쪽 경로를 병행 구현하지 않는다.

---

## 5. 고정 기술 스택

| 영역 | 선택 | 기준 |
|---|---|---|
| 앱 형태 | 모바일 우선 반응형 웹/PWA | 앱스토어 배포 없이 빠른 MVP 검증 |
| 저장소 | 단일 저장소·단일 Next.js 앱 | 세 팀원의 계약 공유와 배포 단순화 |
| 언어 | TypeScript | 프론트·백엔드 타입 공유 |
| 런타임 | Node.js 24 LTS | 팀 전체 동일 버전 |
| 패키지 매니저 | pnpm | lockfile은 `pnpm-lock.yaml` 하나만 사용 |
| 프론트엔드 | React + Next.js App Router | 페이지·서버 API를 한 프로젝트에서 관리 |
| 스타일 | Tailwind CSS + shadcn/ui | 토큰 기반 UI와 빠른 재사용 |
| 폼·검증 | React Hook Form + Zod | 입력과 API 계약을 같은 스키마로 검증 |
| 서버 상태 | TanStack Query | 캐시, 재시도, loading/error 표준화 |
| API | Next.js Route Handlers | `/app/api/v1/**/route.ts` |
| DB | Supabase 관리형 PostgreSQL | 인증·DB·Storage 통합 |
| 공간 검색 | PostGIS | 반경·뷰포트 쿼리와 공간 인덱스 |
| DB 접근 | Supabase JS + SQL migration/RPC | 초기에는 ORM을 추가하지 않음 |
| 인증 | Supabase Auth + SSR cookie + RLS | 서버·DB 양쪽에서 권한 강제 |
| 이미지 | Supabase Storage | 승인된 게시물·증빙 이미지만 |
| 지도 | Kakao Maps JavaScript SDK | 지도 렌더링·마커·클러스터링 |
| 지오코딩 | Kakao Local REST API | 서버에서 주소를 좌표로 변환 |
| 현재 위치 | Browser Geolocation API | 거부 시 수동 지역 선택 |
| AI | OpenAI 공식 TypeScript SDK, Responses API, Function Calling | 검색 도구 호출과 근거 제한 |
| 단위 테스트 | Vitest | TypeScript 코드와 계약 검증 |
| E2E | Playwright | 모바일 핵심 흐름 검증 |
| 품질 | ESLint + Prettier + `tsc --noEmit` | PR 필수 검사 |
| CI | GitHub Actions | PR마다 동일 검증 |
| 배포 | Vercel + Supabase | 앱/API와 DB 분리 운영 |

### 5.1 이번 MVP에서 사용하지 않을 것

- Prisma, TypeORM, Sequelize 등 별도 ORM
- 별도 Express/Nest 서버
- MongoDB, Firebase 등 두 번째 DB
- React Native/Flutter 네이티브 앱
- 지도 데이터를 제품 업체 DB 대신 사용하는 방식

새 프레임워크나 런타임 의존성을 추가하려면 ADR과 팀 승인이 필요하다.

---

## 6. 전체 구조

```text
사용자 브라우저
  ├─ Next.js UI
  │   ├─ Kakao Maps JS SDK: 지도·마커 표시
  │   └─ TanStack Query: /api/v1 호출
  └─ Browser Geolocation: 현재 위치 권한
                │
                ▼
Next.js Route Handlers (/api/v1)
  ├─ Zod 요청 검증
  ├─ 인증·권한 확인
  ├─ 검색/커뮤니티/AI 서비스
  ├─ Kakao Local REST: 서버 지오코딩
  └─ OpenAI Responses API: 서버 전용
                │
                ▼
Supabase
  ├─ PostgreSQL + PostGIS
  ├─ Auth + RLS
  └─ Storage
```

핵심 원칙은 **카카오 지도는 지도를 그리는 도구이고, 업체·가격의 정본은 우리 DB**라는 것이다. 카카오 Places 검색 결과를 천하장사 업체 데이터처럼 저장·표시하지 않는다.

---

## 7. 권장 저장소 구조

```text
/
├─ AGENTS.md
├─ DEVELOPMENT_GUIDE.md
├─ SPEC.md
├─ ontology.yaml
├─ README.md
├─ .env.example
├─ package.json
├─ app/
│  ├─ (app)/
│  │  ├─ map/page.tsx
│  │  ├─ assistant/page.tsx
│  │  ├─ community/page.tsx
│  │  ├─ saved/page.tsx
│  │  └─ profile/page.tsx
│  ├─ vendors/[vendorId]/page.tsx
│  └─ api/v1/
│     ├─ search/route.ts
│     ├─ vendors/[vendorId]/route.ts
│     ├─ assistant/query/route.ts
│     ├─ posts/route.ts
│     ├─ posts/[postId]/route.ts
│     ├─ reports/route.ts
│     ├─ moderation/hide/route.ts
│     └─ health/route.ts
├─ components/
│  ├─ ui/
│  ├─ map/
│  ├─ vendor/
│  ├─ assistant/
│  └─ community/
├─ features/
│  ├─ search/
│  ├─ vendors/
│  ├─ assistant/
│  └─ community/
├─ lib/
│  ├─ contracts/
│  ├─ server/
│  ├─ supabase/
│  └─ kakao/
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
├─ tests/
│  ├─ unit/
│  ├─ golden/
│  └─ e2e/
└─ docs/
   ├─ decisions/
   ├─ interviews/
   ├─ evals/
   └─ ai-usage/
```

도메인 규칙은 React 컴포넌트나 Route Handler 안에 중복 작성하지 않고 `features/*/domain` 또는 `lib/server`의 테스트 가능한 함수로 분리한다.

---

## 8. 화면과 UX 기준

### 8.1 공통 내비게이션

하단 탭은 `지도 / AI 도우미 / 커뮤니티 / 저장 / 내 정보`를 사용한다.

- P0 탭: 지도, AI 도우미, 커뮤니티, 내 정보
- P1 탭: 저장. P0 중에는 비활성 또는 준비 중 상태 허용
- 활성 탭은 색상뿐 아니라 아이콘·레이블 상태로도 구분한다.
- 최소 375px 너비에서 주요 조작이 잘리지 않아야 한다.

### 8.2 지도 — 기본 진입 화면

목업의 핵심 구성을 따른다.

- 상단: 브랜드, 현재 지역, 알림 자리
- 검색: 품목명 또는 자연어 입력
- 필터: 카테고리, 수령 방식, 반경, 주문 수량
- 지도: 업체 마커와 대표 가격 라벨
- 선택 시: 하단 시트에 업체·품목·가격·배송비·최소 주문량·확인일 표시
- 상세 이동: `업체 상세 보기`

규칙:

- 지도와 목록은 동일한 검색 응답의 `vendorId` 집합을 사용한다.
- 좌표가 없는 업체는 목록에 상태를 표시할 수 있지만 지도 핀을 만들지 않는다.
- 위치 권한 거부 시 저장 지역 또는 수동 지역 선택으로 전환한다.
- 지도 SDK 장애 시 목록 검색은 계속 동작해야 한다.
- 마커가 많으면 클러스터링한다.

### 8.3 업체 상세

- 업체 공개 정보: 업체명, 공개 주소, 공개 연락처, 제공 카테고리
- 가격 정보: 품목, 규격, 금액, 배송비, 최소 주문량, 세금 조건
- 신뢰 정보: 출처 유형, 마지막 확인 날짜, `재확인 필요` 상태
- 배송: `지원`, `지역 밖`, `확인 필요`, `픽업만` 중 하나
- 외부 문의 버튼은 전화·웹사이트로 이동할 뿐, 앱이 주문을 대신하지 않는다.
- 별점 평균으로 품질을 단정하지 않는다.

### 8.4 AI 도우미

목업처럼 대화 입력과 업체 카드 결과를 제공하되, AI가 새 결과를 만들지 않는다.

예: `아주대 주변에서 양파 10kg 배송되는 곳 찾아줘`

1. AI가 품목·수량·지역·수령 방식을 구조화한다.
2. 필수값이 빠지거나 단위가 모호하면 질문한다.
3. 서버의 `search_vendors` 도구를 호출한다.
4. 응답된 업체·가격만 설명한다.
5. 각 카드에 출처와 확인일을 표시한다.
6. `지도에서 보기`는 같은 업체 ID를 지도에 전달한다.

### 8.5 커뮤니티

탭은 `전체 / 구매처 질문 / 가격 제보 / 거래 경험`으로 제한한다.

- 구매처 질문: 제목, 본문, 지역, 선택 품목
- 가격 제보: 업체, 품목, 금액, 규격, 확인일, 출처가 필수
- 거래 경험: 업체, 거래일, 본문이 필수
- 게시물에는 작성자 실명·정확한 매장 주소를 노출하지 않는다.
- 신고는 즉시 삭제가 아니라 운영자 숨김 검토 대상으로 저장한다.
- 댓글·저장 수치는 실제 기능이 없으면 표시하지 않는다.

### 8.6 공통 상태

모든 비동기 화면에 다음 상태를 구현한다.

- loading: 스켈레톤 또는 진행 상태
- empty: 결과 없음과 조건 수정 안내
- error: 사용자 오류와 외부 서비스 오류 구분
- offline/degraded: 지도 또는 AI가 실패해도 검색 목록은 유지
- stale: 오래됐거나 확인일이 없는 가격에 `재확인 필요`

---

## 9. 도메인 모델

### 9.1 핵심 개체

| 개체 | 의미 | 핵심 관계 |
|---|---|---|
| `Owner` | 인증된 자영업자 사용자 | 하나 이상의 `Store`에 소속 |
| `Store` | 사용자가 운영하는 가게 | 위치와 거래 관계를 가짐 |
| `Vendor` | 공개 공급 업체 | 위치, 품목, 가격 정보 제공 |
| `Item` | 표준화된 품목 | 카테고리·별칭·기준 단위 보유 |
| `PriceInfo` | 특정 업체의 특정 품목 거래 조건 | Vendor + Item에 종속 |
| `Location` | 주소·좌표·행정 구역 | Store/Vendor에 연결 |
| `SearchRequest` | 구조화된 검색 조건 | 결과를 만들지 않고 필터만 표현 |
| `CommunityPost` | 질문·가격 제보·거래 경험 | 작성자와 선택 Vendor/Item 연결 |
| `Report` | 게시물 신고 | 운영자 처리 상태 보유 |
| `TradingRelationship` | 실제 가게-업체 거래 관계 | 승인 시 추가할 후보 개체 |

### 9.2 절대 불변식

- `PriceInfo`는 정확히 하나의 `Vendor`와 하나의 `Item`에 연결한다.
- 가격 `null`은 `0원` 또는 `무료`가 아니다.
- 가격에는 규격·단위·최소 주문량·출처·확인일이 따라야 한다.
- 서로 다른 규격·단위·세금 조건은 자동으로 최저가 비교하지 않는다.
- 가격 변경은 기존 행을 덮어쓰지 않고 이력으로 추가한다.
- 샘플 데이터와 실데이터를 필드로 구분한다.
- `Vendor`를 안다는 사실과 실제 거래 관계를 같게 취급하지 않는다.
- AI·지도·커뮤니티는 같은 Vendor/Item/PriceInfo ID를 사용한다.
- 모든 시간 판정은 `Asia/Seoul` 기준이다.

---

## 10. 데이터베이스 설계 기준

### 10.1 필수 테이블 초안

| 테이블 | 주요 컬럼 |
|---|---|
| `profiles` | `user_id`, `display_name`, `role`, `verification_status` |
| `stores` | `id`, `owner_id`, `name`, `business_type`, `location_id`, `visibility` |
| `vendors` | `id`, `name`, `category_id`, `public_phone`, `location_id`, `status`, `data_kind` |
| `locations` | `id`, `address`, `road_address`, `district`, `point`, `geocode_status` |
| `categories` | `id`, `name`, `parent_id` |
| `items` | `id`, `name`, `category_id`, `base_unit`, `aliases` |
| `vendor_items` | `vendor_id`, `item_id`, `fulfillment`, `service_area`, `active` |
| `price_info` | `id`, `vendor_id`, `item_id`, `amount`, `package_quantity`, `unit`, `minimum_packages`, `delivery_fee`, `tax_included`, `checked_at`, `source_type`, `source_ref`, `status` |
| `community_posts` | `id`, `author_id`, `post_type`, `title`, `body`, `vendor_id`, `item_id`, `visibility`, `created_at` |
| `reports` | `id`, `reporter_id`, `post_id`, `reason`, `status`, `created_at` |
| `moderation_actions` | `id`, `moderator_id`, `target_type`, `target_id`, `action`, `reason`, `created_at` |

`trading_relationships`는 C2 승인 시 추가한다.

### 10.2 PostGIS 규칙

```sql
create extension if not exists postgis with schema extensions;
```

- 좌표는 `extensions.geography(POINT, 4326)`로 저장한다.
- 경도(lng)를 먼저, 위도(lat)를 나중에 넣는다.
- 공간 컬럼에 GIST 인덱스를 만든다.
- 반경 검색은 `ST_DWithin`, 거리 정렬은 `ST_Distance`를 사용한다.
- 브라우저에서 거리 계산 후 필터하지 않는다.
- 지도 이동 검색은 bounds 또는 중심+반경을 서버로 보낸다.

### 10.3 migration 규칙

- DB 변경은 `supabase/migrations/YYYYMMDDHHMM_description.sql`로만 수행한다.
- 공유·운영 DB를 콘솔에서 수동으로 바꾸지 않는다.
- 테이블, 인덱스, RLS 정책, 함수 변경을 한 migration에 함께 기록한다.
- 파괴적 변경은 별도 ADR, 백업·롤백 계획, 팀 승인이 필요하다.
- seed는 재실행 가능하고 가상 데이터임이 명확해야 한다.

### 10.4 데이터 입력·승인 흐름

가장 큰 난관은 화면이 아니라 신뢰 가능한 업체·품목·가격 DB다.

1. Backend A가 승인된 CSV/관리 입력 형식을 정의한다.
2. 업체명·주소·품목·단위·출처를 검증한다.
3. 서버가 Kakao Local REST API로 주소를 좌표화한다.
4. 중복 업체·품목을 정규화한다.
5. 원본 출처와 확인일을 보존한다.
6. `draft → approved → hidden` 상태로 운영자가 게시를 제어한다.
7. 30일 초과 또는 확인일 없음은 `재확인 필요`로 표시한다.

실제 업체 정보는 공개 또는 동의받은 정보만 사용한다. 증빙 원본에 개인정보가 있으면 공개 저장소에 커밋하지 않는다.

---

## 11. API 계약

### 11.1 공통 규칙

- 기본 경로: `/api/v1`
- 요청·응답은 Zod 스키마로 검증하고 프론트와 공유한다.
- 성공: `{ data, meta? }`
- 오류: `{ error: { code, message, fieldErrors?, requestId } }`
- 입력 오류 400, 인증 없음 401, 권한 없음 403, 미존재 404, 충돌 409, 외부 장애 502/503.
- 페이지네이션은 cursor 방식을 우선한다.
- 공개 계약의 필드명을 화면 편의 때문에 임의로 바꾸지 않는다.

### 11.2 엔드포인트 초안

| Method | Path | 용도 | 1차 담당 |
|---|---|---|---|
| `POST` | `/api/v1/search` | 업체·가격 공간 검색 | Backend A |
| `GET` | `/api/v1/vendors/:vendorId` | 업체 상세 | Backend A |
| `POST` | `/api/v1/assistant/query` | 자연어 구조화 + 검색 도구 호출 | Backend B |
| `GET` | `/api/v1/posts` | 게시물 목록·필터 | Backend B |
| `POST` | `/api/v1/posts` | 게시물 작성 | Backend B |
| `PATCH` | `/api/v1/posts/:postId` | 본인 게시물 수정 | Backend B |
| `POST` | `/api/v1/reports` | 신고 생성 | Backend B |
| `POST` | `/api/v1/moderation/hide` | 운영자 숨김 | Backend B |
| `GET` | `/api/v1/health` | 배포 상태 확인 | Backend B |

### 11.3 검색 요청 예시

```ts
const SearchRequestSchema = z.object({
  itemId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  query: z.string().trim().max(100).optional(),
  requestedQuantity: z.number().positive(),
  requestedUnit: z.enum(["kg", "l", "ea", "box", "pack"]),
  center: z.object({ lat: z.number(), lng: z.number() }),
  radiusM: z.number().int().min(100).max(20_000).default(3_000),
  fulfillment: z.enum(["any", "delivery", "pickup"]).default("any"),
  sort: z.enum(["distance", "latest"]).default("distance")
});
```

`itemId`와 `categoryId`가 모두 없고 `query`도 비어 있으면 거부한다. AI가 별칭을 표준 품목으로 확정하지 못하면 검색하지 않고 재질문한다.

### 11.4 지도 카드 응답 예시

```ts
type VendorMapCard = {
  vendorId: string;
  vendorName: string;
  location: { lat: number; lng: number; district: string };
  distanceM: number;
  offer: {
    priceInfoId: string;
    itemId: string;
    itemName: string;
    amount: number | null;
    packageQuantity: number;
    unit: string;
    minimumPackages: number;
    deliveryFee: number | null;
    deliveryEligibility: DeliveryEligibility;
    checkedAt: string | null;
    sourceType: "team_checked" | "vendor_provided" | "owner_report";
    freshness: "current" | "reconfirm_required";
  };
};
```

프론트는 가격·거리·배송 상태를 다시 계산하지 않고 서버 응답을 표시한다.

---

## 12. 지도 구현 기준

### 12.1 책임 분리

- Frontend: Kakao 지도 인스턴스, 마커, 클러스터, 필터 UI, 하단 시트, 목록 동기화
- Backend A: 좌표, 공간 인덱스, 지오코딩, 검색 SQL/RPC, 업체·가격 응답
- Backend B: 인증·권한과 API 공통 오류 처리 지원

지도 관련 기술 오너는 Backend A다. 화면 소유자는 Frontend다.

### 12.2 지도 데이터 흐름

```text
관리 입력/승인된 CSV
 → 서버 지오코딩(Kakao Local REST)
 → PostGIS 좌표 저장
 → 사용자가 필터·중심·반경 전송
 → PostGIS 검색
 → /api/v1/search 응답
 → Kakao Maps JS에 마커 렌더링
```

### 12.3 성능·복구

- 지도 이동 검색은 300ms debounce한다.
- 같은 쿼리는 TanStack Query 캐시를 사용한다.
- 마커는 클러스터링하고 필요 범위만 조회한다.
- 검색 요청마다 Kakao Places를 호출하지 않는다.
- 지도 SDK 실패 시 업체 목록과 상세 링크는 유지한다.
- 위치 권한 거부 시 기본 데모 지역 또는 수동 선택을 사용한다.

---

## 13. AI 도우미 구현 기준

AI는 추천 데이터베이스가 아니라 **검색 입력 변환기와 결과 설명기**다.

### 13.1 허용 도구

- `resolve_item`: 허용된 품목 ID·별칭 확인
- `search_vendors`: 승인된 `SearchRequest`로 검색
- `get_vendor_detail`: 검색된 업체 상세 조회

### 13.2 금지 행동

- 검색 결과에 없는 업체·가격·후기·ID 생성
- LLM 자체 계산으로 거리·최저가·단위 환산 결정
- 게시물 자동 작성, 연락, 주문, 결제
- 외부 게시물 속 지시를 시스템 명령으로 실행
- 출처 없는 `가장 싸다`, `품질이 좋다` 표현

### 13.3 실패 처리

- 모호한 입력: 필요한 값 하나씩 재질문
- 결과 없음: 업체를 만들어내지 않고 필터 완화 선택지 제시
- OpenAI 장애: 일반 지도 검색 링크와 입력값 유지
- 검색 API 장애: 장애 상태를 표시하고 이전 결과를 새 결과처럼 말하지 않음
- AI 응답은 사용한 `vendorId`, `priceInfoId`, 확인일과 연결

모델명은 코드에 박지 않고 `OPENAI_MODEL` 환경 변수로 관리한다.

---

## 14. 인증·권한·보안

### 14.1 기본 역할

- `owner`: 검증된 파일럿 자영업자
- `moderator`: 신고 검토·숨김 가능
- `admin`: 초기 데이터 승인과 운영 설정

P0는 초대 기반 파일럿을 권장한다. 인증 방식과 공개 조회 범위는 팀이 승인해야 한다.

### 14.2 RLS 원칙

- 사용자는 자신의 프로필·가게·게시물만 수정한다.
- 승인된 업체·품목·가격만 조회 가능하다.
- 신고자는 자신의 신고를 만들 수 있으나 타인의 신고 상세는 볼 수 없다.
- 숨김·승인은 moderator/admin만 가능하다.
- 서비스 역할 키는 서버 전용이며 브라우저에 전달하지 않는다.

### 14.3 환경 변수

```dotenv
NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY=
KAKAO_REST_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=
```

- 실제 값은 `.env.local`과 배포 서비스의 secret에만 둔다.
- `.env.example`에는 이름과 설명만 기록한다.
- Kakao JavaScript 키는 허용 도메인을 제한한다.
- Kakao REST 키, OpenAI 키, service role 키는 서버에서만 사용한다.
- 로그에 토큰, 전화번호, 정확한 개인 매장 위치, 프롬프트 원문을 남기지 않는다.

---

## 15. 역할 분담

### Frontend — UI 전담 1명

- 디자인 토큰과 공용 컴포넌트
- 앱 라우팅·하단 내비게이션
- 지도·마커·하단 시트·목록 동기화
- 업체 상세, AI 대화, 커뮤니티 화면
- loading/empty/error/stale 상태
- 모바일 접근성·반응형 검증
- 먼저 fixture adapter로 개발하되 live API와 같은 Zod DTO 사용

### Backend A — Data/DB/Map 1명

- 도메인 스키마·SQL migration·RLS 초안
- PostGIS 설정, 인덱스, 공간 검색 RPC
- 품목·단위 정규화와 seed/CSV 입력
- 출처·확인일·승인 상태 관리
- Kakao Local REST 지오코딩
- `/api/v1/search`, 업체 상세 API

### Backend B — Service/AI/Community 1명

- Supabase Auth·SSR 세션 연동
- API 공통 검증·오류·권한
- 커뮤니티, 신고, 운영자 숨김 API
- OpenAI Function Calling과 검색 도구 연결
- 테스트 하네스·CI·Vercel 배포

첫 1~2일의 DB 초기 구성은 Backend A와 B가 함께 검토한다. 이후 A가 데이터·지도, B가 서비스·AI·커뮤니티를 1차 소유한다.

---

## 16. 프론트와 백엔드 연결 방식

API 연결이 마지막에 몰려 실패하지 않게 **계약 우선 + 얇은 수직 흐름**으로 진행한다.

1. 세 명이 `lib/contracts`의 Zod 요청·응답을 먼저 승인한다.
2. Frontend는 동일 DTO의 fixture adapter로 화면을 만든다.
3. Backend는 동일 계약으로 Route Handler와 DB 쿼리를 만든다.
4. 첫 통합은 `seed 업체 1개 → /api/v1/search → 지도 핀 1개 → 카드 1개`로 끝까지 연결한다.
5. 이 흐름이 통과한 뒤 데이터 수와 화면을 늘린다.

```ts
interface VendorSearchRepository {
  search(input: SearchRequest): Promise<SearchResponse>;
}

// 개발 초기
const repository = new FixtureVendorSearchRepository();

// 통합 후
const repository = new ApiVendorSearchRepository("/api/v1/search");
```

핵심 제품 데이터는 UI에서 Supabase 테이블을 직접 조회하지 않는다. 인증·세션 도우미를 제외하고 `/api/v1`을 거친다.

---

## 17. 테스트와 Evals

### 17.1 필수 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

현재 SPEC에 Python 테스트 경로가 남아 있다면 이 TypeScript 스택에 맞춰 SPEC을 갱신한다. Python과 TypeScript 테스트를 이유 없이 병행하지 않는다.

### 17.2 최소 골든 케이스

1. 정상 품목·지역·수량 검색
2. 반경 100m·20,000m 경계와 잘못된 값 거부
3. 최소 주문량 미만 제외, 같은 수량 포함
4. 서로 다른 규격·단위 비교 차단
5. 가격 null·0원·무료 구분
6. 확인일 30일 초과 또는 없음 → 재확인 필요
7. 배송 상태 네 가지 표시
8. 지도·목록 업체 ID 집합 일치
9. 좌표 없는 업체의 지도 핀 미생성
10. 결과 없음과 외부 장애 구분
11. AI가 검색되지 않은 ID를 말하지 않음
12. 프롬프트 인젝션이 도구 권한을 바꾸지 못함
13. 가격 제보 게시물과 PriceInfo의 원자적 저장
14. 비로그인·타인 수정·운영자 권한 차단
15. 신고 후 운영자 숨김과 일반 조회 제외
16. 지도·OpenAI 장애 시 결정적 검색 흐름 유지

### 17.3 UI E2E

- 390×844 모바일 기준 핵심 흐름
- 위치 권한 허용·거부
- 필터 변경과 지도/목록 일치
- 업체 상세 진입
- AI 자연어 검색과 재질문
- 커뮤니티 세 게시물 유형 작성
- loading, empty, error, stale 상태

테스트를 통과시키려고 AC를 바꾸거나 `skip`으로 숨기지 않는다.

---

## 18. 스프린트 순서

### Sprint 0 — 계약 동결

- C1~C4 승인 여부 결정
- 첫 지역과 품목군 1~2개 결정
- Search/Price/Post Zod 계약과 골든 케이스 작성
- Supabase·Kakao·OpenAI 개발 키와 배포 환경 준비

완료 조건: SPEC·ontology·계약·골든 기대값이 서로 모순되지 않음.

### Sprint 1 — 골격·DB·첫 수직 흐름

- Next.js/Supabase 프로젝트 골격
- 디자인 토큰과 공용 컴포넌트
- migration, seed, PostGIS
- 업체 1개 검색 → 지도 핀 → 상세 연결

완료 조건: fixture가 아닌 DB seed가 배포 환경에서 지도에 보임.

### Sprint 2 — 지도 검색 완성

- 필터, 반경, 수량, 배송 판정
- 업체 상세, 출처, 확인일
- 위치 거부·지도 장애 fallback
- 검색 골든 테스트

완료 조건: 지도와 목록이 같은 결과를 표시하고 핵심 AC 통과.

### Sprint 3 — 커뮤니티

- 세 게시물 유형
- 가격 제보 원자적 저장
- 신고·숨김·RLS
- 개인정보·실데이터 검수

완료 조건: 권한 테스트와 운영자 숨김까지 동작.

### Sprint 4 — AI 도우미

- 자연어 구조화와 재질문
- 검색 도구 연결
- 근거 ID와 결과 카드
- 환각·인젝션·장애 eval

완료 조건: AI가 일반 검색과 같은 결과 계약만 사용.

### Sprint 5 — 통합·배포·데모 동결

- Playwright E2E
- GitHub Actions
- Vercel 배포와 smoke test
- AI 사용·코드리뷰·테스트 증거 정리
- 고정 commit SHA로 데모 동결

---

## 19. Git 협업 규칙 요약

- `main` 직접 작업·push 금지
- 이슈 하나 = 브랜치 하나 = PR 하나
- 브랜치: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `test/<issue>-<slug>`, `docs/<issue>-<slug>`
- Conventional Commit: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`
- 공용 계약 파일, migration, 디자인 토큰은 담당자를 먼저 정한다.
- 다른 사람의 미완료 변경을 되돌리거나 덮어쓰지 않는다.
- 최소 한 명 리뷰와 필수 CI 통과 후 병합한다.

---

## 20. 완료 정의

기능은 다음을 모두 만족해야 완료다.

- 연결된 이슈와 AC를 만족한다.
- Zod 계약과 ontology 의미가 일치한다.
- 실제 실행한 lint·typecheck·test·build 결과가 있다.
- loading/empty/error/stale 및 경계값을 확인했다.
- UI 변경에는 모바일 스크린샷 또는 영상이 있다.
- 새 migration과 RLS 정책이 리뷰됐다.
- 샘플과 실데이터가 구분되고 출처·확인일이 있다.
- 개인정보·비밀키·허위 업체 정보가 커밋되지 않았다.
- AI 위임 범위, 사람 검증, 남은 한계가 기록됐다.
- 배포 환경에서 smoke test가 통과했다.

---

## 21. 팀이 이 초안에서 확인할 결정 목록

- [ ] 첫 파일럿 지역을 `아주대 주변`으로 고정할 것인가?
- [ ] 첫 품목군 1~2개는 무엇인가?
- [ ] C1 주문 수량·단위를 SearchRequest에 추가할 것인가?
- [ ] C2 실거래 관계와 `N곳 이용 중`을 P0에 넣을 것인가?
- [ ] C3 배송 상태 네 가지 규칙을 승인하는가?
- [ ] C4 모든 API를 `/api/v1`로 바꿀 것인가?
- [ ] 초대 기반 인증과 검증된 사장님 전용 조회를 적용할 것인가?
- [ ] 목업의 저장·댓글·알림을 P1로 두는가?
- [ ] 가격 제보 증빙 이미지를 P0에 받을 것인가?
- [ ] 공개 업체 연락처와 사장님 매장 정보의 공개 범위를 어디까지 허용할 것인가?

이 체크리스트가 승인되기 전에는 해당 항목을 에이전트가 임의로 구현하지 않는다.

---

## 22. 참고 자료

- 저장소 `SPEC.md`, `ontology.yaml`, `AGENTS.md`, `README.md`
- 모바일 목업: 지도 탐색 / AI 도우미 / 사장님 커뮤니티
- 지난 발표 자료: 문제 발견 과정, Mini Ontology, 초기 SPEC과 비범위
- Kakao Maps JavaScript SDK 및 Kakao Local REST API 공식 문서
- Supabase PostgreSQL/PostGIS/Auth/RLS 공식 문서
- Next.js App Router·Route Handlers 공식 문서
- OpenAI Responses API·Function Calling 공식 문서
