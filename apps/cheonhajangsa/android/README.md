# 천하장사 Android 테스트 APK

## 설치 파일

`dist/cheonhajangsa-debug.apk`를 Android 기기로 옮겨 열어 설치합니다. Android 7(API 24) 이상과 최신 Android System WebView가 필요합니다. 앱 시작과 샘플 데이터 검색은 PC 서버 없이 가능합니다. 지도 타일은 인터넷 연결이 필요합니다.

이 파일은 개발용 서명 APK입니다. Google Play 등록·심사·프로덕션 릴리스는 진행하지 않았습니다. 실제 인증·Supabase DB·AI 연결이 없는 화면 검증 버전이며, 가이드의 정식 P0 완료가 아닙니다.

## 빌드

프로젝트 루트에서 Node.js 24와 pnpm으로:

```sh
pnpm build:apk
```

Android Studio의 JDK 17, 설치된 Android SDK 34 및 Build Tools 34.0.0을 사용합니다. 별도 네이티브 프레임워크·Gradle·ORM은 도입하지 않았습니다. `CHEON_JAVA_HOME`, `ANDROID_SDK_ROOT`로 로컬 도구 위치를 지정할 수 있습니다. `build-apk.sh`는 공식 aapt/javac/d8/zipalign/apksigner로 패키징·서명·검증합니다. 개발용 keystore는 `build/debug.keystore`에 생성하며 Git에서 제외합니다.

## 구조와 지도

Next.js의 정적 export 파일을 APK assets에 포함합니다. Java WebView 셸이 `http://localhost:4310` 요청을 로컬 assets에서 처리하므로 PC의 localhost 서버에 연결하지 않습니다. 이 주소는 이미 등록한 Kakao JavaScript SDK 허용 도메인을 재사용합니다. 외부 일반 웹 링크는 브라우저로 엽니다.

파일·content 접근을 비활성화하고 JavaScript 네이티브 브리지는 추가하지 않았습니다. Kakao 정적 CDN이 생성하는 레거시 HTTP 리소스는 지정된 kakaocdn.net/daumcdn.net 하위 호스트의 GET 요청에 한해 HTTPS로 가져옵니다. 외부 CDN 평문 통신을 허용하거나 TLS 검증을 우회하지 않습니다. 위치 사용은 사용자가 웹 화면의 현재 위치를 누른 뒤 Android 시스템 권한으로 처리합니다.

`CheonSmoke` 디버그 로그에는 페이지 준비 여부, 카드·마커 수, 지도 초기화·타일 로딩 수만 기록합니다. 키·검색 입력·위치 값은 기록하지 않습니다.

## 휴대폰 모양 미리보기

로컬 개발 서버의 `/phone`은 실제 앱 UI를 375×844 화면 iframe에 표시하는 프레임입니다. Android 에뮬레이터 자체가 아니라 웹 UI 미리보기이며, 실제 APK 설치는 위 파일을 사용합니다.
