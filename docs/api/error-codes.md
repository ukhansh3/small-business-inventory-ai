# API 에러 코드 일람 (공통 목표 제안)

| HTTP | code | 의미 | UX |
|---|---|---|---|
| 400 | INVALID_JSON | JSON 파싱 실패 | 입력 재확인 |
| 401 | UNAUTHENTICATED | 내부 시연 세션 없거나 만료 | 로그인 요구 대신 안전한 자동 세션 복구 |
| 403 | FORBIDDEN | 실제 권한 부족 | 접근 불가 |
| 404 | NOT_FOUND | 없음/타 세션/비공개 | 원본 텍스트 숨긴 접근 불가 |
| 409 | CONFLICT / STALE_VERSION | 중복·버전 충돌 | 다시 불러오기 |
| 413 | BODY_TOO_LARGE | 이미지·입력 크기 초과 | 크기 줄이기 |
| 422 | INVALID_INPUT | 입력/좌표/필터 검증 실패 | 필드 수정 |
| 429 | RATE_LIMITED | 과다 요청/모델 할당량 | 다시 시도 |
| 503 | DATABASE_UNAVAILABLE | DB 연결/쿼리 장애 | 오류와 검색 0건 구별 |
| 503 | MODEL_UNAVAILABLE | LLM 장애 | AI만 오류, 검색 가능하면 유지 |
| 503 | SERVER_NOT_CONFIGURED | 필수 설정 미완료 | 시연 중 연결 준비 상태 표시 |

기존 `vendor-api.ts`는 위 코드 중 일부만 실제 구현. 위 표는 신규 제안과 구현 현황을 혼합하지 않는다.
