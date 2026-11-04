# 업체 등록 DB 구현·검증 기록

사용자 위임: 민균 브랜치에서 기존 DB 규칙 설명서대로 구현. 사람 코드 리뷰·공유 DB 적용 승인은 아직 받지 않았다.
도구: Codex, Git, Supabase JS, Expo CLI, TypeScript, ESLint, Vitest, PGlite/PostGIS, Android adb, iOS simctl. SQL 실행은 격리된 로컬 테스트 DB에만 수행했다.

## 변경

- supabase/migrations: 업체·소유권·제출본·상품/가격 버전·사진·검토 이력, RLS, 제한된 RPC, 공간 인덱스.
- packages/vendor-contracts: 모바일/서버 공유 요청·응답 Zod 계약.
- apps/cheonhajangsa: 사용자 토큰 검증, 초안 저장·제출·취소·새 수정본·승인/보완·숨김·검색·상세·사진 API. 좌표 확정과 권한 확인된 사진 다운로드에만 서버 서비스 키 사용.
- apps/mobile: 로그인·회원가입·암호화 세션, 업체와 품목·가격 등록·비공개 사진 업로드, 내 제출본·운영자 검토, 승인 업체 지도·목록·상세 조회.
- 관련 ADR·SPEC 보충 링크·ontology 보충·개발 안내와 실제 DB 적용 설명 동기화.

## 실제 검증

- 서버 lint / typecheck / production build 통과.
- 서버·DB Vitest 59개 통과. 기존 17개, API 계약/오류 경계 13개, 실제 PostgreSQL/PostGIS 규칙 26개, Route Handler→SQL 수직 흐름 3개.
- 모바일 lint / typecheck / Vitest 32개 통과. 등록·지도 테스트 27개 및 암호화 저장소 조각 보존·실패 복구·동시 갱신 직렬화 5개.
- Android/iOS 번들 export 성공. Expo 의존성 검사 및 expo-doctor 20/20 통과.
- 저장→서버 좌표 기록→검토 요청→운영자 승인→공간 검색 공개를 실제 SQL과 HTTP 핸들러를 연결해 검증. Supabase 네트워크 전송과 Auth 서버 응답은 테스트 대역이다.
- 소유권/셀프 승인/가격 누락/교차 업체 품목/공개본 불변/보완/철회/숨김/사진 원본 비공개/버킷 공개 전환 금지/넓은 기존 Storage 정책 우회 차단/오래된 버전/감사 이력 불변을 검증.
- 승인 중 공개본 교체 단계에 테스트 오류를 넣어 승인 상태와 감사 기록이 함께 롤백되는 것을 확인.
- 실제 로컬 Next HTTP /api/v1/me/vendors에서 무인증 요청 401 UNAUTHENTICATED 응답 확인. 이 요청은 공유 DB에 접근하지 않았다.
- 의존성 변경 후 Expo Go를 완전히 재시작하여 iPhone 홈과 카카오 지도 표시 확인. Android에서 내 업체→등록 미리보기 진입, 새 필드와 비저장 안내 표시 확인. 앱 화면 증거: apps/mobile/docs/verification/vendor-db-register-preview.png.

## 한계·미수행

- 공유 Supabase 스키마 조회·DDL·사용자 생성·운영자 승격·데이터 변경은 수행하지 않았다. 현재 API 키만으로 SQL을 실행하려고 하지 않았다.
- Supabase Auth·Storage 서비스 자체의 실제 통합, 실제 사용자 로그인→사진 업로드→운영자 승인 전체 기기 테스트, 실운영 트래픽, 여러 DB 연결의 실제 동시 경합은 미검증이다.
- 로컬 PostgreSQL은 PGlite WASM 및 실험적 PostGIS 확장이다. 실제 Supabase 환경 적용 검증이 추가로 필요하다.
- APK/IPA 네이티브 컴파일·스토어 업로드·프로덕션 main 배포는 수행하지 않는다. 작업 대상은 민균 브랜치다.
- 실제 업체 검증·사업자 증빙·추가 관리자·비로그인 공개·탈퇴/보관 정책은 별도 결정 사항이다. 소유자 철회와 운영자 숨김은 API/DB를 제공하며 전용 운영 관리 화면은 추가 확장이 필요하다.

## 공유 DB 적용 전 확인

supabase/README.md와 docs/contracts/vendor-registration-v1.md 및 SQL 파일을 검토한다. 기존 스키마 이름, PostGIS 설치 스키마, Storage RLS 상태, 계정·운영자 권한을 확인한다. 테스트 프로젝트에서 적용 후 별도 서버 배포 주소를 모바일에 설정한다. 데이터 초기화나 기존 객체 drop으로 충돌을 해결하지 않는다.
