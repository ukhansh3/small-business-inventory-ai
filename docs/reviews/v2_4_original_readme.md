# 천하장사 기능·API·DB·UI 통합 명세 v2.4

기준: 2026-11-04 / GitHub `ukhansh3/small-business-inventory-ai`의 `main` 일부 파일 확인 + 사용자 제공 모바일 목업 + 승인된 결정. 본 ZIP은 **명세만** 포함하며 GitHub commit/push·실제 DB migration·시뮬레이션·배포는 하지 않았다.

## 이번 데모의 제품 범위
| 실제 동작 구현 | UI만 이번 데모 | 후순위 |
|---|---|---|
| 지도 탐색·업체 상세, 실제 LLM AI 도우미, 커뮤니티, 업체·게시글 저장 | **내 정보·업체 관리 화면** | 신규 업체 등록·수정·심사·승인 워크플로, OAuth·정식 계정 |

**시연 정책:** 앱 실행 시 로그인 화면 없음. 내부적으로 안전한 격리 시연 세션을 사용하고, 공개 실제 업체는 읽기 전용, 시연 쓰기 데이터는 세션별 격리/새 시연 시작 시 자동 초기화. 사용자 목업 스타일은 흰 배경·검정 텍스트·주황 강조. 미구현 버튼은 실제 작동하는 것처럼 속이지 않고 `준비 중`으로 표시.

## 확정 기능
- **지도 탐색:** Q1~Q24, 전체 영역 업체 클러스터/하단 20건/`이 지역 검색`/거리순 등.
- **업체 상세:** DETAIL-01~08, 가격·세금·배송·전화·저장·지도 연동.
- **AI 도우미:** AI-01~10, 실제 LLM + 서버 업체 조회 + 근거 있는 비교, 시연 세션 기록.
- **커뮤니티:** C-01~10, 게시글·사진·댓글·반응·신고·시연 관리자.
- **저장:** S-01~10, `전체/업체/게시글`, 저장·해제/최근 저장순/새 세션 초기화.
- **내 정보·업체 관리:** **UI만**. 운영 DB를 변경하는 신규 업체 관리 흐름은 이번 데모 제외.

## 문서 구조
| 레이어 | 문서 |
|---|---|
| 결정 | `DECISIONS.md`, `docs/features/feature-matrix.md` |
| 기능 | `docs/features/vendor-search.md`, `vendor-detail.md`, `ai-assistant.md`, `community.md`, **`saved.md`, `profile-ui-only.md`** |
| API | `docs/api/vendor-search/`, `ai-assistant/`, `community/`(메서드별), **`saved/` (GET/PUT/DELETE + 커뮤니티 저장 재사용)** |
| DB | `docs/database/vendor-search.md`, `vendor-detail.md`, `ai-assistant.md`, `community.md`, **`saved.md`** |
| UI | `docs/ui/screens/vendor-search.md`, `vendor-detail.md`, `ai-assistant.md`, `community*.md`, **`saved.md`, `profile-ui-only.md`** |
| 개발 가이드 | `docs/ui/AGENTS.md` |

## 기존 main과의 차이 (2026-11-04 확인)
- 현행 Expo 탭은 `지도/AI 도우미/커뮤니티/내 업체` **4개**: `저장` 신설하고 `내 업체`를 `내 정보`로 변경할 계획.
- 커뮤니티는 정적 샘플 2개; AI는 실제 LLM 없이 샘플 키워드 검색; 저장 탭 미구현.
- 업체 상세·업체 등록·심사 API/DB는 일부 구현되어 있지만 기존 API는 Bearer 인증 필수. 사용자에게 로그인 화면을 요구하지 않는 새 시연 세션/권한 설계 필요.
- 신규 API/DB 경로·테이블은 **기술 설계 제안**이다. 사용자 확정은 기능/UX/범위에 대한 것임.
- 이전 v2.3 문서의 `저장 미승인`, `내 정보 검토 대기` 등의 과거 표현보다 이 README와 `DECISIONS.md`의 **최신 결정 우선**.

## 변경 이력
- v2.0 지도 Q15~Q24 확정
- v2.1 업체 상세 8개 항목 확정
- v2.2 AI 도우미 10개 항목 확정
- v2.3 커뮤니티 10개 항목 + 엔드포인트별 API 명세
- **v2.4 저장 10개 항목 확정, 저장 API/DB/UI 추가, 내 정보·업체 관리 UI 전용 정책 추가**

## 다음 작업 (추가 질문 없이 추진 가능한 범위)
1. 공통 시연 세션의 인증·RLS·초기화 설계 하나로 통합.
2. API OpenAPI / Zod 계약 / DB migration 요구 일치성 점검.
3. 사용자 목업 기준 5탭 UI 시나리오 작성 및 실제 구현용 에이전트 작업 분담.
4. 내 정보 화면은 UI만; 업체 관리 신규 백엔드 개발은 후순위.
