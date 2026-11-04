# API-COMMUNITY — 게시글 작성

**제안 엔드포인트:** `POST /api/v1/community/posts`  
**상태:** C-01~10 승인 제품 요구사항에 대한 **API 초안**. `main`에 아직 없음. 엔드포인트 이름/상한은 구현 전 최종 검토할 기술 제안.

## 요청
JSON `{category:"purchase_question|price_report|trade_experience",title:"...",body:"...",image_ids?:["uuid",...],client_request_id?:"uuid"}`. `all`은 금지. 이미지 ID는 현재 세션의 유효 업로드 결과여야 함.

## 성공 응답
`201 PostDetail` (신규 생성 ID 포함).

## 서버·권한·데이터 규칙
작성자 ID·닉네임은 server session에서 확정. 게시글+이미지 연결을 하나의 트랜잭션으로 처리. 중복 제출 방지 키 제안. **가격 제보로 vendor_items 수정 불가**.

## 오류
401 세션 없음; 422 빈 내용/카테고리/이미지 오류; 409 이미지 소유/중복 충돌; 503 저장 실패. 표준 본문은 `{"error":{"code":"...","message":"...","requestId":"..."}}`.

## 수용 테스트
- 정상 흐름 성공 코드/응답 DTO Zod parse 통과.
- 동일 세션 접근 허용, **다른 시연 세션 ID** 및 만료된 세션 접근 차단.
- 소유자/시연 관리자 역할을 위조하거나 게시글이 삭제·숨김된 경우 민감한 본문/사진 재노출 금지.
- 정식 `vendors`/`vendor_items` 및 타 시연 세션 데이터 변경 **0건**.

공통 규약·필드 제안은 [`../conventions.md`](../conventions.md), 기능 근거는 [`../../../features/community.md`](../../../features/community.md).
