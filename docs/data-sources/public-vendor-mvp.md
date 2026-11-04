# 공공 업체 시연 자료 중단 기록

2026-11-04 사용자 요청으로 공공데이터 업체 8곳을 앱에서 제거하기로 결정했다. 공공 업체 화면·메뉴·조회 API는 제거했다. 기존 도입 기록은 ADR-009에 남긴다. 현재 시연은 `mvp_synthetic_vendors`의 가상 업체 200곳을 사용한다.

서버 키에는 `mvp_public_vendors`의 DELETE 권한이 없어 실제 삭제 요청은 DB에서 거절됐다. Supabase SQL Editor의 관리자 역할로 아래 SQL을 실행해야 남은 8행이 삭제된다.

```sql
delete from public.mvp_public_vendors;
```

200개 가상 업체가 있는 `mvp_synthetic_vendors`는 이 삭제와 별도 테이블이다.
