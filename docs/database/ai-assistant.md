# DB-AI-ASSISTANT-001 — AI 도우미 데이터·세션 격리 초안

- **상태:** 사용자 AI-01~10 제품 정책 승인 / DB 스키마 **미승인·미구현**.
- **기존 사실:** `main`의 `202610280001_vendor_registration.sql`은 공개 업체·품목·수정본·심사 정보를 저장한다. `assistant` 전용 채팅 DB나 API는 아직 없음.

## 읽기 경로 — 기존 공개 업체 재사용
- 실제 업체 검색은 승인·공개 상태만 조회하는 기존 vendor RPC/DTO 정책을 재사용한다. 숨김/보류/미승인 수정본·비공개 필드·운영자 메모 제외.
- AI 화면은 마지막 **적용된** 지도 bounds를 사용해야 하며, 현재 실구현은 radius 기반·20건 단위이므로 읽기 계약 확장이 선행된다.
- 시연 업체는 `synthetic_demo`·`mvp_demo` 등 **data_kind 분리된 조회 경로**를 사용; 실제 업체 자료와 섞어 업체 제공 가격이라고 표기하지 않는다.

## 제안 논리 모델 (물리 테이블명 승인 전)
| 논리 엔터티 | 제안 주요 필드 | 역할/주요 제약 |
|---|---|---|
| `demo_session` (공통 데모 기능) | `id`, `owner_auth_id`, `created_at`, `reset_at`, `expires_at` | 로그인 UI 없이도 시연별 분리된 접근 범위를 제공. 발급·초기화는 공통 인증 명세 책임 |
| `assistant_thread` | `id`, `demo_session_id`, `created_at`, `updated_at` | 대화 단위, 시연 세션 소유권 필수 |
| `assistant_message` | `id`, `thread_id`, `role`, `content`, `created_at`, `client_message_id` | user/assistant 양방향 메시지, 메시지 중복 요청 방지 |
| `assistant_result_reference` (선택) | `message_id`, `vendor_id`, `item_id`, `data_kind`, `checked_on`, `evidence_snapshot` | 당시 응답의 근거·가격 출처와 확인일 보존. 삭제 시 대화와 함께 소멸 |

**위 물리 테이블명/관계는 제안**이다. 공통 데모 세션 시스템의 실제 구조가 다르면 중복 테이블을 만들지 않는다. 데이터양이 적은 데모라면 안전한 세션별 로컬 기록 + 서버 응답 재검증의 결합도 비교하되, AI-10 유지·초기화·격리 요건을 동일하게 증명해야 한다.

## RLS·권한·보존 규칙
- 각 읽기/쓰기에는 `demo_session_id`(서버 발급 권한 검증) 또는 검증된 인증 주체를 연결. ID만 알면 타 대화를 읽을 수 있는 구조 금지.
- `Supabase Anonymous Auth` 사용자도 DB에서 `authenticated` 역할일 수 있으므로 **역할명만으로 일반 사용자/운영자 권한 구분하면 안 됨**. 별도 정책 검사 필요.
- 관리자 심사 데이터·실제 승인 업체/품목 마스터에 데모 챗봇 쓰기 권한 부여 금지.
- 시연 데이터 자동 초기화는 해당 세션의 thread/message/reference와 별도 시연 쓰기 자료에만 적용. '새 시연' 시점·보존 기간 정책은 공통 데모 세션 계약에서 확정.
- API 키·LLM 추론 비밀/외부 응답 원문 등 민감한 값 DB에 저장하지 않음. 사용자 입력의 보존·삭제 정책과 개인정보 최소화 필요.
- 물리 스키마를 적용한다면 **새 migration + 제약/인덱스/RLS/테스트**, 기존 적용 migration 수정 금지.

## 권장 제약/인덱스 (설계 후보)
- thread 소유 세션 FK, message thread FK, message role CHECK, idempotency UNIQUE `(thread_id, client_message_id)` (user 메시지에 한정).
- session/thread별 `created_at`, 최근 메시지 검색용 `(thread_id, created_at, id)` 인덱스.
- 세션 삭제시 관련 메시지/참조만 연쇄 정리, 실제 업체 및 품목 엔터티에는 DELETE CASCADE가 전파되지 않도록 함.
- 참조 업체 삭제/비공개 시 과거 대화 화면에 최신 가격처럼 렌더링하지 않고 오래된 근거 상태 안내.

## 필수 QA
- 세션 A 쓰기/조회/초기화가 세션 B나 실제 공개 업체 데이터에 영향 없음을 검증.
- 익명 시연 세션과 실운영자 권한 분리, auth 토큰 만료 복구, 요청 빈도 제한.
- 시연용 가상 업체의 source/data_kind 유지, 공개 업체 미승인 revision 노출 차단.
- 새 시연 시작 시 대화 기록 사라짐, 이전 thread ID 조회 거절.
