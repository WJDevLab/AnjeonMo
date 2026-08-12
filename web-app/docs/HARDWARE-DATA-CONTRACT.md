# 하드웨어 연동 데이터 계약

> 대상: 헬멧 Bluetooth 담당, 데크 Wi-Fi/압력센서 담당, 중간 서버 담당, 웹 앱 담당. 이 문서는 펌웨어나 하드웨어 제어 코드를 포함하지 않고 데이터 경계만 정의한다.

## 1. 계약 원칙

- 헬멧은 Bluetooth, 데크는 Wi-Fi 채널로 분리해 연결한다.
- 웹 UI는 원본 패킷을 직접 읽지 않는다. 각 transport와 `SensorDataAdapter`가 원본을 공통 `SensorSnapshot`으로 변환한다.
- 전체 연결 상태, 오래된 데이터 여부, 전체 안전 상태는 앱 coordinator가 개별 채널 상태와 앱 수신 시각으로 파생한다. 하드웨어가 보낸 overall 성공값을 그대로 신뢰하지 않는다.
- `null`은 값이 제공되지 않았거나 판단할 수 없음을 뜻한다. 빈 배열 `[]`은 유효한 메시지에서 해당 항목이 없음을 뜻한다.
- 데이터가 없거나 잘못됐을 때 정상으로 추정하지 않는다.
- 원시 압력값은 진단·어댑터 입력이며 사용자 화면에 숫자로 직접 노출하지 않는다.
- 실제 발 개수는 upstream 처리 결과가 명시적으로 보장할 때만 `confirmedFootCount`로 전달한다. 그렇지 않으면 `null`이며 UI는 “여러 압력 지점” 또는 “복수 탑승 가능성”이라고 표현한다.
- 장치 시계 대신 앱이 실제로 메시지를 받은 시각을 최신성 판단의 기준으로 사용한다.

## 2. 전체 데이터 흐름

```text
헬멧 BLE GATT 알림/읽기
        ↓
HelmetBluetoothTransport
        ↓
HelmetDataAdapter ─────────┐
                           ├─ SensorCoordinator
DeckDataAdapter ───────────┘        ↓
        ↑                     SensorSnapshot
DeckWifiTransport                   ↓
        ↑                    상태 관리 / 안전 게이트
데크 HTTPS 또는 WebSocket           ↓
                                  UI
```

직접 연결이 불가능한 환경에서는 transport 내부를 중간 서버 client로 교체한다. UI와 공통 스냅샷 계약은 바꾸지 않는다.

## 3. 상태 enum

### 3.1 `ConnectionStatus`

```ts
type ConnectionStatus =
  | "unknown"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
```

| 값 | 의미 |
|---|---|
| `unknown` | 아직 연결 시도를 시작하지 않았거나 상태를 판단할 정보가 없음 |
| `disconnected` | 연결이 끊겼거나 사용자가 연결을 종료함 |
| `connecting` | 권한 요청, 탐색, handshake 또는 재연결 중 |
| `connected` | transport 연결이 열려 있고 유효한 메시지를 받을 수 있음 |
| `error` | 권한, 설정, 프로토콜 또는 transport 오류로 연결할 수 없음 |

### 3.2 `HelmetStatus`

```ts
type HelmetStatus =
  | "unknown"
  | "checking"
  | "worn"
  | "notWorn"
  | "sensorUnavailable"
  | "stale"
  | "error";
```

`stale`은 앱이 수신 지연을 판단해 파생한다. 하드웨어의 미착용과 연결 실패를 같은 값으로 보내지 않는다.

### 3.3 `FootDetectionStatus`

```ts
type FootDetectionStatus =
  | "unknown"
  | "checking"
  | "normal"
  | "multiplePressureRegions"
  | "multipleRiderSuspected"
  | "positionInvalid"
  | "sensorUnavailable"
  | "stale"
  | "error";
```

- `multiplePressureRegions`: 여러 압력 구간이 있으나 사람 수를 확정할 수 없음
- `multipleRiderSuspected`: upstream 판정기가 복수 탑승 가능성을 전달했으나 확정 표현은 피해야 함
- `stale`: 앱이 데크 메시지 수신 지연을 판단해 파생

### 3.4 `RiderStatus`

```ts
type RiderStatus =
  | "unknown"
  | "singleRider"
  | "multipleRiderSuspected";
```

