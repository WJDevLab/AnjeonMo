"use client";

import { BarChart3, ChevronRight, CreditCard, History, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import { ROUTES } from "../config/app";
import { EMPTY_RIDE_STATISTICS } from "../types/domain";
import { formatDuration, formatMetric } from "../utils/format";

export function HistoryPage() {
  return (
    <AppShell bottomNavigation>
      <TopBar title="이용내역" />
      <div className="page-content utility-content">
        <SurfaceCard className="empty-state-card">
          <span className="round-icon"><History aria-hidden="true" /></span>
          <h2>아직 이용 기록이 없어요</h2>
          <p>주행을 마치면 이용 내역이 여기에 표시돼요.</p>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}

export function PaymentPage() {
  return (
    <AppShell bottomNavigation>
      <TopBar title="결제" />
      <div className="page-content utility-content">
        <SurfaceCard className="empty-state-card">
          <span className="round-icon"><CreditCard aria-hidden="true" /></span>
          <h2>결제 정보를 연결하고 있어요</h2>
          <p>요금 정책과 결제 서비스가 연결되면 사용할 수 있어요.</p>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  return (
    <AppShell bottomNavigation>
      <TopBar title="내 정보" />
      <div className="page-content profile-content">
        <SurfaceCard className="profile-placeholder">
          <span className="round-icon"><UserRound aria-hidden="true" /></span>
          <div><strong>사용자 정보 없음</strong><p>로그인 정보가 연결되면 표시돼요</p></div>
        </SurfaceCard>
        <section className="content-section">
          <SectionTitle>기록</SectionTitle>
          <button className="menu-card" type="button" onClick={() => navigate(ROUTES.statistics)}>
            <span className="round-icon"><BarChart3 aria-hidden="true" /></span>
            <span><strong>주행 통계</strong><small>이용 및 안전 기록을 확인해요</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        </section>
      </div>
    </AppShell>
  );
}

export function StatisticsPage() {
  const stats = EMPTY_RIDE_STATISTICS;
  return (
    <AppShell>
      <TopBar title="주행 통계" back />
      <div className="page-content stats-content">
        <div className="period-selector" role="group" aria-label="통계 기간">
          <button className="is-active" type="button" aria-pressed="true">이번 달</button>
          <button type="button" aria-pressed="false">전체</button>
        </div>

        <section className="content-section">
          <SectionTitle>핵심 기록</SectionTitle>
          <div className="stats-grid">
            <SurfaceCard className="stat-card"><span>주행 횟수</span><strong>{formatMetric(stats.rideCount, "회")}</strong></SurfaceCard>
            <SurfaceCard className="stat-card"><span>총 주행 거리</span><strong>{formatMetric(stats.totalDistanceKm, "km")}</strong></SurfaceCard>
            <SurfaceCard className="stat-card"><span>총 이용 시간</span><strong>{formatDuration(stats.totalDurationSeconds)}</strong></SurfaceCard>
            <SurfaceCard className="stat-card"><span>평균 속도</span><strong>{formatMetric(stats.averageSpeedKph, "km/h")}</strong></SurfaceCard>
          </div>
        </section>

        <section className="content-section">
          <SectionTitle>주행 추이</SectionTitle>
          <SurfaceCard className="chart-empty">
            <BarChart3 aria-hidden="true" />
            <strong>표시할 주행 기록이 없어요</strong>
            <p>실제 기록이 쌓이면 월별 추이를 확인할 수 있어요.</p>
          </SurfaceCard>
        </section>

        <section className="content-section">
          <SectionTitle>안전 기록</SectionTitle>
          <SurfaceCard className="safety-record-list">
            <SafetyRecord label="안전 점검 통과" value={stats.safetyPassCount} />
            <SafetyRecord label="헬멧 착용 확인" value={stats.helmetConfirmedCount} />
            <SafetyRecord label="복수 탑승 의심" value={stats.multipleRiderSuspectedCount} />
            <SafetyRecord label="안전 차단" value={stats.safetyBlockedCount} />
          </SurfaceCard>
        </section>

        <section className="content-section">
          <SectionTitle>최근 이용 내역</SectionTitle>
          <SurfaceCard className="empty-inline recent-empty">
            <span className="round-icon"><ShieldCheck aria-hidden="true" /></span>
            <div><strong>최근 이용 기록이 없어요</strong><p>주행을 마치면 기록이 표시돼요.</p></div>
          </SurfaceCard>
        </section>
      </div>
    </AppShell>
  );
}

function SafetyRecord({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="safety-record-row">
      <span><ShieldCheck aria-hidden="true" />{label}</span>
      <strong>{value === null ? "기록 없음" : `${value.toLocaleString("ko-KR")}회`}</strong>
    </div>
  );
}
