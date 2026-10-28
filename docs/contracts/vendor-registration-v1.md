# 업체 등록·검토 계약 v1

상태: 2026-10-28 사용자 요청으로 민균 브랜치에서 구현. 공유 Supabase 적용·실서비스 검증 전.
범위: 업체 사장 직접 등록, 업체별 품목·필수 가격, 운영자 검토 후 공개. 기존 SPEC의 다른 미승인 항목 전체를 승인한 것이 아니다.

## 결정과 기본값

- 초안 저장은 필수값을 다 채우기 전에도 가능하다. 검토 요청·승인 때는 업체명·분류·공개 연락처·주소·서버 확인 좌표·수령 방식·배송/수령 조건과 판매 중인 품목 최소 1개가 필요하다.
- 판매 중 품목에는 이름·규격 설명·규격 수량/단위·양수의 원화 정수 가격·세금 조건·최소 주문 개수·가격 확인일을 요구한다. 배송 상품은 배송비 적용 기준도 요구한다. 배송비 null은 미확정, 0은 무료 배송이다. 부가세는 포함/별도/면세를 구분한다.
- 작성 중/draft → 검토 대기/pending_review → 승인/approved 또는 보완 필요/changes_requested. 검토 대기는 수정 불가. 취소 시 버전을 올려 초안으로 돌린다.
- 승인본은 수정·삭제하지 않는다. 새 수정본이 검토 중인 동안 기존 공개본을 유지한다. 운영자 승인 시 업체 정보·품목·가격·공개본 포인터·검토 기록을 단일 트랜잭션으로 갱신한다.
- 업체 숨김은 제출본 상태와 별도의 vendors.hidden이다. 새 수정본 승인만으로 숨김을 해제하지 않는다. 사장은 공개 철회만, 운영자는 숨김·재공개를 할 수 있다. 사유 필수.
- 비로그인 공개는 미결정이므로 **현재는 로그인 사용자에게만** 승인 공개본을 제공한다. 가입만으로 점주·사업자 실재 확인을 보증하지 않는다. 운영자 권한을 사용자가 선택하지 못한다.
- 추가 관리자 초대·소유권 이전·사업자 증빙·주문·결제·커뮤니티·실제 AI는 이 계약에 포함하지 않는다.

## 정본과 저장 구조

- 공유 요청/응답 Zod 계약: packages/vendor-contracts/index.ts. 모바일과 서버가 같은 file 의존성을 설치한다.
- SQL 정본: supabase/migrations/202610280001_vendor_registration.sql.
- Supabase Auth: 로그인과 비밀번호. profiles에 비밀번호를 보관하지 않는다.
- profiles: 사용자 ID와 표시 이름. app_private.staff_roles: 서버 관리용 운영자 권한.
- vendors/vendor_members: 업체 식별자, 현재 공개본, 숨김, 소유권. 한 업체의 최초 생성자를 소유자로 연결한다.
- vendor_revisions: 제출본, 상태, 내용, 검토 정보, 서버 좌표, 낙관적 잠금용 version.
- vendor_items/item_revisions: 업체별 상품 식별자와 제출본별 상품·가격. 다른 업체의 상품 ID 연결은 복합 외래키로 금지한다.
- vendor_images: 제출본별 비공개 Storage 객체 경로와 정렬·대표 여부. 새 수정본에는 이전 사진을 자동 복사하지 않으며 별도 업로드한다.
- review_events: 승인·보완·숨김·재공개·철회와 당시 스냅샷. 내부 메모와 스냅샷은 운영자만 읽는다. 소유자는 별도 owner_message만 받는다.

## API

모든 API는 `/api/v1`, Bearer 사용자 access token 필수. 서버가 Supabase Auth getUser로 토큰을 검증하고 같은 사용자 토큰으로 RPC를 호출한다. 응답은 private/no-store, 오류는 `{error:{code,message,fieldErrors?,requestId}}`.

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET | /me/vendors | 내 제출본과 운영자 여부 |
| POST | /me/vendors | 새 초안 또는 기존 초안 저장 |
| GET | /me/revisions/:id | 소유자·운영자의 제출본 조회 |
| POST | /me/revisions/:id/submit | 서버 지오코딩 후 검토 요청 |
| POST | /me/revisions/:id/cancel | 검토 요청 취소 |
| POST | /me/vendors/:id/revision | 승인 업체의 새 수정본 생성 또는 기존 수정본 반환 |
| GET | /vendors | 반경·검색어·분류별 승인 업체 조회, 20개 단위 |
| GET | /vendors/:id | 현재 승인 공개본 상세 |
| POST | /vendors/:id/visibility | 소유자 철회 또는 운영자 숨김·재공개 |
| GET | /moderation/revisions | 운영자 검토 대기 목록, 20개 단위 |
| POST | /moderation/revisions/:id | 운영자 승인·보완 요청 |
| POST | /me/revisions/:id/images | 3MB 이하 JPEG/PNG/WebP 사진 업로드·연결 |
| GET | /images/:id | 접근 권한을 재확인하는 사진 프록시 |