`singleRider`는 합의된 판정 로직이 근거를 제공할 때만 사용한다. 압력 영역 수만으로 앱이 임의 판정하지 않는다.

### 3.5 `OverallSafetyStatus`

```ts
type OverallSafetyStatus =
  | "idle"
  | "connecting"
  | "checking"
  | "attentionRequired"
  | "success"
  | "riding"
  | "error";
```

이 상태는 앱 coordinator가 파생한다. 하드웨어가 동일 이름의 값을 보내더라도 안전 게이트의 최종 근거로 사용하지 않는다.

## 4. 공통 `SensorSnapshot` 계약

### 4.1 최상위 필드

| 필드 이름 | 자료형 | 가능한 값 | 설명 | 전송·갱신 주기 | 필수 여부 | 오류 시 처리 | 사용 화면 |
|---|---|---|---|---|---|---|---|
| `connectionStatus` | `ConnectionStatus` | 연결 상태 enum | 두 필수 채널을 종합한 연결 상태. 앱 파생 | 어느 채널이든 상태가 바뀔 때 | 공통 스냅샷 필수 | 어느 채널이 문제인지 개별 상태와 `issues`로 확인; 성공 판정 금지 | 홈, 안전 확인, 이용 중 |
| `helmetConnectionStatus` | `ConnectionStatus` | 연결 상태 enum | 헬멧 Bluetooth 연결 상태 | BLE 연결 이벤트마다 | 필수 | `error`/`disconnected`로 유지하고 헬멧 정상 판정 금지 | 홈, 안전 확인, 이용 중 |
| `deckConnectionStatus` | `ConnectionStatus` | 연결 상태 enum | 데크 Wi-Fi transport 연결 상태 | WebSocket/HTTP 연결 이벤트마다 | 필수 | `error`/`disconnected`로 유지하고 발 정상 판정 금지 | 홈, 안전 확인, 이용 중 |
| `helmetStatus` | `HelmetStatus` | 헬멧 상태 enum | 착용 판정과 데이터 품질 상태 | 헬멧 메시지를 받을 때마다 또는 최신성 상태가 바뀔 때 | 필수 | 알 수 없는 값은 `error`; 누락은 `unknown`; 지연은 `stale` | 홈, 안전 확인, 이용 중, 안전 통계 원천 |
| `footDetectionStatus` | `FootDetectionStatus` | 발 감지 상태 enum | 압력·위치·탑승 판정 결과 | 데크 메시지를 받을 때마다 또는 최신성 상태가 바뀔 때 | 필수 | 알 수 없는 값은 `error`; 누락은 `unknown`; 지연은 `stale` | 홈, 상세, 안전 확인, 이용 중, 안전 통계 원천 |
| `riderStatus` | `RiderStatus` | 탑승자 상태 enum | 한 명 탑승 또는 복수 탑승 가능성 판정 | 판정 결과가 바뀔 때 | 필수, 값 미정이면 `unknown` | 판단 근거가 없으면 `unknown`; 앱이 사람 수를 추정하지 않음 | 홈, 안전 확인, 이용 중 |
| `pressureValues` | `readonly number[] \| null` | 보정 전/후 값 배열 또는 `null` | 어댑터·진단용 일자형 센서 값. UI에 직접 노출 금지 | 데크 센서 프레임마다 | 선택 | 형식·길이가 계약과 다르면 payload 오류; 이전 값으로 성공 판정 금지 | 안전 확인의 내부 처리만 |
| `detectedPressureRegions` | `readonly PressureRegion[] \| null` | 구간 배열, `[]`, `null` | 데크 축 위에서 감지된 압력 구간 | 데크 센서 프레임마다 | 발 시각화에 조건부 필수 | 형식 오류 시 구간을 그리지 않고 `footDetectionStatus: error` | 안전 확인 |
| `estimatedFootPositions` | `readonly FootPosition[] \| null` | 위치 배열, `[]`, `null` | upstream에서 추정한 발 위치 | 안정화된 위치 결과가 바뀔 때 | 발 시각화에 조건부 필수 | 값이 없으면 발자국을 그리지 않음; 임의 위치 생성 금지 | 안전 확인 |
| `confirmedFootCount` | `number \| null` | 검증된 개수 또는 `null` | upstream이 실제 발 개수를 명시적으로 보장할 때만 제공 | 판정 결과가 바뀔 때 | 선택 | 보장되지 않으면 반드시 `null`; UI에서 개수를 단정하지 않음 | 안전 확인의 조건부 문구 |
| `safetyStatus` | `OverallSafetyStatus` | 전체 안전 상태 enum | 연결·헬멧·발·최신성·오류·안정 유지로 앱이 계산 | 어느 조건이든 바뀔 때 | 필수 | 계산 불가 시 `error` 또는 `checking`; 하드웨어 overall 값으로 대체 금지 | 안전 확인, 이용 중 |
| `issues` | `readonly SensorIssue[]` | 이슈 배열 또는 `[]` | transport, stale, malformed, sensor, configuration 이슈 | 이슈가 생기거나 해제될 때 | 필수 | 알 수 없는 오류도 보존하고 일반 오류 문구로 표시 | 안전 확인, 이용 중, 진단 로그 |
| `helmetReceivedAt` | `string \| null` | 앱이 기록한 ISO 8601 시각 또는 `null` | 마지막 유효 헬멧 메시지 앱 수신 시각 | 유효 메시지마다 | 연결 후 조건부 필수 | 없으면 최신으로 간주하지 않음 | 안전 확인 내부 최신성 검사 |
| `deckReceivedAt` | `string \| null` | 앱이 기록한 ISO 8601 시각 또는 `null` | 마지막 유효 데크 메시지 앱 수신 시각 | 유효 메시지마다 | 연결 후 조건부 필수 | 없으면 최신으로 간주하지 않음 | 안전 확인 내부 최신성 검사 |
| `receivedAt` | `string \| null` | 앱이 기록한 ISO 8601 시각 또는 `null` | 공통 스냅샷이 갱신된 시각 | 스냅샷 갱신마다 | 조건부 필수 | 없으면 상태 표시 가능하지만 안전 성공에는 사용하지 않음 | 상태 관리·진단 |

