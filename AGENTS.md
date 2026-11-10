# 천하장사 저장소 작업 규칙

이 문서는 저장소 전체에 적용되는 정본이다. 하위 `AGENTS.md`는 해당 앱의 추가 규칙만 정의하며 이 문서를 대체하지 않는다.

## 1. 현재 단계

- 현재 단계는 **문제 근거를 보존하며 MVP 구현과 검증을 병행하는 단계**다.
- 현행 MVP는 지도·업체 탐색, AI 상추 검색·단가 진단을 공개 시연한다. 회원 기능과 이전 앱의 등록·검토 기록은 구현 현황에서 구분한다. 인터뷰로 검증된 사용자 요구처럼 표현하지 않는다.
- 구현 완료, 실연결 확인, 사용자 수요 검증을 서로 다른 상태로 기록한다.
- 사용자가 승인하지 않은 기능·기술·수익 모델을 확정 요구사항으로 만들지 않는다.

## 2. 정본 우선순위

문서가 충돌하면 임의로 절충하지 말고 다음 순서로 판단한다.

1. 사람이 채택한 최신 ADR (`docs/decisions/`)
2. `docs/SPEC.md` — 범위·API·수용 기준
3. `docs/ontology.yaml` — 문제 도메인 의미
4. `apps/cheonhajangsa-mvp/docs/acceptance-criteria.md`와 앱 API 타입·핸들러 — 현행 앱의 세부 기준과 구현 확인
5. `apps/cheonhajangsa-mvp/README.md` — 현재 개발·시연 환경
6. `docs/PROBLEM.md` — 문제와 근거 범위
7. 이전 앱의 개발 가이드·목업·발표 자료

인터뷰 사실의 정본은 `docs/interviews/logs/`와 `docs/evidence/evidence-ledger.md`다. ADR이나 SPEC이 관찰 사실을 바꿀 수 없다. `BusinessOwner`, `Vendor`, `Offer`, `SearchEpisode`의 도메인 정의는 `docs/ontology.yaml`의 `terminology`를 참고한다.

### 도메인 용어집

| 대표어 | 쓰는 필드와 구분 |
|---|---|
| `BusinessOwner` | `experience_years`, `category_experience`, `saved_contacts_available` |
| `Vendor` | 공급업체. API의 공공데이터 `Store`는 지도 조회 결과다. |
| `Offer` | `item_or_service`, `amount`, `specification`, `fulfillment`, `minimum_order`. 도메인의 `fulfillment`는 `pickup`, `delivery`, `both`, `unknown`을 쓴다. |
| `SearchEpisode` | 실제 탐색 사건. 앱의 `SearchCondition`은 검색 인자이며 `fulfillment`에 `pickup` 또는 `delivery`를 사용한다. |

## 3. 근거 규칙

- 인터뷰에서 확인한 과거 행동만 `관찰 사실`로 기록한다.
- 팀의 설명은 `해석`, 아직 반증 가능한 주장은 `가설`, 기능 선택은 `제품 결정`, 코드 동작은 `구현 계약`으로 구분한다.
- 인터뷰 수, 일시, 기간, 금액, 업체 수와 직접 인용을 임의로 만들지 않는다.
- 음성에서 찾지 못한 값은 `미확인`, 질문하지 않은 값은 `질문하지 않음`으로 쓴다.
- 핵심 문제 주장에는 `I02-E01`처럼 로그 안의 사건 ID 또는 `근거 없음`을 붙인다.
- 지지 근거뿐 아니라 반대 근거와 비대상 집단을 함께 기록한다.
- 자동 전사는 초안이다. 숫자·고유명사·직접 인용은 원음 대조 전 확정하지 않는다.

## 4. 개인정보와 데이터

- 실명, 개인 전화번호, 정확한 매장 주소, 동의서 원본, 전체 전사본을 커밋하지 않는다.
- 인터뷰 파일과 로그는 `I01` 같은 익명 ID를 사용한다.
- 서버 비밀키, 실제 계정·세션·UUID, 서명키와 `.env.local`을 커밋하지 않는다.
- `service_role`, 카카오 REST 키, LLM 키는 서버에만 둔다. 모바일 `EXPO_PUBLIC_*`에 넣지 않는다.
- 가상 데이터는 `[가상테스트]` 또는 `mvp_demo`로 표시하고 실제 업체 제공 정보와 섞지 않는다.
- 공공 원문 업체와 가상 가격을 결합할 때 ADR-009와 `docs/data-sources/public-vendor-mvp.md`의 경고를 유지한다.

## 5. 절대 불변 규칙

루트 SPEC의 `AC01~AC16`과 앱 수용 기준의 `AC-*`는 별도 번호 체계다. 아래 참조에서 하이픈을 구분한다.

