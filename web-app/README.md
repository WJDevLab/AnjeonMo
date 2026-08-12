# 안전 전동킥보드 모바일 웹

앱 이름이 정해지지 않은 상태로 구현한 React + TypeScript 기반 모바일 웹입니다. 초기 목업의 흰색 카드 UI와 블루·블루퍼플 디자인 언어를 유지하면서 헬멧 Bluetooth, 데크 Wi‑Fi, 실시간 안전 확인, 이용 중 화면, 기록·통계 빈 상태를 구현했습니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

검증:

```bash
npm run lint
npm test
```

## 주요 화면

- `/`: 웰컴
- `/home`: 홈과 실제 현재 위치 지도
- `/scooters`: 킥보드 선택 빈 상태
- `/scooter`: 킥보드 상세
- `/safety-check`: 실시간 안전 확인
- `/riding`: 실제 주행 상태 UI
- `/history`: 이용내역
- `/payment`: 결제 준비 상태
- `/profile`: 내 정보와 주행 통계 메뉴
- `/statistics`: 상세 통계 빈 상태

앱 이름, 사용자, 위치, 킥보드 번호, 배터리, 거리, 가격, 통계는 임의로 생성하지 않습니다. 실제 값이 없으면 `null`, 빈 배열, `—`, `정보 없음`, `기록 없음`으로 표시합니다.

## 실제 연동 설정

`.env.example`을 `.env.local`로 복사하고 하드웨어 팀과 합의한 값을 설정합니다.

- 헬멧: Web Bluetooth 서비스 UUID와 characteristic UUID
- 데크: Wi‑Fi 장치 또는 중간 서버가 제공하는 WebSocket URL
- 주행: 실제 거리·시간·요금 스트림 WebSocket URL
- stale 판단: 양쪽 장치의 전송 주기와 heartbeat를 합의한 뒤 설정

설정이 없거나 데이터가 오래됐거나 형식 오류가 있으면 안전 확인은 실패 폐쇄 방식으로 동작하며 출발 성공을 추정하지 않습니다. Web Bluetooth 권한 선택은 브라우저 정책상 사용자의 `탑승 시작` 동작에서 시작됩니다.

## 지도

지도는 위치 권한을 받은 실제 현재 좌표가 있을 때만 Leaflet과 OpenStreetMap 타일을 불러옵니다. 가짜 위치, 지도 좌표, 주변 킥보드 마커를 만들지 않습니다. 운영 규모가 커지면 사용량 정책과 SLA에 맞는 타일 제공자로 교체할 수 있도록 지도 컴포넌트를 분리했습니다.

## 숫자 없는 상태 테스트

운영 기본값에서는 테스트 모드가 꺼져 있습니다. 로컬에서 enum 상태만 확인하려면:

1. `.env.local`에서 `NEXT_PUBLIC_ENABLE_SENSOR_SCENARIOS=true`로 설정합니다.
2. `/safety-check?sensor=test`를 엽니다.
3. 화면 하단 `센서 상태 테스트`에서 연결, 헬멧, 발 위치 상태를 선택합니다.

테스트 모드는 화면에 명확히 표시되고 압력값, 발 개수, 거리, 요금, 통계 숫자를 만들지 않습니다.

## 문서

- `docs/IMPLEMENTATION-SPEC.md`: 요구사항, 흐름, 화면·디자인·기술 설계
- `docs/HARDWARE-DATA-CONTRACT.md`: 하드웨어 팀 공유 데이터 명세
- `docs/TESTING.md`: 연동 전 상태별 테스트와 최종 체크리스트