### 4.2 `PressureRegion`

```ts
interface PressureRegion {
  id: string;
  startRatio: number;
  endRatio: number;
  intensityRatio: number | null;
}
```

| 필드 | 자료형 | 설명 | 필수 여부 | 검증·오류 처리 |
|---|---|---|---|---|
| `id` | `string` | 한 프레임 안에서 구간을 구분하고 연속 프레임 보간에 사용하는 식별자 | 필수 | 비어 있거나 중복이면 해당 구간 폐기 또는 malformed 이슈 |
| `startRatio` | `number` | 데크 길이 시작점을 기준으로 0~1 정규화한 구간 시작 위치 | 필수 | 0~1을 벗어나면 해당 payload를 정상 판정에 사용하지 않음 |
| `endRatio` | `number` | 데크 길이 시작점을 기준으로 0~1 정규화한 구간 끝 위치 | 필수 | 시작보다 앞서거나 0~1을 벗어나면 malformed 이슈 |
| `intensityRatio` | `number \| null` | 시각적 압력 강조에 사용하는 0~1 정규화 강도 | 선택 | 보정 기준이 없으면 `null`; UI가 임의 강도를 만들지 않음 |

정규화 축의 물리적 시작 방향과 허용 범위는 하드웨어 팀과 반드시 합의한다. 앱과 하드웨어가 앞/뒤 방향을 다르게 해석하면 발자국이 반대로 표시된다.

### 4.3 `FootPosition`

```ts
type FootRole = "left" | "right" | "unknown";

interface FootPosition {
  id: string;
  longitudinalRatio: number;
  role: FootRole;
  intensityRatio: number | null;
}
```

| 필드 | 자료형 | 설명 | 필수 여부 | 검증·오류 처리 |
|---|---|---|---|---|
| `id` | `string` | 프레임 간 위치 보간을 위한 안정적인 식별자 | 필수 | 비어 있거나 중복이면 해당 위치를 렌더링하지 않음 |
| `longitudinalRatio` | `number` | 세로 데크 축 위의 0~1 정규화 위치 | 필수 | 0~1을 벗어나면 렌더링·성공 판정에서 제외 |
| `role` | `FootRole` | 왼발·오른발을 upstream이 판별한 경우의 역할 | 필수, 판단 불가면 `unknown` | 앱이 좌우를 임의 추정하지 않음 |
| `intensityRatio` | `number \| null` | 발자국 주변의 압력 강조 강도 | 선택 | 보정되지 않았으면 `null` |

### 4.4 `SensorIssue`

