# GET /api/v1/map/vendors — 가시 영역 업체 목록 (제안)

**상태:** PROPOSED / main 미구현. 기존 `GET /vendors`는 반경+20개 offset 검색으로 유지되어 있음.

- Query: 지도용과 같은 `south,west,north,east,query,category,item,delivery` + `cursor?`, `sort=distance|price`, `limit=20`.
- Response 200 (제안): `{items:[{vendorId,source,name,category,address,distanceM,displayItem?}],totalVendors,nextCursor}`.
- 거리순 기준: **마지막으로 검색을 적용한** 가시 bounds 중심점. 같은 거리면 안정적 ID 정렬, 동일 조회 과정에서 pagination drift 방지.
- 가격순은 사용자 메뉴 존재만 승인. 비교 가능한 규격·세금·배송비 등 확인되지 않은 단위 가격을 임의 우열 비교 금지. 불가 시 상태/설명 제공.
- 지도 markers와 목록은 **검색 적용 scope**에서 전체 업체 ID가 일치해야 한다. 20건씩 리스트만 추가 로딩, 지도 집합 전체 유지.
