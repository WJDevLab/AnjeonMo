"use client";

import { useEffect } from "react";
import { AlertCircle, BadgeCheck, Bluetooth, Check, Footprints, HardHat, LoaderCircle, RadioTower, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell, SurfaceCard, TopBar } from "../components/AppShell";
import { DeckVisualization } from "../components/DeckVisualization";
import { useSafetyCheck } from "../hooks/useSafetyCheck";
import type { SensorService } from "../services/sensor";
import { TestScenarioSensorService } from "../services/sensor";
import type { ConnectionStatus, FootDetectionStatus, HelmetStatus, SensorSnapshot } from "../types/sensor";

interface SafetyCheckPageProps {
  service: SensorService;
  snapshot: SensorSnapshot;
  connect(): Promise<void>;
  onSuccess(): void;
}

type Tone = "neutral" | "checking" | "normal" | "attention" | "error";

const connectionLabels: Record<ConnectionStatus, string> = {
  unknown: "확인 전",
  disconnected: "연결 끊김",
  connecting: "연결 중",
  connected: "연결됨",
  error: "연결 오류",
};

const helmetCopy: Record<HelmetStatus, { title: string; description: string; tone: Tone }> = {
  unknown: { title: "헬멧 정보를 기다리고 있어요", description: "헬멧 센서에서 상태를 보내면 자동으로 확인해요", tone: "neutral" },
  checking: { title: "헬멧 착용 상태를 확인하고 있어요", description: "잠시만 기다려 주세요", tone: "checking" },
  worn: { title: "헬멧 착용이 확인됐어요", description: "완료 상태를 유지하고 있어요", tone: "normal" },
  notWorn: { title: "헬멧을 착용해 주세요", description: "착용하면 자동으로 다시 확인해요", tone: "attention" },
  sensorUnavailable: { title: "헬멧 센서와 연결할 수 없어요", description: "헬멧 센서 연결 상태를 확인해 주세요", tone: "error" },
  stale: { title: "헬멧 정보가 오래됐어요", description: "새로운 센서 정보를 기다리고 있어요", tone: "error" },
  error: { title: "헬멧 정보를 확인할 수 없어요", description: "헬멧 센서 상태를 확인해 주세요", tone: "error" },
};

const footCopy: Record<FootDetectionStatus, { title: string; description: string; tone: Tone }> = {
  unknown: { title: "발 위치 정보를 기다리고 있어요", description: "데크 센서에서 상태를 보내면 자동으로 확인해요", tone: "neutral" },
  checking: { title: "발 위치를 확인하고 있어요", description: "데크 위에서 안정적인 자세를 유지해 주세요", tone: "checking" },
  normal: { title: "정상적인 탑승 위치예요", description: "발 위치 확인 완료", tone: "normal" },
  multiplePressureRegions: { title: "여러 지점에서 압력이 감지됐어요", description: "한 명만 탑승한 뒤 발 위치를 다시 확인해 주세요", tone: "attention" },
  multipleRiderSuspected: { title: "복수 탑승 가능성이 감지됐어요", description: "한 명만 탑승한 뒤 탑승 상태를 다시 확인해 주세요", tone: "attention" },
  positionInvalid: { title: "발 위치를 다시 조정해 주세요", description: "두 발이 데크 안에 안정적으로 놓이도록 해 주세요", tone: "attention" },
  sensorUnavailable: { title: "데크 센서와 연결할 수 없어요", description: "Wi‑Fi 연결 상태를 확인해 주세요", tone: "error" },
  stale: { title: "발 위치 정보가 오래됐어요", description: "새로운 센서 정보를 기다리고 있어요", tone: "error" },
  error: { title: "발 위치를 확인할 수 없어요", description: "데크 센서 상태를 확인해 주세요", tone: "error" },
};