```ts
type SensorIssueSource =
  | "helmetBluetooth"
  | "deckWifi"
  | "coordinator";

type SensorIssueCategory =
  | "connection"
  | "stale"
  | "malformed"
  | "sensor"
  | "configuration";

interface SensorIssue {
  source: SensorIssueSource;
  category: SensorIssueCategory;
  code: string;
}
```

오류 코드는 하드웨어·중간 서버·앱 팀이 별도 레지스트리로 합의한다. 원본 오류 문장을 사용자 UI에 그대로 출력하지 않고, 앱이 등록된 한국어 문구로 매핑한다. 알 수 없는 코드는 일반 오류 문구를 사용하되 로그에서는 원본 코드를 보존한다.

## 5. 원본 메시지 최소 계약

공통 스냅샷은 앱 내부 계약이다. 현재 adapter가 받는 원본 메시지는 아래와 같다. JSON 객체, JSON 문자열, BLE에서 읽은 UTF-8 JSON을 보수적으로 해석하며, 알 수 없는 상태나 잘못된 타입은 오류로 처리한다. 스키마 버전 필드는 향후 합의가 필요하지만 현재 adapter의 필수 필드는 아니다.

### 5.1 헬멧 Bluetooth 메시지

| 의미 필드 | 자료형 | 가능한 값 | 전송 주기 | 필수 여부 | 오류 시 앱 처리 |
|---|---|---|---|---|---|
| `helmetStatus` | `string` | `unknown`, `checking`, `worn`, `notWorn`, `sensorUnavailable`, `error` 중 지원 값 | 상태 변경 시와 연결 유지 메시지. 정확한 주기는 합의 필요 | 필수 | 누락·알 수 없는 값은 `error`; `stale`은 앱이 파생 |
| `errorCode` | `string \| null` | 합의된 코드 또는 `null` | 오류 발생·해제 시 | 선택 | 미등록 코드도 이슈에 보존하고 일반 오류 문구 사용 |
| `messageId` | `string \| null` | 향후 추적용 메시지 식별자 또는 `null`. 현재 안전 판정에는 사용하지 않음 | 제공 가능한 경우 메시지마다 | 선택 | 타입이 잘못되면 malformed; 없으면 `null`로 정규화 |

BLE 연결·해제·권한 오류는 메시지 필드가 아니라 transport 이벤트로 `helmetConnectionStatus`에 반영한다. BLE를 직접 사용할 경우 GATT Service UUID, Characteristic UUID, notify/read 방식, UTF-8 JSON 또는 바이너리 프레임 규격을 추가 합의해야 한다. 헬멧 모듈이 Bluetooth Classic만 지원하면 Web Bluetooth 직접 연결 대상으로 가정하지 않고 중간 게이트웨이 방식을 선택한다.

### 5.2 데크 Wi-Fi 메시지

| 의미 필드 | 자료형 | 가능한 값 | 전송 주기 | 필수 여부 | 오류 시 앱 처리 |
|---|---|---|---|---|---|
| `footDetectionStatus` | `string` | `unknown`, `checking`, `normal`, `multiplePressureRegions`, `multipleRiderSuspected`, `positionInvalid`, `sensorUnavailable`, `error` 중 지원 값 | 센서 프레임 또는 상태 변경 시 | 필수 | 누락·알 수 없는 값은 `error`; `stale`은 앱이 파생 |
| `riderStatus` | `string` | `unknown`, `singleRider`, `multipleRiderSuspected` | 판정 변경 시 또는 각 상태 프레임 | 선택, 누락 시 `unknown` | 근거가 없으면 `unknown`; 앱이 사람 수를 확정하지 않음 |
| `pressureValues` | `number[] \| null` | 합의된 배열 또는 `null` | 센서 프레임마다 | 선택 | 배열 길이·보정 규격 불일치 시 malformed 이슈 |
| `detectedPressureRegions` | `PressureRegion[] \| null` | 구간 배열, `[]`, `null` | 센서 프레임마다 | 시각화에 조건부 필수 | 잘못된 구간은 렌더링·성공 판정에서 제외 |
| `estimatedFootPositions` | `FootPosition[] \| null` | 위치 배열, `[]`, `null` | 안정화 위치 결과가 바뀔 때 | 시각화에 조건부 필수 | 잘못된 위치는 렌더링하지 않음 |
| `confirmedFootCount` | `number \| null` | upstream 보장 값 또는 `null` | 판정 변경 시 | 선택 | 보장되지 않으면 `null` |
| `errorCode` | `string \| null` | 합의된 코드 또는 `null` | 오류 발생·해제 시 | 선택 | 미등록 코드도 이슈에 보존 |
| `messageId` | `string \| null` | 향후 추적용 메시지 식별자 또는 `null`. 현재 안전 판정에는 사용하지 않음 | 제공 가능한 경우 메시지마다 | 선택 | 타입이 잘못되면 malformed; 없으면 `null`로 정규화 |

