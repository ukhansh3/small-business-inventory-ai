# 승인 요구사항 ↔ 명세 ↔ 구현 예정 ↔ 검증 추적

| 승인 요구 | 기능 문서 | API/DB | UI/QA | 상태 |
|---|---|---|---|---|
| 지도 Q1~Q24 | `docs/features/vendor-search.md` | `docs/api/vendor-search/*`, `docs/database/vendor-search.md` | `docs/ui/screens/vendor-search.md`, MAP-01~07 | 문서 작성 / 새 API 미구현 |
| 업체 상세 01~08 | `docs/features/vendor-detail.md` | 기존 `/vendors/{id}`, 저장 연동 | `docs/ui/screens/vendor-detail.md`, VENDOR-01~02 | 일부 코드 있음/새 UX 미구현 |
| AI-01~10 | `docs/features/ai-assistant.md` | `docs/api/ai-assistant/*`, `docs/database/ai-assistant.md` | `docs/ui/screens/ai-assistant.md`, AI-01~04 | 실제 모델 미구현 |
| C-01~10 | `docs/features/community.md` | `docs/api/community/*`, `docs/database/community.md` | `docs/ui/screens/community*.md`, COMM-01~03 | 샘플만 존재 |
| S-01~10 | `docs/features/saved.md` | `docs/api/saved/*`, `docs/database/saved.md` | `docs/ui/screens/saved.md`, SAVE-01~02 | 신규 개발 |
| 내 정보 UI-only | `docs/features/profile-ui-only.md` | 신규 업체관리 API 금지 | `docs/ui/screens/profile-ui-only.md`, PROFILE-01 | 화면만 |
| 공통 데모 | `docs/architecture/demo-boundary.md` | 제안 `/demo/session/*`, `docs/database/rls-matrix.md` | DEMO-01~02, SEC-01 | 보안 승인 전 구현 차단 |

용어: '문서 작성' ≠ '코드 구현' ≠ '테스트 통과'. 실구현 상태는 PR 시 최신 소스와 대조할 것.
