"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Bluetooth, Check, Footprints, HardHat, LoaderCircle, RadioTower } from "lucide-react";
import { AppShell, SurfaceCard, TopBar } from "../components/AppShell";
import { DeckVisualization } from "../components/DeckVisualization";
import type { KeyboardSensorService } from "../services/sensor";
import type { ConnectionStatus, FootDetectionStatus, HelmetStatus, SensorSnapshot } from "../types/sensor";

interface SafetyCheckPageProps {
  service: KeyboardSensorService;
  snapshot: SensorSnapshot;
  connect(): Promise<void>;
  onSuccess(): void;
}

type Step = "foot" | "helmet";
type Tone = "neutral" | "checking" | "normal" | "attention" | "error";

const ADVANCE_DELAY_MS = 800;

const connectionLabels: Record<ConnectionStatus, string> = {
  unknown: "확인 전",
  disconnected: "연결 끊김",
  connecting: "연결 중",
  connected: "연결됨",
  error: "연결 오류",
};

const helmetCopy: Record<HelmetStatus, { title: string; description: string }> = {
  unknown: { title: "헬멧 정보를 기다리고 있어요", description: "4번 키를 누르면 헬멧 착용으로 인식해요" },
  checking: { title: "헬멧 착용 상태를 확인하고 있어요", description: "잠시만 기다려 주세요" },
  worn: { title: "헬멧 착용이 확인됐어요", description: "이용 중 화면으로 이동해요" },
  notWorn: { title: "헬멧을 착용해 주세요", description: "4번 키를 누르면 착용으로 인식해요" },
  sensorUnavailable: { title: "헬멧 센서와 연결할 수 없어요", description: "헬멧 센서 연결 상태를 확인해 주세요" },
  stale: { title: "헬멧 정보가 지연되고 있어요", description: "새로운 센서 정보를 기다리고 있어요" },
  error: { title: "헬멧 센서 정보를 확인할 수 없어요", description: "연결 상태를 확인해 주세요" },
};

const footCopy: Record<FootDetectionStatus, { title: string; description: string }> = {
  unknown: { title: "발판 정보를 기다리고 있어요", description: "1 · 2 · 3번 키로 발판 상태를 확인해요" },
  checking: { title: "발 위치를 확인하고 있어요", description: "아직 두 발이 모두 오르지 않았어요" },
  normal: { title: "정상적인 탑승 위치예요", description: "헬멧 확인 단계로 이동해요" },
  multiplePressureRegions: { title: "여러 지점에서 압력이 감지됐어요", description: "한 명만 탑승한 뒤 다시 확인해 주세요" },
  multipleRiderSuspected: { title: "복수 탑승 가능성이 감지됐어요", description: "한 명만 탑승한 뒤 2번 키로 다시 확인해 주세요" },
  positionInvalid: { title: "발 위치를 다시 조정해 주세요", description: "두 발이 데크 안에 안정적으로 놓이도록 해 주세요" },
  sensorUnavailable: { title: "데크 센서와 연결할 수 없어요", description: "Wi‑Fi 연결 상태를 확인해 주세요" },
  stale: { title: "발 위치 정보가 오래됐어요", description: "새로운 센서 정보를 기다리고 있어요" },
  error: { title: "발 위치를 확인할 수 없어요", description: "데크 센서 상태를 확인해 주세요" },
};

function footTone(status: FootDetectionStatus): Tone {
  if (status === "normal") return "normal";
  if (status === "checking") return "checking";
  if (["multiplePressureRegions", "multipleRiderSuspected", "positionInvalid"].includes(status)) return "attention";
  if (["sensorUnavailable", "stale", "error"].includes(status)) return "error";
  return "neutral";
}