저장은 `{draft,creation_key,revision_id,expected_version}`. 신규는 revision_id/expected_version이 null이고 creation_key UUID로 최초 생성 재시도를 중복 방지한다. 동일 생성 키의 재요청은 기존 초안을 반환하므로 다시 불러온 뒤 추가 편집한다. 기존 수정은 저장 당시 version이 필요하며 일치하지 않으면 409 STALE_DRAFT를 반환한다.
검토 요청·취소는 `{expected_version}`. 검토는 `{expected_version,decision,owner_message,internal_note}`. 보완 요청 사유는 필수다. 승인 재시도는 동일 현재 승인본에 한해 감사 기록을 중복 생성하지 않는다.

## 보안 경계

사용자가 SQL 테이블을 직접 수정할 권한은 없다. 쓰기는 제한된 SECURITY DEFINER RPC를 통하며 사용자 ID·소유권·상태·버전을 DB에서도 검사한다. 함수 search_path를 비우고 이름을 명시하며, PUBLIC/anon 기본 실행 권한을 회수한다. 승인본·자식 품목·사진 및 감사 기록에는 불변 트리거를 둔다.

좌표 입력은 앱이 정할 수 없다. 초안 저장 RPC는 좌표를 초기화한다. 검토 요청 API가 소유권과 버전을 확인하고 Kakao 주소 결과가 정확히 1개일 때 서버 전용 RPC로 좌표를 기록한다. 그 RPC는 service_role만 실행한다. API에서 사용하는 서비스 키는 좌표 기록과 권한 확인 후 Storage 객체 다운로드에만 필요하며 일반 업체 조회·수정·검토는 사용자 RLS를 유지한다.

Storage 버킷은 비공개다. 버킷 자체를 공개로 전환·삭제하는 클라이언트 작업도 restrictive 정책으로 금지한다. 작성 중 제출본 소유자만 새 객체를 올릴 수 있고, 클라이언트 덮어쓰기·삭제는 금지한다. 기존의 넓은 Storage 허용 정책과 OR로 결합되어 우회되지 않도록 이 버킷에 restrictive 정책 경계도 둔다. 승인 공개본 사진도 일반 이용자는 Storage 원본을 직접 읽거나 signed URL을 발급하지 못한다. 사진 프록시가 사용자 권한을 확인한 뒤 해당 객체만 다운로드하고, 다운로드 후 권한을 재확인하며 no-store로 반환한다. 숨김 뒤 새 요청은 거부한다. 이미 기기에 내려받은 바이트를 회수할 수 있다는 뜻은 아니다.

사진 메타데이터 연결이 실패하면 비공개 고아 객체가 남을 수 있다. 공개하지 않으며, 운영자가 참조 여부 확인 후 별도 정리한다. 모바일에서 사진을 선택해 비공개 초안에 업로드하고, 운영자 검토 화면과 승인 공개본 상세에서 권한 확인 사진 프록시로 표시한다. 카메라·마이크 권한은 요청하지 않는다.

## 검증 한계

로컬 PGlite PostgreSQL + PostGIS에서 실제 SQL/RLS/제약/트리거/RPC를 검증한다. Auth·Storage 서비스 스키마는 최소 테스트용 대역이다. Supabase HTTP Auth/Storage 서비스 자체와 실제 공유 DB 적용은 별도 검증한다. 단일 연결 테스트가 다중 세션 동시성 실험을 대체하지 않으며 행 잠금·트랜잭션·버전 검사를 구현하고 재시도·오래된 버전 거절을 테스트한다.

사진 한도는 Vercel 함수 요청·응답 한도보다 여유를 둔 3MB로 제한한다. 참고: https://vercel.com/docs/errors/function_payload_too_large