현재 구현된 데크 Wi-Fi transport는 `wss://` WebSocket endpoint를 사용한다. 하드웨어 팀이 `https://` polling 방식을 선택하면 `SensorSourceService`를 구현하는 별도 transport로 교체해야 하며 UI와 adapter 계약은 유지한다. 브라우저가 임의의 로컬 Wi-Fi 센서를 자동 발견할 수 있다고 가정하지 않는다. endpoint URL, 인증, TLS, CORS, 재연결 규칙, heartbeat 규격이 필요하다.

## 6. 전송 주기와 최신성 합의

현재 확정된 수치형 전송 주기는 없다. 하드웨어 팀은 다음을 제공해야 한다.

- 헬멧 상태가 변하지 않아도 연결과 최신성을 증명할 heartbeat 주기
- 데크 압력 프레임 전송 주기와 위치 판정 결과 갱신 주기
- Bluetooth와 Wi-Fi 각각의 정상 지연·최대 허용 지연
- 연결 복구 시 첫 유효 스냅샷이 도착하는 예상 시간

앱은 합의된 주기에서 도출한 설정값으로 stale을 판단한다.

```text
마지막 앱 수신 시각 + 합의된 허용 지연 < 현재 시각
  → 해당 채널 상태를 stale로 파생
  → 전체 안전 성공 조건에서 제외
  → 최신 메시지를 받으면 자동 재확인
```

오래된 마지막 정상 값을 화면 참고용으로 유지하더라도 완료 판정에는 사용하지 않는다. stale 기준을 하드코딩하기 전 하드웨어 측 실제 측정값과 테스트해야 한다.

### 6.1 현재 앱 환경 설정 키

| 목적 | 환경 변수 |
|---|---|
| 헬멧 BLE Service UUID | `NEXT_PUBLIC_HELMET_BLE_SERVICE_UUID` 또는 `VITE_HELMET_BLE_SERVICE_UUID` |
| 헬멧 BLE Characteristic UUID | `NEXT_PUBLIC_HELMET_BLE_CHARACTERISTIC_UUID` 또는 `VITE_HELMET_BLE_CHARACTERISTIC_UUID` |
| 데크 WebSocket URL | `NEXT_PUBLIC_DECK_WS_URL` 또는 `VITE_DECK_WS_URL` |
| 헬멧 stale 임계값 | `NEXT_PUBLIC_HELMET_STALE_AFTER_MS` 또는 `VITE_HELMET_STALE_AFTER_MS` |
| 데크 stale 임계값 | `NEXT_PUBLIC_DECK_STALE_AFTER_MS` 또는 `VITE_DECK_STALE_AFTER_MS` |
| 선택적 주행 telemetry WebSocket | `NEXT_PUBLIC_RIDE_WS_URL` 또는 `VITE_RIDE_WS_URL` |

값이 누락되거나 stale 임계값이 유효한 양수가 아니면 앱은 configuration 이슈를 만들고 안전 성공을 차단한다. 실제 값은 배포 환경에서만 설정하고 저장소에 비밀정보를 하드코딩하지 않는다.

## 7. 주행 텔레메트리 계약

안전 센서 스냅샷과 주행 시간·거리·요금은 별도 계약이다. 시간은 실제 주행 시작 확인 뒤부터 계산할 수 있고, 거리와 요금은 실제 source가 제공하기 전까지 `null`을 유지한다.

