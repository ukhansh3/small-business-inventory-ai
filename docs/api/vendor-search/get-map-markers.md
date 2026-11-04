# GET /api/v1/map/markers — 지도 전체 업체 마커 조회 (제안)

**상태:** PROPOSED / main 미구현. 승인된 기능은 `가시 bounds 내 전체 업체 표시`, **URL/DTO 필드는 기술 제안**.

- Query: `south,west,north,east` WGS84 bounded numbers; `query?`, `category?`, `item?`, `delivery?`, `cursor?`. 정확한 키·최대 범위는 구현 전 승인/검증.
- Response 200 (제안): `{markers:[{id,source,latitude,longitude,name,matchingItems:[{itemId,name,specification,priceKrw}]}], totalVendors, nextCursor}`. 마커가 20건보다 많으면 cursor로 **전체 페이지를 누적**해 클러스터링한다.
- `totalVendors`는 쿼리 전체 distinct 업체 수. `nextCursor=null` 전에는 지도 표시가 부분집합임을 분명히 하고 전체라고 가장하지 않는다.
- 처음 20개 업체만 전체 마커처럼 사용하면 Q11 위반. 파트별 수집 시 모두 조회하거나 서버 집계/스트리밍 대안 별도 검증. 화면 밖 업체 포함 금지.
- 공개 실업체와 가상업체 `source`를 반드시 구분하고 DB 조회 정책 동일하게 적용한다.
- 테스트: 73곳 전체 ID 집합, cursor 중복 0, 재검색 클릭 전 네트워크 0, 취소/응답 역전, oversized bounds 별도 오류/안내.