- `[앱 AC-13, AC-29]` 공공 원문 업체와 예시 판매처의 출처·성격을 구분한다. 공공 업체에 미확인 가격·재고·번호를 붙이지 않고, 예시 번호로 실제 발신하지 않는다.
- `[AC04]` 배송 지원과 특정 목적지 배송 보장을 구분한다.
- `[AC05]` null 가격·배송비를 0원 또는 무료로 표시하지 않는다.
- `[AC06]` 확인일이 없거나 오래된 가격은 최신 정보처럼 표시하지 않는다.
- `[AC08, 앱 AC-28~30]` 같은 탐색 결과를 지도와 목록에서 일관되게 연결하고, 좌표가 없는 업체의 핀을 만들지 않는다.
- `[AC13]` AI는 조회되지 않은 업체·품목·가격 ID를 생성하지 않는다.
- `[AC11]` 클라이언트가 보낸 사용자 ID·역할로 권한을 부여하지 않는다.
- `[AC12]` `mvp_demo`를 승인 업체·실제 가격으로 변환하거나 표현하지 않는다.
- `[AC16]` 다른 사용자 응답에 개인 위치·비공개 업체·사진 경로를 노출하지 않는다.
- `[이전 앱 AC01, AC09, AC10, AC11]` 승인본만 공개하고 수정은 새 revision으로 검토하며 자기 업체는 승인하지 않는다. 등록·검토 흐름을 다시 도입할 때 적용한다.

## 6. 구현 전 확인

1. 현재 브랜치와 `git status`를 확인한다.
2. 관련 ADR·SPEC 절·AC·contract를 읽는다.
3. 기존 코드·테스트·migration을 검색한다.
4. 변경 파일, 비범위, 검증 명령을 짧게 제시한다.
5. DB schema, API DTO, 인증·공개 범위, 새 외부 서비스 또는 새 의존성이 바뀌면 구현 전에 사람의 승인을 받는다.
6. 다른 팀원 변경을 되돌리거나 migration을 다시 쓰지 않는다.

## 7. 현재 코드 경계

- `apps/cheonhajangsa-mvp/app/`, `src/` — Expo Router 화면, UI와 클라이언트 API 타입
- `apps/cheonhajangsa-mvp/api/v1/`, `server/` — Vercel API와 요청 검증·권한·AI·저장 처리
- `apps/cheonhajangsa-mvp/core/`, `data/` — 검색·단가 계산, Zod 데이터 스키마와 시연 데이터
- `apps/cheonhajangsa-mvp/supabase/migrations/` — 현행 앱 DB 변경. 적용된 migration은 수정하지 않고 새 migration으로 변경한다.
- `apps/cheonhajangsa-mvp/tests/`, `e2e/`, `evals/` — 앱 테스트·평가
- `apps/cheonhajangsa-mvp/src/cheonhajangsa/` — 모델이 사용하는 JSON Schema와 파싱 프롬프트
- `docs/`, `tests/harness/` — 증거·결정·제품 계약과 루트 골든 케이스

로컬 실행과 환경 설정은 [현행 앱 README](apps/cheonhajangsa-mvp/README.md)를 따른다. 앱 폴더 이동이나 배포 구조 변경은 별도 PR에서 검토한다.

## 8. 검증 명령

```bash
cd apps/cheonhajangsa-mvp
npm ci
npm run typecheck
npm test
npm run check:data
npm run lint
npm run build:web
```

변경 범위에 맞게 실행한다. 브라우저 검증은 환경을 준비한 뒤 `npm run e2e`로 수행한다. 실시간 모델을 부르는 `npm run evals`, `npm run evals:images`는 팀에 알리고 실행한다. 문서만 바꾸는 경우 링크·경로·YAML 형식을 확인하고 테스트 실행 여부를 PR에 적는다.

## 9. 브랜치와 PR

- `main`에 직접 커밋하지 않는다.
- 개인 브랜치는 최신 `main`에서 분기한다.
- PR에는 변경 이유, 관련 ADR/AC, 실행한 명령, 결과, 미검증 항목, 스크린샷 필요 여부를 적는다.
- SPEC·ontology·contract를 바꾸면 관련 테스트와 구현 상태 문서를 함께 갱신한다.
- 평가 대응을 위해 결과를 본 뒤 합격선을 바꾸지 않는다.

## 10. 중단 조건

다음 상황에서는 추측 구현을 멈추고 사람에게 확인한다.

- 인터뷰 원문이 없어 직접 인용이나 수치를 복원할 수 없음
- 동일 개념의 ADR·SPEC·contract가 서로 충돌함
- 실제 Supabase 삭제·reset·권한 승격이 필요함
- 실제 업체 정보를 공개하거나 제3자 권리를 판단해야 함
- 인증·결제·사업자 확인 정책을 새로 확정해야 함
- `main` 또는 다른 팀원 브랜치에 직접 쓰도록 요구가 바뀜

문서는 기본적으로 한국어로 작성하고 코드 식별자는 기존 영어 명명 규칙을 따른다.
