# API-COMMUNITY — 게시글 사진 업로드

**제안 엔드포인트:** `POST /api/v1/community/posts/images`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
`multipart/form-data` 단일 image 제안. 아직 미등록 게시글에서도 업로드 가능하도록 **세션에 귀속된 임시 업로드 토큰/asset ID** 발급.

## 성공 응답
`201 {image_id:"uuid",preview_url:"short-lived-url"}`; URL은 현재 세션에만 접근 허용.

## 서버·권한·데이터 규칙
서버가 업로드 타입·파일 서명·byte size·세션 소유권 검증. 미사용 임시 업로드는 TTL 정리. 실제 스토리지 경로는 노출 금지.

## 오류
401; 413 크기 초과; 415 미지원 형식; 422 이미지/장수 유효성; 503 Storage 장애. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