| 필드 이름 | 자료형 | 가능한 값 | 설명 | 전송·갱신 주기 | 필수 여부 | 오류 시 처리 | 사용 화면 |
|---|---|---|---|---|---|---|---|
| `status` | `string` | `idle`, `starting`, `riding`, `ended`, `error` | 주행 세션 상태 | 상태가 바뀔 때와 telemetry 메시지마다 | 필수 | 알 수 없는 값은 `RIDE_STATUS_INVALID`, 기존 값을 정상으로 가장하지 않음 | 이용 중, 이용내역 원천 |
| `rideId` | `string \| null` | 실제 식별자 또는 `null` | 백엔드가 확정한 주행 식별자 | 세션 생성·변경 시 | 선택 | 없으면 `null`; 임의 ID 생성 금지 | 이용 중, 기록 연동 |
| `startedAt` | `string \| null` | ISO 8601 시각 또는 `null` | 실제 주행 시작 확인 시각 | 세션 시작·복구 시 | 선택 | 없으면 시간 값을 `—`로 표시 | 이용 중 |
| `distanceKm` | `number \| null` | 음수가 아닌 실제 거리 또는 `null` | 합의된 GPS·기기·서버가 산정한 누적 거리 | 실제 source가 갱신할 때 | 선택 | 없거나 잘못되면 `— km`; 프론트가 임의 보정하지 않음 | 이용 중, 통계 원천 |
| `elapsedSeconds` | `number \| null` | 음수가 아닌 실제 경과 시간 또는 `null` | 확인된 시작 시각 또는 서버 telemetry 기반 경과 시간 | 이용 중 실제 clock/telemetry 갱신 | 선택 | 시작 미확정이면 `null`; 임의 시작 금지 | 이용 중, 통계 원천 |
| `fareAmount` | `number \| null` | 음수가 아닌 실제 요금 또는 `null` | 백엔드 요금 정책이 계산한 금액 | 요금 결과가 바뀔 때 | 선택 | 정책·결과가 없으면 `null`; 프론트 요율 생성 금지 | 이용 중, 결제·기록 원천 |
| `currencyCode` | `string \| null` | 실제 통화 코드 또는 `null` | `fareAmount`의 통화 | 금액과 함께 | 요금이 있을 때 조건부 필수 | 없으면 금액 포맷을 확정하지 않고 “요금 정보 없음” | 이용 중, 결제·기록 원천 |
| `errorCode` | `string \| null` | 합의된 코드 또는 `null` | 주행 stream·세션 오류 | 오류 발생·해제 시 | 선택 | 오류 상태와 안내 표시 | 이용 중 |
| `receivedAt` | `string \| null` | 앱이 기록한 ISO 8601 시각 또는 `null` | 주행 메시지 앱 수신 시각 | 유효 메시지마다 | 앱 내부 조건부 필수 | 없으면 telemetry 최신으로 단정하지 않음 | 이용 중 내부 처리 |

주행 원본 메시지 예시:

```json
{
  "status": "starting",
  "rideId": null,
  "startedAt": null,
  "distanceKm": null,
  "elapsedSeconds": null,
  "fareAmount": null,
  "currencyCode": null,
  "errorCode": null
}
```

`receivedAt`은 원본 메시지를 받은 앱이 추가한다. 실제 요금은 하드웨어 센서가 아니라 요금 정책을 소유한 백엔드가 권위 source가 되는 것이 적절하다.

## 8. 안전 상태 파생 규칙

| 조건 | 파생 상태 | 처리 |
|---|---|---|
| 아직 시작 전 | `idle` | 센서 정상으로 추정하지 않음 |
| 한 채널이라도 연결 중 | `connecting` | 연결 안내 표시 |
| 권한·구성·형식·센서 치명 오류 | `error` | 출발 차단, 원인별 안내 |
| 연결됨, 데이터 대기 또는 `checking` | `checking` | 최신 데이터를 기다림 |
| 헬멧 `notWorn` 또는 발 위치/탑승 주의 | `attentionRequired` | 정상 항목 유지, 문제 항목만 안내 |
| 헬멧 `worn`, 발 `normal`, 두 채널 최신, 오류 없음 | 안정 유지 측정 | 화면 진입 이후 양쪽 새 메시지를 확인하며 진행 표시 |
| 위 조건이 약 2~3초 연속 유지 | `success` | 짧은 완료 표시 뒤 자동 이동 |
| 실제 이용 화면 진입 | `riding` | 이용 중 센서 상태 계속 표시 가능 |

안정 유지 측정 중 하나라도 조건이 깨지면 측정을 취소하고 새 정상 구간에서 다시 시작한다.

## 9. 예시 JSON

아래 예시는 값의 모양만 보여준다. 실제 센서 수치, 위치, 시간, ID는 포함하지 않는다.

### 9.1 헬멧 원본 메시지

```json
{
  "helmetStatus": "checking",
  "errorCode": null,
  "messageId": null
}
```

### 9.2 데크 원본 메시지

