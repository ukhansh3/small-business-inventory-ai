# API-COMMUNITY-COMMON — 커뮤니티 API 규약 (제안)

**상태:** 엔드포인트/필드/숫자 제한 모두 **구현 제안**, 아직 `main`에는 없다. C-01~10의 UX 요구만 사용자 승인. API 루트 후보는 `/api/v1/community`이며 기술 설계 최종 검토 후 `packages/vendor-contracts`에 Zod 계약을 정의한다.

## 공통 접근
- 사용자는 로그인 화면을 지나지 않지만 **서버에서 검증한 시연 세션**이 모든 읽기/쓰기의 기준이다. 기존 API `endpoint()`가 Bearer 필수인 사실과 모순되지 않도록 비대화형 세션 발급/만료/재발급은 공통 모듈에서 해결.
- 세션/actor ID를 body에서 받더라도 이를 권한 사실로 신뢰하지 않음. 인증 주체 → server session → actor를 서버에서 매핑.
- 모든 목록/객체 조회는 `demo_session_id`로 제한. `hidden/deleted` 글은 일반 피드·상세·저장에서 미노출; 실제 승인 업체 공개 데이터와 완전 분리.
- 시연 관리자 기능은 현재 데모 세션에서 확인된 moderator 역할만 허용. 클라이언트가 `role=admin`을 보내어 관리자 권한을 얻을 수 없어야 함.
- 글/댓글/제보 콘텐츠를 공식 가격/업체 데이터의 사실 출처로 취급하지 않음.

## 제안 응답 DTO
- `PostSummary`: `{id,category,title,excerpt,author:{id,display_name},created_at,updated_at,cover_image_id|null,comment_count,like_count,is_liked,is_saved}`.
- `PostDetail`: `PostSummary + {body,images:[{id,url_or_read_endpoint,position}],visibility}`. 민감한 오브젝트 키·다른 세션 정보 노출 금지.
- `Comment`: `{id,post_id,author:{id,display_name},body,created_at,updated_at,can_edit,can_delete}`.
- `Page<T>`: `{items:T[],next_cursor:string|null}`; cursor는 클라이언트가 위조해 범위를 넓힐 수 없음.
- `ReactionState`: `{post_id,is_liked,like_count,is_saved}`; 상태는 서버 원천으로 동기화.
- `Report`: `{id,post_id,reason,status,created_at}`; 일반 신고자에게 타인 신고정보 공개하지 않음.

## 제안 검증/페이지/오류
- 카테고리 enum `purchase_question|price_report|trade_experience`; 목록 필터는 `all`도 허용.
- 제안 상한: 제목 1..100자, 본문 1..5000자, 댓글 1..1000자, 사진 0..5장, JPEG/PNG/WEBP 각 최대 5MiB, 페이지 크기 기본 20/최대 50. **수치는 임시 기술 기본값, 사용자가 확정한 값 아님.**
- 최신순 `created_at DESC,id DESC`; 커서는 그 페이지의 정렬 기준을 담은 불투명 서명/검증 토큰 제안. 필터 변경 시 cursor 무효.
- 성공: GET 200, 생성 POST 201, 수정 200, 좋아요/저장 PUT 200, 삭제 DELETE 204, 관리자 결정 POST 200. 204는 응답 본문 없음.
- 오류: `error:{code,message,requestId,fieldErrors?}` 패턴을 기존 `vendor-api.ts`와 통일. 401 세션 없음/만료, 403 소유권/역할 부족, 404 다른 세션·숨김·없음, 409 상태 충돌, 413 첨부 크기, 422 입력 오류, 429 과다 요청, 503 서버 오류.
- 시연 초기화: 이 커뮤니티 namespace가 별도 임의 API로 수행하지 않는다. 공통 데모 세션 reset에서 커뮤니티 전체 자료 정리.
- 추가 계약: API별 idempotency, 이미지 업로드 완료/정리, 신고 중복 정책, 소프트 삭제 상태 전이는 기술 확정 필요.

## 테스트 게이트
서버 검증 + DB RLS + Storage 접근정책 + 세션 교차접근 + hidden 재노출 방지 + 가격 마스터 불변 테스트 완료 전 배포/완료 선언 금지.
