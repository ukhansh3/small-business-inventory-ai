# DB-SAVED-001 — 시연 저장 데이터 논리 스키마

**상태:** S-01~10 승인된 사용자 요구사항을 구현하기 위한 **물리 DB 제안**. Migration/RLS는 아직 적용하지 않음.

## 단일 정본과 관계
- `demo_sessions`, `demo_actors`: `docs/database/community.md`와 AI DB 문서의 공통 세션 모델 재사용. 실제 구현에서 중복 테이블 금지.
- `demo_vendor_saves` **신규 제안**: `(demo_session_id, actor_id, vendor_source, vendor_id, saved_at)`.
- `community_post_saves` **기존 커뮤니티 제안 재사용**: `(demo_session_id, post_id, actor_id, created_at)`. 저장 정렬 시 `created_at AS saved_at`.

## 제약과 인덱스
- vendor source: `live`(실제 승인 공개 업체) 또는 `synthetic_demo`/구현 시 정해진 시연 업체 식별값. source 검증 없는 UUID만으로 참조하면 안 됨.
- 유일키 `UNIQUE(demo_session_id, actor_id, vendor_source, vendor_id)`; 시간 역순 인덱스 `(demo_session_id, actor_id, saved_at DESC, vendor_id DESC)`.
- 커뮤니티 저장은 기존 `UNIQUE(post_id,actor_id)` 재사용하되, session scope가 FK/RLS로 보장되어야 함.
- `id`가 서로 같은 업체/게시글도 `kind`가 다르므로 목록 item key는 `(kind,source,id)`로 고유화.
- 저장 항목의 표시용 업체명·주소·가격·게시글 본문을 스냅샷으로 보관하지 않는다. 화면에는 **현재 공개/접근 가능한 원본 요약 정보**만 반환하여 비공개 전환 후 데이터 노출을 차단한다.

## 세션/권한 보장
- 모든 `SELECT/INSERT/DELETE`는 인증 주체 → 유효 시연 세션 → actor 매핑을 서버·RLS에서 확인. `authenticated` 롤이라는 이유만으로 전체 공개 허용하지 않는다.
- 시연 게스트가 실제 승인 `vendors` 테이블에 INSERT/UPDATE/DELETE 불가. 별도 moderator/staff 권한 자동 부여 금지.
- 타 세션의 저장·게시글·시연업체는 404 또는 빈 결과로 숨김.
- 새 시연 시작 시 해당 세션 두 저장 테이블/관련 데모 데이터 초기화. 원본 공개 업체/기존 운영 승인 기록/다른 세션은 변경 금지.

## 조회 스케치 (실제 SQL 계약 아님)
1. 인증된 session/actor의 `demo_vendor_saves` + `community_post_saves`를 UNION하여 최근 저장순 정렬.
2. cursor/limit 적용 후 업체 공개 최신본, 게시글 현재 공개상태를 **세션 격리 조건과 함께** 조인.
3. 조회 권한이 사라진 경우 원본 텍스트 제거한 tombstone 또는 제외. 현재 `GET /saved` 제안은 tombstone 선호.
4. pagination이 숨긴 레코드로 구멍 나지 않게 처리하며 누락/중복 회귀 테스트.

## 테스트/마이그레이션
- 별도 신규 migration, 이미 적용된 운영 migration 수정 금지.
- 두 세션이 같은 공개업체를 저장해도 각각 독립; 세션 A 초기화가 B에 영향 없음.
- 실업체 숨김, 게시글 삭제·moderation 숨김 시 저장 목록에서 콘텐츠 누출 없음.
- 반복 PUT/DELETE 멱등, post save 정본 한 개, 순서 안정성.
