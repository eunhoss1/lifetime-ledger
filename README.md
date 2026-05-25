# Lifetime Ledger

로컬 우선 개인 가계부 PWA입니다.

## 개발 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run lint
npm run build
```

## 현재 구현 상태

- Vite + React + TypeScript, Tailwind CSS, vite-plugin-pwa, Dexie schema v1
- 기본 카테고리/계좌 seed, 날짜/금액 유틸
- 수입/지출 거래 CRUD, 현재 월 거래 목록, 월별 요약
- 반복지출 등록, 이번 달 미반영 항목 미리보기, 사용자 확인 후 거래 생성, 중복 생성 방지
- 반복지출별 이번 달 상태 표시: 반영 완료, 미반영, 기간 아님, 보관됨
- 반복지출 지출 성격 선택: 고정지출, 변동지출, 저축/투자
- 월마감 snapshot 저장, 닫힌 월 거래/반복지출 반영 차단, 다시 열기
- 전체 JSON 백업 내보내기, 백업 파일 검증/요약, 확인 문구 기반 전체 복구
- 현재 월/전체 거래 CSV export, 보관된 카테고리/계좌 표시명 유지
- 카테고리/계좌 최소 관리 UI와 보관 처리
- 상태 기반 탭 UI: 홈, 입력, 반복지출, 월마감, 백업/내보내기, 설정

## CSV 안내

- CSV는 Excel 호환을 위해 UTF-8 BOM과 CRLF 줄바꿈을 사용합니다.
- Excel용 CSV에서는 `monthKey`가 `May-26`처럼 자동 변환되지 않도록 텍스트 형식으로 내보냅니다.
- Excel에서 날짜 칸이 `######`처럼 보이면 데이터가 깨진 것이 아니라 열 너비가 좁은 상태입니다. 열 너비를 넓히면 보입니다.
- 복구는 CSV가 아니라 JSON 백업/복구 기능을 사용합니다.

## 아직 구현하지 않은 범위

- CSV import
- Playwright E2E 테스트
- Supabase/Firebase 동기화
- React Router
- 차트
- 자산/배당 관리
- 예산 고도화