```json
{
  "footDetectionStatus": "checking",
  "riderStatus": "unknown",
  "pressureValues": null,
  "detectedPressureRegions": [],
  "estimatedFootPositions": [],
  "confirmedFootCount": null,
  "errorCode": null,
  "messageId": null
}
```

### 9.3 앱 공통 스냅샷

```json
{
  "connectionStatus": "connecting",
  "helmetConnectionStatus": "connected",
  "deckConnectionStatus": "connecting",
  "helmetStatus": "checking",
  "footDetectionStatus": "unknown",
  "riderStatus": "unknown",
  "pressureValues": null,
  "detectedPressureRegions": [],
  "estimatedFootPositions": [],
  "confirmedFootCount": null,
  "safetyStatus": "checking",
  "issues": [],
  "helmetReceivedAt": null,
  "deckReceivedAt": null,
  "receivedAt": null
}
```

## 10. 직접 연결과 중간 서버 비교

| 항목 | 웹 앱 직접 연결 | 중간 서버·게이트웨이 경유 |
|---|---|---|
| 헬멧 Bluetooth | Web Bluetooth로 BLE GATT에 연결. HTTPS와 사용자 동작 기반 권한이 필요하며 브라우저 지원 범위를 확인해야 함 | 게이트웨이가 BLE를 수신하고 웹에는 HTTPS/WebSocket으로 전달 |
| 데크 Wi-Fi | 데크가 브라우저에서 접근 가능한 HTTPS/WebSocket endpoint를 제공해야 함 | 서버가 데크 연결·인증·재연결을 담당하고 웹은 통합 endpoint 사용 |
| 브라우저 호환성 | Web Bluetooth와 로컬 네트워크 접근 제약의 영향을 직접 받음 | 웹은 일반적인 HTTPS/WebSocket만 사용해 호환성이 상대적으로 단순함 |
| 연결 안정화 | 앱이 두 채널의 재연결·heartbeat·병합을 모두 담당 | 서버가 버퍼링·재연결·두 스트림 병합 가능 |
| 최신성 기준 | 앱 수신 시각으로 직접 판단 | 서버 수신 시각과 앱 수신 시각을 구분해 전달해야 함 |
| 보안 | 기기 권한, endpoint 인증, TLS, CORS를 클라이언트에서 각각 처리 | 서버에서 기기 인증·비밀정보 보호·접근 제어 가능 |
| 기록·통계 | 별도 백엔드 호출 필요 | 센서 이벤트와 주행 기록을 같은 서버에서 저장 가능 |
| 장애 지점 | 브라우저·헬멧·데크 각 연결 | 서버가 추가되지만 관측·복구를 중앙화할 수 있음 |
| 적합한 상황 | 제한된 지원 기기에서 현장 프로토타입을 빠르게 검증 | 실제 서비스, 여러 브라우저, 기록 저장, 원격 관측이 필요한 경우 |

하이브리드 방식도 가능하다. 예를 들어 헬멧은 브라우저 Bluetooth로 직접 받고, 데크는 WebSocket 중간 서버를 거칠 수 있다. 어느 방식을 택해도 transport 아래의 `SensorDataAdapter`와 공통 스냅샷 계약은 유지한다.

## 11. 연동 전 합의 체크리스트

- [ ] 헬멧이 BLE GATT를 사용하는지 확인
- [ ] Bluetooth Service UUID, Characteristic UUID, notify/read 방식 확정
- [ ] BLE payload 인코딩과 최대 메시지 크기 확정
- [ ] 데크 Wi-Fi endpoint와 HTTP/WebSocket 방식 확정
- [ ] endpoint 인증, TLS, CORS, heartbeat, 재연결 규칙 확정
- [ ] 일자형 센서 채널 순서와 데크 앞/뒤 축 방향 확정
- [ ] pressure array 길이·보정 범위·결측 표현 확정
- [ ] pressure region과 foot position 정규화 범위 확정
- [ ] `normal`, `multiplePressureRegions`, `multipleRiderSuspected`, `positionInvalid` 판정 주체와 기준 확정
- [ ] 실제 발 개수 보장 여부와 `confirmedFootCount` 사용 가능 여부 확정
- [ ] 헬멧·데크 전송 주기와 stale 임계값 확정
- [ ] 오류 코드 레지스트리와 복구 가능 여부 확정
- [ ] 스키마 버전 변경·하위 호환 정책 확정
- [ ] 안전 성공 뒤 잠금 해제/출발 승인 요청과 응답 계약 확정
