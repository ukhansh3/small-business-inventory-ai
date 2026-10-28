# Android 테스트 APK 제공

- 날짜: 2026-10-28
- 결정 근거: 사용자가 Android APK 설치 파일 제작과 휴대폰 형태 화면을 명시적으로 요청했다.

기존 Next.js/TypeScript 화면을 정적으로 내보내 표준 Android Java WebView에 포함한다. React Native, Flutter, 별도 DB/서버를 추가하지 않는다. 웹 앱의 P0 계약, 미승인 C1~C4, Supabase 인증/RLS, OpenAI 연동 범위는 바꾸지 않는다. 이 APK는 테스트 배포 파일이며 정식 운영 서비스나 Google Play 배포 완료로 표현하지 않는다.

개발용 서명, API 24 이상 설치, APK 내부 웹 파일·DEX 포함, 환경 파일 미포함을 검사한다. 실제 기기 검증과 브라우저 휴대폰 프레임 검증은 구분한다. 브라우저 `/phone`은 기존 화면 iframe이며 Android OS를 흉내 낸 실제 기기로 표시하지 않는다.