export function SafetyCheckPage({ service, snapshot, connect, onSuccess }: SafetyCheckPageProps) {
  const [step, setStep] = useState<Step>("foot");

  useEffect(() => {
    void connect();
    // Only ever connect once when this screen first mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "foot" || snapshot.footDetectionStatus !== "normal") return;
    const timer = setTimeout(() => setStep("helmet"), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step, snapshot.footDetectionStatus]);

  useEffect(() => {
    if (step !== "helmet" || snapshot.helmetStatus !== "worn") return;
    const timer = setTimeout(() => onSuccess(), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step, snapshot.helmetStatus, onSuccess]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (step === "foot" && (event.key === "1" || event.key === "2" || event.key === "3")) {
        service.pressFootKey(event.key);
      } else if (step === "helmet" && event.key === "4") {
        service.pressHelmetKey();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [service, step]);

  const foot = footCopy[snapshot.footDetectionStatus];
  const helmet = helmetCopy[snapshot.helmetStatus];
  const footDone = snapshot.footDetectionStatus === "normal";
  const helmetDone = snapshot.helmetStatus === "worn";

  return (
    <AppShell>
      <TopBar title="안전 확인" back />
      <div className="page-content safety-content">
        <div className="prototype-badge" role="status">
          프로토타입 조작 · 키보드로 센서 신호를 흉내내요
        </div>

        <StepTrack step={step} />

        <div className="connection-strip" aria-label="센서 연결 상태">
          <ConnectionBadge icon={<Bluetooth aria-hidden="true" />} label="헬멧" status={snapshot.helmetConnectionStatus} />
          <ConnectionBadge icon={<RadioTower aria-hidden="true" />} label="데크" status={snapshot.deckConnectionStatus} />
        </div>

        {step === "foot" ? (
          <SensorCard
            className="foot-card"
            icon={<Footprints aria-hidden="true" />}
            label="발 위치"
            title={foot.title}
            description={foot.description}
            tone={footTone(snapshot.footDetectionStatus)}
            complete={footDone}
          >
            <DeckVisualization
              regions={snapshot.detectedPressureRegions}
              feet={snapshot.estimatedFootPositions}
              status={footTone(snapshot.footDetectionStatus)}
            />
          </SensorCard>
        ) : (
          <SensorCard
            className="helmet-card"
            icon={<HardHat aria-hidden="true" />}
            label="헬멧 착용"
            title={helmet.title}
            description={helmet.description}
            tone={helmetDone ? "normal" : "checking"}
            complete={helmetDone}
          >
            <HelmetVisualizer status={snapshot.helmetStatus} />
          </SensorCard>
        )}

        {step === "foot" ? (
          <div className="key-hint-row" role="group" aria-label="발판 키 입력">
            <KeyHint keyLabel="1" text="발 하나" onPress={() => service.pressFootKey("1")} />
            <KeyHint keyLabel="2" text="발 둘 · 정상" tone="target" onPress={() => service.pressFootKey("2")} />
            <KeyHint keyLabel="3" text="발 셋 이상" tone="warning" onPress={() => service.pressFootKey("3")} />
          </div>
        ) : (
          <div className="key-hint-row" role="group" aria-label="헬멧 키 입력">
            <KeyHint keyLabel="4" text="헬멧 착용" tone="target" onPress={() => service.pressHelmetKey()} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StepTrack({ step }: { step: Step }) {
  return (
    <ol className="step-track" aria-label="안전 확인 단계">
      <li className={`step-node ${step === "foot" ? "is-active" : "is-done"}`}>
        <span className="step-number">{step === "foot" ? "1" : <BadgeCheck aria-hidden="true" />}</span>
        <span className="step-label">발판 확인</span>
      </li>
      <span className="step-line" aria-hidden="true" />
      <li className={`step-node ${step === "helmet" ? "is-active" : ""}`}>
        <span className="step-number">2</span>
        <span className="step-label">헬멧 확인</span>
      </li>
    </ol>
  );
}

function ConnectionBadge({ icon, label, status }: { icon: ReactNode; label: string; status: ConnectionStatus }) {
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
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  tone: Tone;
  complete: boolean;
  children: ReactNode;
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

function KeyHint({ keyLabel, text, tone = "neutral", onPress }: { keyLabel: string; text: string; tone?: "neutral" | "target" | "warning"; onPress(): void }) {
  return (
    <button type="button" className={`key-hint is-${tone}`} onClick={onPress}>
      <kbd>{keyLabel}</kbd>
      <span>{text}</span>
    </button>
  );
}
