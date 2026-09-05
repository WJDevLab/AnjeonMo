"use client";

import { BatteryMedium, Bluetooth, Clock3, MapPinned, RadioTower, ShieldCheck, Square, WalletCards } from "lucide-react";
import { AppShell, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import type { ScooterDetails } from "../types/domain";
import type { RideTelemetry } from "../types/ride";
import type { SensorSnapshot } from "../types/sensor";
import { formatDuration, formatFare, formatMetric } from "../utils/format";

interface RidingPageProps {
  ride: RideTelemetry;
  sensor: SensorSnapshot;
  scooter: ScooterDetails | null;
  onEndRide(): void;
}

function estimateBatteryPercent(startBattery: number | null, elapsedSeconds: number | null): number | null {
  if (startBattery === null) return null;
  const elapsedMinutes = elapsedSeconds === null ? 0 : Math.floor(elapsedSeconds / 60);
  return Math.max(0, startBattery - Math.floor(elapsedMinutes / 3));
}

export function RidingPage({ ride, sensor, scooter, onEndRide }: RidingPageProps) {
  const helmetConnected = sensor.helmetConnectionStatus === "connected";
  const deckConnected = sensor.deckConnectionStatus === "connected";
  const batteryPercent = estimateBatteryPercent(scooter?.batteryPercent ?? null, ride.elapsedSeconds);

  return (
    <AppShell>
      <TopBar title="이용 중" />
      <div className="page-content riding-content">
        <div className="riding-status" role="status" aria-live="polite">
          <span className="riding-pulse" aria-hidden="true" />
          <div><strong>안전 주행 상태를 확인하고 있어요</strong><p>연결된 장치의 상태가 계속 표시돼요</p></div>
          <ShieldCheck aria-hidden="true" />
        </div>

        <SurfaceCard className="ride-timer-card">
          <Clock3 aria-hidden="true" />
          <span>이용 시간</span>
          <strong role="timer">{formatDuration(ride.elapsedSeconds)}</strong>
          {ride.elapsedSeconds === null ? <p>주행 시작 정보를 기다리고 있어요</p> : <p>현재 이용 중이에요</p>}
        </SurfaceCard>

        <div className="ride-metrics-grid">
          <SurfaceCard className="ride-metric-card"><MapPinned aria-hidden="true" /><span>주행 거리</span><strong>{formatMetric(ride.distanceKm, "km")}</strong></SurfaceCard>
          <SurfaceCard className="ride-metric-card"><WalletCards aria-hidden="true" /><span>현재 요금</span><strong>{formatFare(ride.fareAmount, ride.currencyCode)}</strong></SurfaceCard>
        </div>

        <SurfaceCard className="battery-meter-card">
          <div className="battery-meter-header">
            <BatteryMedium aria-hidden="true" />
            <span>잔여 배터리</span>
            <strong>{batteryPercent === null ? "—" : `${batteryPercent}%`}</strong>
          </div>
          {batteryPercent !== null ? (
            <div className="battery-meter-track">
              <div
                className={`battery-meter-fill ${batteryPercent <= 15 ? "is-critical" : batteryPercent <= 30 ? "is-warning" : ""}`}
                style={{ width: `${batteryPercent}%` }}
              />
            </div>
          ) : null}
        </SurfaceCard>

        <section className="content-section">
          <SectionTitle>실시간 연결 상태</SectionTitle>
          <SurfaceCard className="connection-list">
            <ConnectionRow icon={<Bluetooth aria-hidden="true" />} label="헬멧 Bluetooth" connected={helmetConnected} />
            <ConnectionRow icon={<RadioTower aria-hidden="true" />} label="데크 Wi‑Fi" connected={deckConnected} />
          </SurfaceCard>
        </section>

        <div className="sticky-action-spacer" />
      </div>
      <div className="sticky-action">
        <button type="button" className="secondary-button end-ride-button" onClick={onEndRide}>
          <Square aria-hidden="true" /> 이용 종료
        </button>
      </div>
    </AppShell>
  );
}

function ConnectionRow({ icon, label, connected }: { icon: React.ReactNode; label: string; connected: boolean }) {
  return (
    <div className="connection-row">
      <span className="round-icon">{icon}</span>
      <span>{label}</span>
      <strong className={connected ? "status-normal" : "status-neutral"}>{connected ? "연결됨" : "확인 필요"}</strong>
    </div>
  );
}
