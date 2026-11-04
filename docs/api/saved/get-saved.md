# GET /api/v1/saved — 저장 항목 통합 조회

**상태:** 제안 / 미구현. `S-01,03~07,09~10` 기반.

## Request
Query: `type=all|vendor|post`(기본 `all`), `limit`(기본 20, 최대 50 기술 제안), `cursor`(없으면 첫 페이지). 인증된 시연 세션은 서버 측에서 가져온다. `sort` 없이 최근 저장순 고정.

## Response `200 SavedList`
```json
{
  "items": [
    {
      "kind": "vendor",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "saved_at": "2026-11-04T10:00:00Z",
      "available": true,
      "vendor": {"name":"[시연] 아주 식자재", "category":"식자재", "address":"수원시 예시 주소", "checked_on":"2026-10-31", "data_kind":"synthetic_demo"},
      "post": null
    },
    {
      "kind": "post",
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "saved_at": "2026-11-04T09:30:00Z",
      "available": true,
      "vendor": null,
      "post": {"title":"[시연] 양파 구매처 질문", "category":"purchase_question", "author_name":"시연 사장님 1", "created_at":"2026-11-04T09:00:00Z"}
    }
  ],
  "next_cursor": null
}
```
위 응답은 **명세 예시용 가상 데이터**, 현재 서비스 실응답 아님.

## 규칙
- `kind` 태그로 UI 변형을 식별. 업체는 실제 공개 승인 업체 또는 시연 합성 업체일 수 있으므로 출처 `data_kind`를 유지.
- 공개/권한 검증 실패 항목은 두 가지 허용 전략 중 일관되게 구현: `available=false` + ID/종류/저장일 외 텍스트 모두 `null`, 또는 결과에서 제외. 본 제품에서는 **저장된 항목을 알 수 있도록 `available=false` 플레이스홀더 권장**(최종 API 계약 전 검토). 원본 정보 노출 금지.
- 같은 세션에서 북마크 해제 직후 서버 재조회 시 목록에서 제거. 게시글 저장은 커뮤니티 `community_post_saves` 정본 조회.
- cursor는 `(saved_at,id,kind)` 안정적·불투명 토큰; 잘못된 cursor `422 INVALID_INPUT`.

## 실패 및 QA
- 401 세션 부재/만료, 422 필터/커서 오류, 503 일시적 DB 오류. 404 타 세션 자원 참조.
- `all/vendor/post`에 동일 저장 ID가 정확히 한 번 나타남; 21개 이상 페이징 누락·중복 없음.
- 다른 시연 세션의 항목, 숨김 글 내용, 운영 DB 수정 이력 노출 0건.
