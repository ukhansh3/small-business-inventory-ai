# 실제 Supabase 적용 기록

- 확인일: 2026-10-29
- 사용자 요청: “슈파베이스에 올려봐”.
- 대상: 천하장사 조직 / cheonhajangsa 프로젝트 (`hhkuuhlrlddzxvhxdvtj`), Supabase main / Production DB.
- Git 구현 브랜치: 민균. Git main 병합·서버 배포와는 별개의 DB 적용 작업이다.
- 방식: 로그인된 Supabase SQL Editor에서 저장소 SQL 전체를 실행. 붙여넣은 SQL과 로컬 파일의 완전 일치를 확인한 뒤 실행했다.
- SQL 파일: supabase/migrations/202610280001_vendor_registration.sql
- SHA-256: 65db190d5ec89f146f08639254d724a1d773df2cfe112889dcd284b82902f4c6

## 적용 전 확인

대상 업체 관련 테이블·vendor-images 버킷·PostGIS는 없었다. storage.objects와 storage.buckets의 RLS는 모두 활성화 상태였다. 로컬 서버의 Supabase URL이 이 프로젝트와 일치함도 확인했다. 기존 사용자·업체 데이터를 조회하거나 변경하지 않았다.

## 적용 결과

SQL Editor의 `Success. No rows returned` 성공 응답 확인.

- public 테이블 8개 + app_private.staff_roles 1개 = 9개 생성.
- 등록·검토·조회용 public RPC 함수 13개 생성.
- PostGIS 3.3.7, extensions 스키마에 설치 확인.
- vendor-images 버킷: 비공개, 파일 한도 3,145,728바이트.
- 9개 테이블 모두 RLS 활성화.
- authenticated 역할의 테이블 직접 INSERT/UPDATE/DELETE 권한 없음.
- anon 역할의 13개 RPC 실행 권한 없음.
- apply_vendor_geocode는 authenticated/anon 실행 불가, service_role 실행 가능.
- private revision_json/check_submission 함수는 authenticated/anon 실행 불가.
- Table Editor에서 8개 public 테이블과 vendors의 컬럼·RLS·0 records 표시 확인.

검증 요약 SQL 결과: tables=9, rls_on=true, direct_writes_blocked=true, rpc_count=13, anon_rpc_blocked=true, photos_private=true.

## 범위와 남은 작업

실제 업체·가격·테스트 사용자·운영자 계정을 넣지 않았다. 운영자 권한을 누구에게도 새로 부여하지 않았다. 새 테이블과 함수·정책·비공개 버킷을 적용했으며 앱의 회원가입→저장→승인 실서비스 전체 흐름은 아직 별도 검증이 필요하다.

서버 코드 배포, 모바일의 해당 API 주소·Supabase 공개 설정, 운영자 지정이 남아 있다. SQL Editor로 적용했으므로 Supabase CLI migration history에 자동 등록됐다고 주장하지 않는다. 동일 최초 생성 SQL을 이 프로젝트에 다시 실행하지 않는다.

## 확인 화면

- supabase-vendors.png: 실제 vendors 테이블과 public 테이블 목록.
- supabase-permissions.png: 실제 DB의 권한·RLS 검증 결과.
- 대시보드: https://supabase.com/dashboard/project/hhkuuhlrlddzxvhxdvtj/editor/18687?schema=public