export function SafetyCheckPage({ service, snapshot, connect, onSuccess }: SafetyCheckPageProps) {
  const safety = useSafetyCheck(snapshot, { active: true, onSuccess });
  const helmet = helmetCopy[snapshot.helmetStatus];
  const foot = footCopy[snapshot.footDetectionStatus];
  const isTestMode = service instanceof TestScenarioSensorService;

  useEffect(() => {
    if (!isTestMode || snapshot.helmetStatus !== "worn" || snapshot.footDetectionStatus !== "normal") return;
    const timer = window.setInterval(() => {
      service.heartbeat("helmet");
      service.heartbeat("deck");
    }, 350);
    return () => window.clearInterval(timer);
  }, [isTestMode, service, snapshot.footDetectionStatus, snapshot.helmetStatus]);

  const needsConnectionAction = ["unknown", "disconnected", "error"].includes(snapshot.connectionStatus);
  const result = getOverallCopy(safety.status, safety.progress);

  return (
    <AppShell>
      <TopBar title="안전 확인" back />
      <div className="page-content safety-content">
        {isTestMode ? <div className="test-mode-badge" role="status">테스트 모드 · 실제 센서 데이터가 아니에요</div> : null}
        <div className="safety-intro">
          <h2>출발 전 모든 조건을 확인해 주세요</h2>
          <p>헬멧과 발 위치를 동시에 확인하고 있어요</p>
        </div>

        <div className="connection-strip" aria-label="센서 연결 상태">
          <ConnectionBadge icon={<Bluetooth aria-hidden="true" />} label="헬멧" status={snapshot.helmetConnectionStatus} />
          <ConnectionBadge icon={<RadioTower aria-hidden="true" />} label="데크" status={snapshot.deckConnectionStatus} />
        </div>

        <div className="overall-progress" aria-label={`안전 확인 진행률 ${Math.round(safety.progress * 100)}%`}>
          <div className="overall-progress-heading"><span>전체 확인 상태</span><strong>{result.shortLabel}</strong></div>
          <div className="progress-track"><span style={{ width: `${safety.progress * 100}%` }} /></div>
        </div>

        <SensorCard
          className="helmet-card"
          icon={<HardHat aria-hidden="true" />}
          label="헬멧 착용"
          title={helmet.title}
          description={helmet.description}
          tone={helmet.tone}
          complete={safety.helmetComplete}
        >
          <HelmetVisualizer status={snapshot.helmetStatus} />
        </SensorCard>

        <SensorCard
          className="foot-card"
          icon={<Footprints aria-hidden="true" />}
          label="발 위치"
          title={foot.title}
          description={foot.description}
          tone={foot.tone}
          complete={safety.footComplete}
        >
          <DeckVisualization
            regions={snapshot.detectedPressureRegions}
            feet={snapshot.estimatedFootPositions}
            status={deckTone(foot.tone)}
          />
        </SensorCard>

        <div className={`safety-result-panel is-${result.tone}`} role={result.tone === "error" ? "alert" : "status"} aria-live="polite">
          <span className="result-icon">{result.icon}</span>
          <div><strong>{result.title}</strong><p>{result.description}</p></div>
        </div>

        {needsConnectionAction && !isTestMode ? (
          <button className="secondary-button" type="button" onClick={() => void connect()}>
            <RefreshCw aria-hidden="true" /> 센서 연결 시작
          </button>
        ) : null}

        {isTestMode ? <ScenarioControls service={service} /> : null}
      </div>
    </AppShell>
  );
}

function ConnectionBadge({ icon, label, status }: { icon: React.ReactNode; label: string; status: ConnectionStatus }) {
  return (
    <div className={`connection-badge status-${status}`}>
      {icon}
      <span>{label}</span>
      <strong>{connectionLabels[status]}</strong>
    </div>
  );
}

function SensorCard({ className, icon, label, title, description, tone, complete, children }: {
  className: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  tone: Tone;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className={`sensor-card ${className} is-${tone} ${complete ? "is-complete" : ""}`}>
      <div className="sensor-card-header">
        <span className="sensor-card-icon">{icon}</span>
        <div><span className="sensor-card-label">{label}</span><h2>{title}</h2><p>{description}</p></div>
        {complete ? <BadgeCheck className="complete-icon" aria-label="확인 완료" /> : tone === "checking" ? <LoaderCircle className="checking-icon" aria-label="확인 중" /> : null}
      </div>
      <div className="sensor-card-visual">{children}</div>
    </SurfaceCard>
  );
}

