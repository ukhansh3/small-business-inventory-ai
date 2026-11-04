# DB-COMMUNITY-001 — 커뮤니티 논리 모델·권한·초기화 명세

**상태:** C-01~C-10 제품 요구 승인. 아래 물리 테이블명은 **설계안 / 아직 migration·RLS 미구현**. 기존 `main`의 `public.vendors`, `public.vendor_items`, `public.review_events`, `app_private.staff_roles`와 독립된 영역.

## 데이터 소유와 관계

`demo_session` (기존 AI 명세가 요구하는 공통 세션; 구현 시 단일 정본 공유)
→ `demo_actor` (세션 내 불변 작성자 식별자 및 자동 닉네임)
→ `community_posts`
→ `community_comments`, `community_post_images`, `community_post_likes`, `community_post_saves`, `community_post_reports`, `community_moderation_events`.

여기서 `demo_actor`는 실사용자 프로필이 아니라 시연 중 기능 동작을 구분하기 위한 가명 주체다. 매 시연 내 참여자 복수인 경우에도 각각 검증된 actor로 식별하며, 프론트에서 임의 actor ID 전달만으로 소유권 전환 불가.

| 제안 테이블 | 주요 필드(제안) | 필수 제약/인덱스 |
|---|---|---|
| `demo_sessions` (공통) | `id`, `auth_subject_id`, `created_at`, `reset_at`, `expires_at` | 각 요청에서 세션 권한 검증; AI/저장과 공동 사용, 중복 생성 금지 |
| `demo_actors` | `id`, `demo_session_id`, `display_name`, `role(demo_member/demo_moderator)` | 세션+인증 주체 binding. 닉네임은 표시용. 관리자 role은 서버가 세션 scope로 검증 |
| `community_posts` | `id`, `demo_session_id`, `author_actor_id`, `category`, `title`, `body`, `visibility`, `created_at`, `updated_at` | CHECK category IN(`purchase_question`,`price_report`,`trade_experience`); 최신순 `(session, visibility, category, created_at DESC, id DESC)` |
| `community_post_images` | `id`, `demo_session_id`, `post_id`, `object_key`, `position`, `mime_type`, `byte_size` | `position` 유일 `(post_id,position)`, 동일 세션 FK; 사진 경로도 세션 scope |
| `community_comments` | `id`, `demo_session_id`, `post_id`, `author_actor_id`, `body`, `visibility`, `created_at`, `updated_at` | `(post_id,created_at,id)` 인덱스, parent_id 없음(대댓글 범위 제외) |
| `community_post_likes` | `demo_session_id`, `post_id`, `actor_id`, `created_at` | UNIQUE `(post_id,actor_id)`, 1회 좋아요 |
| `community_post_saves` | `demo_session_id`, `post_id`, `actor_id`, `created_at` | UNIQUE `(post_id,actor_id)`; 저장 탭과 공유할 논리 모델 |
| `community_post_reports` | `id`, `demo_session_id`, `post_id`, `reporter_actor_id`, `reason`, `status`, `created_at`, `resolved_at` | 신고 사유/처리 상태, 세션 scope, 동일 신고 중복 정책 구현 단계 결정 |
| `community_moderation_events` | `id`, `demo_session_id`, `post_id`, `moderator_actor_id`, `action`, `reason`, `created_at` | 행위 로그 append-only; 실운영 review_events와 분리 |

**물리 FK**는 `demo_session_id`가 모든 시연 쓰기에 걸리도록 설계한다. 단순 `post_id` 유효성 검사만으로 타 세션 post에 댓글·좋아요·사진을 붙일 수 없어야 한다. DB UNIQUE `(id,demo_session_id)` + 복합 FK 또는 RLS/트랜잭션에서 동일 소유권을 강제한다.

