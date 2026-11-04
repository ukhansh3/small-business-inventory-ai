# 화면→API→DB 전체 데이터 흐름 (구현/제안 구별)

| 사용자 행동 | 모바일/UI | API/계약 (현재/제안) | DB·데이터 경계 | 확인 기준 |
|---|---|---|---|---|
| 앱 시작 | 내부 시연 세션 자동 복구 | 세션 발급 (제안) | demo_sessions/actors | 로그인 노출 X, 쓰기 권한 인증 O |
| 지도 최초 | GPS 또는 아주대 기본 위치 | `GET /vendors` 현재 계약; bounds 확장 제안 | 공개된 승인 업체 읽기 | 실제와 시연 출처 명시 |
| 이동 후 검색 | 지도 viewport → `이 지역 검색` | 지도 bounds 검색 (제안) | 승인·공개 업체만 | 검색 버튼 전 새 HTTP 요청 0 |
| 클러스터 | 지도 내 재클러스터링·줌 | 추가 네트워크 요청 없이 로컬 캐시 | 마지막 검색 적용 범위 | 수치=업체 수; 확대 후 버튼 노출 |
| 선택 업체 | bottom card | 검색 result + `GET /vendors/{id}` | 공개 업체 상세 | 출처/세금/가격 확인일 |
| AI 메시지 | 채팅·추천 카드 | `POST /ai/messages` (제안) | 서버 공개 업체 근거 + 세션 대화 | 가짜 가격 생성 금지 |
| 커뮤니티 | 글·댓글·신고·좋아요 | `community/*` 17개 (제안) | demo session rows/storage only | 타 세션 차단 |
| 저장 | 업체+글 북마크 | `saved/*` + 기존 community save (제안) | demo_vendor_saves/community_post_saves | 삭제·숨김 본문 누출 금지 |
| 내 정보 | 화면 UI만 | 신규 관리 API 없음 | DB 신규 쓰기 없음 | 준비 중 명시 |
| 새 시연 | 사용자 액션 | session start/reset (제안) | 해당 session 쓰기만 정리 | 운영/타 시연 0건 영향 |

## 지도/AI 공유 위치 상태
- `draftBounds`: 지도 제스처/카메라로 현재 보이는 영역.
- `appliedBounds`: 마지막 성공한 사용자 조회의 영역. AI의 지역·결과/정렬도 **appliedBounds만** 사용.
- bounds 변경 자체는 DB 검색 요청을 유발하지 않는다. 성공 시 `appliedBounds` 갱신, 오류 시 이전 정상 검색과 오류 안내 유지.
- `카메라 위치 이동`(핀/목록/AI 연동)은 사용자 검색 재실행 아님.
