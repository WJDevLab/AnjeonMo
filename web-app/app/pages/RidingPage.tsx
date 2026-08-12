"use client";

import { Bluetooth, Clock3, Gauge, MapPinned, RadioTower, ShieldCheck, WalletCards } from "lucide-react";
import { AppShell, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import type { RideTelemetry } from "../types/ride";
import type { SensorSnapshot } from "../types/sensor";
import { formatDuration, formatFare, formatMetric } from "../utils/format";

export function RidingPage({ ride, sensor }: { ride: RideTelemetry; sensor: SensorSnapshot }) {
  const helmetConnected = sensor.helmetConnectionStatus === "connected";
  const deckConnected = sensor.deckConnectionStatus === "connected";

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

        <section className="content-section">
          <SectionTitle>실시간 연결 상태</SectionTitle>
          <SurfaceCard className="connection-list">
            <ConnectionRow icon={<Bluetooth aria-hidden="true" />} label="헬멧 Bluetooth" connected={helmetConnected} />
            <ConnectionRow icon={<RadioTower aria-hidden="true" />} label="데크 Wi‑Fi" connected={deckConnected} />
          </SurfaceCard>
        </section>

        <SurfaceCard className="ride-note-card">
          <Gauge aria-hidden="true" />
          <div><strong>거리와 요금은 실제 데이터만 표시해요</strong><p>주행 서버와 요금 정책이 연결되기 전에는 임의의 값을 계산하지 않아요.</p></div>
        </SurfaceCard>
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
