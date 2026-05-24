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

- 1단계: Vite + React + TypeScript, Tailwind CSS, vite-plugin-pwa, Dexie 스키마 v1, 기본 카테고리/계좌 seed, 날짜/금액 유틸
- 2단계: 수입/지출 거래 CRUD, 현재 월 거래 목록, 월별 요약 카드, 거래 repository/domain 테스트
- 3단계: 반복지출 등록, 현재 월 미반영 반복지출 미리보기, 사용자 확인 후 이번 달 거래로 반영, 중복 생성 방지
- 4단계: 월마감 snapshot 저장, 닫힌 월 거래/반복지출 반영 차단, 다시 열기, 재마감
- 5단계: 전체 JSON 백업 내보내기, 백업 파일 검증/요약, 확인 문구 기반 전체 복구
- 6단계: 현재 월/전체 거래 CSV export, 카테고리/계좌 표시명 포함, soft deleted 거래 기본 제외
- MVP 안정화: 카테고리/계좌 최소 관리 UI, 보관 처리, 기존 거래 표시명 유지

## 아직 구현하지 않은 범위

- CSV import
- Playwright E2E 테스트
- Supabase/Firebase 동기화
- React Router
- 차트
- 자산/배당 관리
- 예산 고도화
