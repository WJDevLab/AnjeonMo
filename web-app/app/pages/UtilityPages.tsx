"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronRight, Clock3, CreditCard, History, MapPinned, ShieldAlert, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import { Calendar } from "../components/Calendar";
import { MonthlyTrendChart } from "../components/MonthlyTrendChart";
import { ROUTES } from "../config/app";
import { getAllRideRecords, getMonthlyAggregate, getOverallAggregate } from "../data/rideHistoryStore";
import { formatDayHeading, toDateKey } from "../utils/date";
import { formatDuration, formatFare, formatMetric } from "../utils/format";

export function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const records = useMemo(() => getAllRideRecords(), []);
  const markedDates = useMemo(() => new Set(records.map((record) => record.dateKey)), [records]);
  const dayRecords = useMemo(() => records.filter((record) => record.dateKey === selectedDate), [records, selectedDate]);

  return (
    <AppShell bottomNavigation>
      <TopBar title="이용내역" />
      <div className="page-content history-content">
        <Calendar markedDates={markedDates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <section className="content-section">
          <SectionTitle>{formatDayHeading(selectedDate)}</SectionTitle>
          {dayRecords.length === 0 ? (
            <SurfaceCard className="empty-state-card">
              <span className="round-icon"><History aria-hidden="true" /></span>
              <h2>이 날짜엔 이용 기록이 없어요</h2>
              <p>달력에서 점이 표시된 날짜를 선택해 보세요.</p>
            </SurfaceCard>
          ) : (
            <div className="day-record-list">
              {dayRecords.map((record) => (
                <SurfaceCard key={record.id} className="day-record-item">
                  <div className="day-record-row">
                    <span><MapPinned aria-hidden="true" />주행 거리</span>
                    <strong>{formatMetric(record.distanceKm, "km")}</strong>
                  </div>
                  <div className="day-record-row">
                    <span><Clock3 aria-hidden="true" />이용 시간</span>
                    <strong>{formatDuration(record.durationSeconds)}</strong>
                  </div>
                  <div className="day-record-row">
                    <span><WalletCards aria-hidden="true" />이용 요금</span>
                    <strong>{formatFare(record.fareAmount, record.currencyCode)}</strong>
                  </div>
                  {record.multiRiderBlockedCount > 0 || record.helmetBlockedCount > 0 ? (
                    <div className="day-record-safety">
                      <ShieldAlert aria-hidden="true" />
                      <span>
                        {[
                          record.multiRiderBlockedCount > 0 ? `2인 이상 탑승 제한 ${record.multiRiderBlockedCount}회` : null,
                          record.helmetBlockedCount > 0 ? `헬멧 미착용 제한 ${record.helmetBlockedCount}회` : null,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  ) : null}
                </SurfaceCard>
              ))}
            </div>
          )}
        </section>
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
  const [period, setPeriod] = useState<"month" | "all">("month");
  const stats = useMemo(() => {
    const now = new Date();
    return period === "month" ? getMonthlyAggregate(now.getFullYear(), now.getMonth()) : getOverallAggregate();
  }, [period]);

  return (
    <AppShell>
      <TopBar title="주행 통계" back />
      <div className="page-content stats-content">
        <div className="period-selector" role="group" aria-label="통계 기간">
          <button className={period === "month" ? "is-active" : ""} type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>이번 달</button>
          <button className={period === "all" ? "is-active" : ""} type="button" aria-pressed={period === "all"} onClick={() => setPeriod("all")}>전체</button>
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
          {stats.dailyDistanceKm.length === 0 ? (
            <SurfaceCard className="chart-empty">
              <BarChart3 aria-hidden="true" />
              <strong>표시할 주행 기록이 없어요</strong>
              <p>실제 기록이 쌓이면 추이를 확인할 수 있어요.</p>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="trend-chart-card">
              <MonthlyTrendChart points={stats.dailyDistanceKm} />
            </SurfaceCard>
          )}
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
          {stats.recentRides.length === 0 ? (
            <SurfaceCard className="empty-inline recent-empty">
              <span className="round-icon"><ShieldCheck aria-hidden="true" /></span>
              <div><strong>최근 이용 기록이 없어요</strong><p>주행을 마치면 기록이 표시돼요.</p></div>
            </SurfaceCard>
          ) : (
            <div className="day-record-list">
              {stats.recentRides.map((ride) => (
                <SurfaceCard key={ride.id} className="recent-ride-item">
                  <span className="recent-ride-date">{formatDayHeading(ride.dateKey)}</span>
                  <span className="recent-ride-metrics">
                    <span>{formatMetric(ride.distanceKm, "km")}</span>
                    <span>{formatDuration(ride.durationSeconds)}</span>
                    <span>{formatFare(ride.fareAmount, ride.currencyCode)}</span>
                  </span>
                </SurfaceCard>
              ))}
            </div>
          )}
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
