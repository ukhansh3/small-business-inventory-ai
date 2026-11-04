# 천하장사 디자인 시스템 — 목업 기준 초안

## 확정된 방향 / 미확정 수치 구분
- **승인:** 흰 배경, 검정 텍스트, 선명한 주황색 강조, 둥근 카드/칩, 지도 중심과 하단 시트, 5탭.
- **제안 HEX:** `#F04B24` 주황(현행 코드), `#111111` 기본 검정, `#6B7280` 보조 회색, `#FFFFFF` 배경, `#F7F7F8` 표면. 사용자 승인된 픽셀값 아님.
- **현행 코드와 충돌:** `apps/mobile/src/components/ui.tsx`의 `colors.ink=#18283A`는 남색 계열이다. UI 변경 PR에서 검정 계열로 바꾸도록 **명시**. 기존 root/다른 화면 영향까지 확인.
- **기본 컴포넌트:** 검색 필드, CategoryChip, VendorMarker, ClusterMarker, BottomSheet, VendorPreviewCard, ItemPriceRow, SourceBadge, ChatBubble, RecommendationCard, CommunityCard, BookmarkButton, Loading/Empty/Error.
- **접근성:** 한글 텍스트 대비, 화면 읽기용 버튼 label, 탭 최소 터치 면적(권장 44dp), 키보드 회피, 시스템 글자 크기, 지도 목록 대체 탐색.
- **보안:** 화면에 원본 비밀키/정확한 사용자 위치 기록 노출 금지, 다른 세션 비공개 카드 스냅샷 미노출.
