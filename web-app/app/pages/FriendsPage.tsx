"use client";

import { ChevronRight, History, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell, SectionTitle, SurfaceCard, TopBar } from "../components/AppShell";
import { findMockFriendById, listMockFriends } from "../data/mockFriends";
import { ROUTES } from "../config/app";
import { formatDuration, formatFare, formatMetric } from "../utils/format";

function formatRelativeTime(iso: string | null): string {
  if (iso === null) return "이용 기록 없음";
  const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}

export function FriendsListPage() {
  const navigate = useNavigate();
  const friends = listMockFriends();

  return (
    <AppShell>
      <TopBar title="친구" back />
      <div className="page-content">
        <p className="friends-intro">자녀나 친구의 킥보드 이용 상태를 확인해요</p>
        <div className="friend-list">
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              className="friend-list-item"
              onClick={() => navigate(`${ROUTES.friends}/${friend.id}`)}
            >
              <span className={`friend-avatar ${friend.isRidingNow ? "is-riding" : ""}`}>{friend.name.slice(0, 1)}</span>
              <span className="friend-list-body">
                <strong>{friend.name}</strong>
                <small>{friend.relationship} · {friend.isRidingNow ? "이용 중" : formatRelativeTime(friend.lastRideAt)}</small>
              </span>
              {friend.isRidingNow ? <span className="friend-status-badge">이용 중</span> : null}
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export function FriendDetailPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const friend = friendId ? findMockFriendById(friendId) : null;

  if (!friend) {
    return (
      <AppShell>
        <TopBar title="친구" back />
        <div className="page-content utility-content">
          <SurfaceCard className="empty-state-card">
            <span className="round-icon"><UserRound aria-hidden="true" /></span>
            <h2>친구 정보를 찾을 수 없어요</h2>
          </SurfaceCard>
        </div>
      </AppShell>
    );
  }

  const totalRides = friend.rides.length;
  const totalDistanceKm = Math.round(friend.rides.reduce((sum, r) => sum + r.distanceKm, 0) * 10) / 10;
  const multiBlocked = friend.rides.reduce((sum, r) => sum + r.multiRiderBlockedCount, 0);
  const helmetBlocked = friend.rides.reduce((sum, r) => sum + r.helmetBlockedCount, 0);

  return (
    <AppShell>
      <TopBar title={friend.name} back />
      <div className="page-content">
        <SurfaceCard className="friend-status-card">
          <span className={`friend-avatar is-large ${friend.isRidingNow ? "is-riding" : ""}`}>{friend.name.slice(0, 1)}</span>
          <div className="friend-status-name">
            <strong>{friend.name}</strong>
            <p>{friend.relationship}</p>
          </div>
          <span className={`friend-status-pill ${friend.isRidingNow ? "is-riding" : ""}`}>{friend.isRidingNow ? "이용 중" : "오프라인"}</span>
        </SurfaceCard>

        <section className="content-section">
          <SectionTitle>이용 정보</SectionTitle>
          <SurfaceCard className="ride-state-card">
            <span className="round-icon"><History aria-hidden="true" /></span>
            <div>
              <strong>마지막 이용</strong>
              <p>{formatRelativeTime(friend.lastRideAt)}</p>
            </div>
          </SurfaceCard>
        </section>

        <section className="content-section">
          <SectionTitle>안전 기록</SectionTitle>
          <SurfaceCard className="safety-record-list">
            <div className="safety-record-row"><span><ShieldCheck aria-hidden="true" />총 이용 횟수</span><strong>{totalRides.toLocaleString("ko-KR")}회</strong></div>
            <div className="safety-record-row"><span><ShieldCheck aria-hidden="true" />총 주행 거리</span><strong>{formatMetric(totalDistanceKm, "km")}</strong></div>
            <div className="safety-record-row"><span><ShieldCheck aria-hidden="true" />2인 이상 탑승 제한</span><strong>{multiBlocked.toLocaleString("ko-KR")}회</strong></div>
            <div className="safety-record-row"><span><ShieldCheck aria-hidden="true" />헬멧 미착용 제한</span><strong>{helmetBlocked.toLocaleString("ko-KR")}회</strong></div>
          </SurfaceCard>
        </section>

        <section className="content-section">
          <SectionTitle>이용 기록</SectionTitle>
          {friend.rides.length === 0 ? (
            <SurfaceCard className="empty-state-card">
              <span className="round-icon"><History aria-hidden="true" /></span>
              <h2>이용 기록이 없어요</h2>
            </SurfaceCard>
          ) : (
            <div className="friend-ride-list">
              {friend.rides.map((ride) => (
                <SurfaceCard key={ride.id} className="friend-ride-item">
                  <span className="friend-ride-date">{ride.dateKey}</span>
                  <span className="friend-ride-metrics">
                    <span>{formatMetric(ride.distanceKm, "km")}</span>
                    <span>{formatDuration(ride.durationSeconds)}</span>
                    <span>{formatFare(ride.fareAmount, ride.currencyCode)}</span>
                  </span>
                  {ride.multiRiderBlockedCount > 0 || ride.helmetBlockedCount > 0 ? (
                    <span className="friend-ride-flag">안전 제한 {ride.multiRiderBlockedCount + ride.helmetBlockedCount}회</span>
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
