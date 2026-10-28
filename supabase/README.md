# 업체 등록 DB 적용 안내

현재 브랜치: 민균. **SQL 파일과 앱/API 코드만 준비했으며 공유 Supabase에는 자동 적용하지 않았다.** 기존 프로젝트에 같은 이름의 테이블·버킷·함수가 있는지 먼저 점검한다. 이 migration은 최초 생성용이며 기존 객체를 덮어쓰거나 drop하지 않는다. 이름 충돌이나 오류가 나면 트랜잭션 전체가 실패하도록 설계했다. Storage 시스템 테이블의 RLS가 꺼져 있으면 STORAGE_RLS_REQUIRED로 적용을 중단한다. 다른 버킷에 영향을 줄 수 있으므로 임의로 시스템 설정을 바꾸지 말고 관리자 검토를 받는다. PostGIS는 extensions 스키마를 기준으로 한다. 이미 다른 스키마에 설치돼 있다면 해당 환경에 맞는 검토 없이 재설치·이동하지 않는다.

## 적용 순서

1. 테스트 프로젝트 또는 복구 가능한 백업을 준비한다. `migrations/202610280001_vendor_registration.sql`과 `../docs/contracts/vendor-registration-v1.md`를 검토한다.
2. Supabase SQL Editor에서 migration 파일 전체를 한 번 실행한다. 또는 관리자가 준비한 Supabase CLI의 migration 절차를 사용한다. SQL Editor가 없거나 DB 연결 권한이 없으면 API 키만으로 SQL을 실행하려고 하지 않는다.
3. 앱과 서버에 공개 설정·서버 전용 설정을 각자 넣는다. 실제 값은 Git에 커밋하지 않는다.
4. Supabase Auth에서 이메일 가입·확인 흐름을 준비한다. 가입 후 메일을 확인하고 앱에서 다시 로그인하는 방식을 사용한다.
5. 신뢰할 팀원이 SQL Editor에서 아래 운영자 지정 SQL의 UUID를 실제 운영자 계정 ID로 바꿔 실행한다. UUID는 Supabase Auth 대시보드에서 확인한다. 앱이나 일반 API에서 운영자 권한을 부여하지 않는다.

```sql
insert into app_private.staff_roles(user_id, role)
values ('여기에 실제 운영자 UUID'::uuid, 'moderator');
```

6. **민균 브랜치의 서버**를 배포한 HTTPS 주소를 모바일 `EXPO_PUBLIC_API_BASE_URL`에 넣는다. main에 배포된 이전 서버를 가리키면 새 API가 404일 수 있다. DB가 미적용이면 503 DATABASE_NOT_READY로 구분한다.
7. 서로 다른 사장 계정과 운영자 계정으로 초안 저장 → 검토 요청 → 승인 → 지도 공개 → 수정 재검토 → 숨김을 검증한다. 운영자 자신의 업체는 다른 운영자가 검토해야 한다.

## 환경 변수

서버 apps/cheonhajangsa/.env.local 또는 서버 배포 환경:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY (좌표 확정·권한 확인 후 사진 다운로드만 서버에서 사용)
- KAKAO_REST_API_KEY (주소 좌표 확인)
- 기존 NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY (지도 페이지)

모바일 apps/mobile/.env.local:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- EXPO_PUBLIC_API_BASE_URL (서버 origin, /api/v1 제외)
- 기존 EXPO_PUBLIC_KAKAO_MAP_URL

모바일에는 service_role/REST/OpenAI 키를 넣지 않는다. Vercel에 넣은 설정은 Expo 앱으로 자동 복사되지 않는다. 설정 후 Metro 재시작·앱 재빌드가 필요하다. 설정이 없으면 샘플 모드이며, 실제 서버 오류를 샘플 결과로 바꾸지 않는다.

## 로컬 검증

Docker나 실제 공유 DB를 건드리지 않고:

```sh
cd apps/cheonhajangsa
pnpm install --frozen-lockfile
pnpm test
```

PGlite와 실험적 PostGIS 확장은 테스트 의존성으로만 사용한다. 운영 DB는 Supabase PostgreSQL/PostGIS이며 다른 운영 DB를 도입하지 않는다. 테스트 대역 Auth/Storage는 실제 Supabase 서버가 아니다.

운영 DB 삭제·reset·자동 seed·실사용자 생성·운영자 계정 자동 승격은 수행하지 않는다. 실제 업체·가격을 seed로 만들지 않으며 모든 로컬 테스트 데이터는 가상이다. 기존 웹 정적 export APK에는 API 서버를 포함할 수 없다. 사용 앱은 apps/mobile의 Expo Android/iOS 앱이다.
