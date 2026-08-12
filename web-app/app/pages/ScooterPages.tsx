"use client";

import { BatteryMedium, ChevronRight, Footprints, Gauge, MapPin, RadioTower, WalletCards } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AppShell, PrimaryButton, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import { LocationMap } from "../components/LocationMap";
import { ScooterIllustration } from "../components/ScooterIllustration";
import { EMPTY_SCOOTER, type ScooterDetails } from "../types/domain";

export function ScooterSelectionPage() {
  return (
    <AppShell>
      <TopBar title="킥보드 선택" back />
      <div className="page-content">
        <div className="location-row"><MapPin aria-hidden="true" /><span>현재 위치를 확인해 주세요</span></div>
        <LocationMap />
        <section className="content-section">
          <SectionTitle>주변 킥보드</SectionTitle>
          <SurfaceCard className="empty-state-card">
            <span className="round-icon"><RadioTower aria-hidden="true" /></span>
            <h2>표시할 킥보드가 없어요</h2>
            <p>위치 권한과 대여 데이터 연결 상태를 확인해 주세요.</p>
          </SurfaceCard>
        </section>
      </div>
    </AppShell>
  );
}

export function ScooterDetailPage({ onStartSafetyCheck }: { onStartSafetyCheck(): Promise<void> }) {
  const location = useLocation();
  const scooter = ((location.state as { scooter?: ScooterDetails } | null)?.scooter) ?? EMPTY_SCOOTER;
  const ready = scooter.id !== null;

  return (
    <AppShell className="detail-stage">
      <TopBar title="킥보드 상세" back />
      <div className="page-content detail-content">
        <div className="detail-heading">
          <span className="data-chip">{scooter.id ?? "식별 정보 없음"}</span>
          <h2>{scooter.modelName ?? "모델 정보 없음"}</h2>
          <p>선택한 킥보드의 상태를 확인해 주세요</p>
        </div>
        <ScooterIllustration />
        <SurfaceCard className="metric-grid-card">
          <div className="metric-cell"><BatteryMedium aria-hidden="true" /><span>배터리</span><strong>{scooter.batteryPercent === null ? "—" : `${scooter.batteryPercent}%`}</strong></div>
          <div className="metric-divider" />
          <div className="metric-cell"><Gauge aria-hidden="true" /><span>예상 주행거리</span><strong>{scooter.estimatedRangeKm === null ? "—" : `${scooter.estimatedRangeKm} km`}</strong></div>
        </SurfaceCard>
        <SurfaceCard className="metric-grid-card">
          <div className="metric-cell"><WalletCards aria-hidden="true" /><span>기본 요금</span><strong>{scooter.baseFareAmount === null ? "—" : "연동 데이터"}</strong></div>
          <div className="metric-divider" />
          <div className="metric-cell"><WalletCards aria-hidden="true" /><span>분당 요금</span><strong>{scooter.perMinuteFareAmount === null ? "—" : "연동 데이터"}</strong></div>
        </SurfaceCard>
        <SurfaceCard className="sensor-explainer">
          <div className="card-title-row"><span className="round-icon"><Footprints aria-hidden="true" /></span><div><h2>압력센서 안전 시스템</h2><p>데크의 발 위치와 탑승 상태를 확인해요</p></div></div>
          <ul>
            <li><span>한 사람의 탑승 상태</span><ChevronRight aria-hidden="true" /></li>
            <li><span>안정적인 발 위치</span><ChevronRight aria-hidden="true" /></li>
          </ul>
        </SurfaceCard>
        <div className="sticky-action-spacer" />
      </div>
      <div className="sticky-action">
        <PrimaryButton disabled={!ready} onClick={() => void onStartSafetyCheck()} ariaDescribedBy={!ready ? "ride-start-reason" : undefined}>
          탑승 시작 <ChevronRight aria-hidden="true" />
        </PrimaryButton>
        {!ready ? <p id="ride-start-reason">킥보드 정보를 불러온 뒤 시작할 수 있어요</p> : null}
      </div>
    </AppShell>
  );
}
