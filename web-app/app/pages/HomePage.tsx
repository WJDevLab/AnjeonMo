"use client";

import { ChevronRight, Footprints, HardHat, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import { LocationMap } from "../components/LocationMap";
import { ROUTES } from "../config/app";
import { EMPTY_MONTHLY_SUMMARY } from "../types/domain";

export function HomePage() {
  const navigate = useNavigate();
  const summary = EMPTY_MONTHLY_SUMMARY;

  return (
    <AppShell bottomNavigation>
      <TopBar
        title="홈"
        right={<span className="header-status-icon" aria-label="안전 시스템"><ShieldCheck aria-hidden="true" /></span>}
      />
      <div className="page-content home-content">
        <div className="location-row">
          <MapPin aria-hidden="true" />
          <span>현재 위치를 확인해 주세요</span>
        </div>
        <LocationMap />

        <button className="nearby-card" type="button" onClick={() => navigate(ROUTES.scooters)}>
          <span className="nearby-icon"><MapPin aria-hidden="true" /></span>
          <span>
            <strong>주변 킥보드 찾기</strong>
            <small>위치와 대여 정보를 불러온 뒤 확인할 수 있어요</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>

        <section className="content-section">
          <SectionTitle>이용 상태</SectionTitle>
          <SurfaceCard className="ride-state-card">
            <span className="round-icon"><ShieldCheck aria-hidden="true" /></span>
            <div>
              <strong>현재 이용 중이 아니에요</strong>
              <p>킥보드를 선택하면 안전 확인을 시작할 수 있어요</p>
            </div>
          </SurfaceCard>
        </section>

        <section className="content-section">
          <SectionTitle>안전 시스템</SectionTitle>
          <div className="safety-summary-grid">
            <SurfaceCard className="safety-summary-item">
              <UserRound aria-hidden="true" />
              <span>탑승 상태</span>
              <strong>확인 전</strong>
            </SurfaceCard>
            <SurfaceCard className="safety-summary-item">
              <HardHat aria-hidden="true" />
              <span>헬멧</span>
              <strong>확인 전</strong>
            </SurfaceCard>
            <SurfaceCard className="safety-summary-item">
              <Footprints aria-hidden="true" />
              <span>발 위치</span>
              <strong>확인 전</strong>
            </SurfaceCard>
          </div>
          <div className="soft-info-panel">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>탑승 전에 안전 상태를 확인해요</strong>
              <p>헬멧과 발 위치가 모두 정상이어야 시작할 수 있어요</p>
            </div>
          </div>
        </section>

        <section className="content-section">
          <SectionTitle
            action={<button className="text-action" type="button" onClick={() => navigate(ROUTES.statistics)}>자세히 보기 <ChevronRight aria-hidden="true" /></button>}
          >이번 달 이용 요약</SectionTitle>
          <SurfaceCard className="monthly-card">
            {summary.rideCount === null && summary.distanceKm === null && summary.safetyCheckCount === null ? (
              <div className="empty-inline">
                <span className="round-icon"><ShieldCheck aria-hidden="true" /></span>
                <div><strong>아직 이번 달 주행 기록이 없어요</strong><p>주행 후 기록을 확인할 수 있어요</p></div>
              </div>
            ) : null}
          </SurfaceCard>
        </section>
      </div>
    </AppShell>
  );
}