## 참조 정책과 삭제
- `community_posts`는 공식 `vendors`/`vendor_items`를 **수정하는 FK나 트리거가 없어야** 한다. 선택적 공개 업체 참조를 추가하더라도 텍스트/업체 ID 참고 링크만 처리하고 가격 마스터 업데이트 없음.
- 게시글 삭제/숨김 시 일반 세션 사용자 feed/detail/저장 결과에 노출하지 않는다. 댓글/사진/신고 기록의 보존/파기는 별도 개인정보·증빙 요구에 따라 검토. 데모 리셋에선 연관 자료 전체 소거.
- 좋아요/저장 수는 `COUNT` 또는 안전한 DB 집계로 산출; 클라이언트 전송 카운트를 그대로 저장하지 않는다.
- `created_at`은 서버 생성. 정렬은 `(created_at DESC, id DESC)` 안정적 정렬. 페이지 도중 신작성 글 발생 시 cursor 기반 정책으로 중복 최소화.

## 접근 통제/RLS 매트릭스

| 주체 | 게시글/댓글 조회 | 작성·수정·삭제 | 좋아요·저장·신고 | 관리자 숨김/삭제 | 실제 업체 데이터 쓰기 |
|---|---|---|---|---|---|
| 시연 멤버 | 본인 세션의 `published`만 | 작성 자유, 수정·삭제는 본인 ID만 | 본인 세션에서만 | 거부 | 거부 |
| 시연 관리자 | **자기 시연**의 공개+신고 대상/숨김 | 관리자 승인된 action만 | 자신의 범위 | 자기 세션만 허용·감사로그 | 거부 |
| 다른 시연 세션 | 거부 | 거부 | 거부 | 거부 | 거부 |
| 실제 서비스 운영자 | 데모 정책 별도 | 데모 정책 별도 | 데모 정책 별도 | 실운영 staff 롤만으로 자동 획득 불가 | 원래 기존 정책 그대로 |

RLS/서버 모두 세션 인증 주체와 `demo_session_id`를 검사한다. Supabase 익명 인증 이용 시 `authenticated` role만으로 접근 허용하지 않는다. 모든 읽기·쓰기와 Storage 다운로드에도 검증된 세션 scope 적용. `service_role`을 모바일·WebView에 제공하지 않는다.

## 이미지 저장소
- 제안: `community-demo-media/{sessionId}/{postId}/{assetId}`. 실제 저장 키는 서버가 발급/확정, 클라이언트 파일명 직접 신뢰하지 않음.
- 제안 제한: 게시글당 최대 5장, JPEG/PNG/WEBP 이미지 각 5MB. 수량/바이트/해상도/실제 MIME을 서버 검증, 금지 타입 차단, 서버 서명 링크에는 만료 부여. **숫자는 임시 기술 기본값.**
- 리셋/삭제 시 DB뿐 아니라 Storage 객체 접근 차단 및 비동기 삭제 실패 재처리. 공개 CDN으로 타 세션 이미지가 노출되지 않도록 함.

## 새 시연 시작 시 초기화
- 리셋 대상: 이 세션의 글, 댓글, 게시글 이미지, 좋아요, 저장, 신고, 관리자 액션, 시연 작성자/닉네임(새 세션에 새로 생성).
- 리셋 제외: `public.vendors`, `public.vendor_items`, 공개 승인 수정본, 운영자 계정/로그, 타 시연 세션, 외부 공개 업체 데이터.
- 새 시연 생성과 이전 시연 폐기는 원자적 상태 전이로 취급. 과거 JWT/세션 쿠키로 새 세션 데이터 읽기 불가. Storage 삭제 실패 시에도 과거 링크 접근 차단 우선.
- 리셋 API·만료 TTL·보존 기간은 **전역 데모 세션 문서에서 일괄 설계**, 이 문서가 독자적으로 예약 작업을 만들지 않는다.

## QA / 마이그레이션
1. 서로 다른 세션 A/B: 생성/조회/수정/삭제/이미지/반응/관리자 모두 교차 차단.
2. 일반 멤버가 moderator actor_id를 body에 주입하더라도 승격 불가. staff/실운영 업체 데이터 영향 없음.
3. 동시 좋아요 토글, 중복 글 등록, cursor 검색, soft delete, 신고 숨김 이후 링크 조회 차단.
4. 시연 리셋은 DB + Storage + 캐시·AI 기록에까지 일관되게 적용. 운영 데이터 불변.
5. 실제 DB 구현은 **새 migration 추가**. 기존 적용 migration 수정 금지, 롤백/테스트 문서 동반.