function HelmetVisualizer({ status }: { status: HelmetStatus }) {
  const complete = status === "worn";
  const checking = status === "checking" || status === "unknown";
  return (
    <div className={`helmet-visualizer ${complete ? "is-complete" : ""} ${checking ? "is-checking" : ""}`} role="img" aria-label={complete ? "헬멧 착용 확인 완료" : "헬멧 착용 상태 확인"}>
      {checking ? <><span className="scan-ring ring-one" /><span className="scan-ring ring-two" /></> : null}
      <span className="helmet-person"><HardHat aria-hidden="true" /></span>
      {complete ? <span className="helmet-check"><Check aria-hidden="true" /></span> : null}
    </div>
  );
}

function getOverallCopy(status: ReturnType<typeof useSafetyCheck>["status"], progress: number) {
  if (status === "success") return { shortLabel: "완료", title: "모든 안전 확인이 완료됐어요", description: "이용 중 화면으로 자동 이동해요", tone: "normal", icon: <ShieldCheck aria-hidden="true" /> };
  if (status === "attentionRequired") return { shortLabel: "확인 필요", title: "안전 상태를 다시 확인해 주세요", description: "안내된 항목을 수정하면 자동으로 다시 확인해요", tone: "attention", icon: <ShieldAlert aria-hidden="true" /> };
  if (status === "error") return { shortLabel: "연결 확인", title: "센서 상태를 확인해 주세요", description: "데이터가 없거나 오래된 경우에는 출발할 수 없어요", tone: "error", icon: <AlertCircle aria-hidden="true" /> };
  if (status === "riding") return { shortLabel: "이용 중", title: "안전 확인이 완료됐어요", description: "현재 이용 중이에요", tone: "normal", icon: <ShieldCheck aria-hidden="true" /> };
  if (status === "connecting") return { shortLabel: "연결 중", title: "센서를 연결하고 있어요", description: "헬멧 Bluetooth와 데크 Wi‑Fi를 확인해요", tone: "checking", icon: <LoaderCircle aria-hidden="true" /> };
  if (status === "checking" && progress > 0) return { shortLabel: "안정성 확인 중", title: "정상 상태를 유지해 주세요", description: "두 상태가 안정적으로 유지되면 자동으로 완료돼요", tone: "checking", icon: <ShieldCheck aria-hidden="true" /> };
  return { shortLabel: "확인 중", title: "안전 상태를 확인하고 있어요", description: "두 항목의 최신 데이터를 기다리고 있어요", tone: "checking", icon: <LoaderCircle aria-hidden="true" /> };
}

function deckTone(tone: Tone): "neutral" | "checking" | "normal" | "attention" | "error" {
  return tone;
}

function ScenarioControls({ service }: { service: TestScenarioSensorService }) {
  return (
    <details className="scenario-controls">
      <summary>센서 상태 테스트</summary>
      <p>숫자형 데모 데이터 없이 상태 전환만 확인해요.</p>
      <div className="scenario-grid">
        <button type="button" onClick={() => service.setConnections("connecting", "connecting")}>연결 중</button>
        <button type="button" onClick={() => service.setConnections("connected", "connected")}>연결 성공</button>
        <button type="button" onClick={() => service.setConnections("error", "error")}>연결 실패</button>
        <button type="button" onClick={() => service.setHelmetStatus("checking")}>헬멧 확인 중</button>
        <button type="button" onClick={() => service.setHelmetStatus("notWorn")}>헬멧 미착용</button>
        <button type="button" onClick={() => service.setHelmetStatus("worn")}>헬멧 정상</button>
        <button type="button" onClick={() => service.setFootDetectionStatus("checking")}>발 확인 중</button>
        <button type="button" onClick={() => service.setFootDetectionStatus("multiplePressureRegions")}>여러 압력 지점</button>
        <button type="button" onClick={() => service.setFootDetectionStatus("multipleRiderSuspected", "multipleRiderSuspected")}>복수 탑승 의심</button>
        <button type="button" onClick={() => service.setFootDetectionStatus("normal", "singleRider")}>발 위치 정상</button>
        <button type="button" onClick={() => service.setHelmetStatus("stale")}>헬멧 데이터 오래됨</button>
        <button type="button" onClick={() => service.setFootDetectionStatus("stale")}>발 데이터 오래됨</button>
      </div>
    </details>
  );
}
