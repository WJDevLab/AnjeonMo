"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Navigate, Route, Routes, BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { Route as RouteIcon } from "lucide-react";
import { useRideTelemetry } from "./hooks/useRideTelemetry";
import { useSensorData } from "./hooks/useSensorData";
import { addRideRecord } from "./data/rideHistoryStore";
import { PrototypeRideSessionService, WebSocketRideTelemetryService, readPublicRideTelemetryUrl } from "./services/ride";
import { KeyboardSensorService } from "./services/sensor";
import { HomePage } from "./pages/HomePage";
import { FriendDetailPage, FriendsListPage } from "./pages/FriendsPage";
import { RidingPage } from "./pages/RidingPage";
import { SafetyCheckPage } from "./pages/SafetyCheckPage";
import { ScooterDetailPage, ScooterSelectionPage } from "./pages/ScooterPages";
import { HistoryPage, PaymentPage, ProfilePage, StatisticsPage } from "./pages/UtilityPages";
import { WelcomePage } from "./pages/WelcomePage";
import { ROUTES } from "./config/app";
import type { ScooterDetails } from "./types/domain";

export function ScooterApp() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="app-stage boot-stage" role="status" aria-live="polite">
        <div className="boot-symbol"><RouteIcon aria-hidden="true" /></div>
        <p>앱을 준비하고 있어요</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRuntime />
    </BrowserRouter>
  );
}

function AppRuntime() {
  const navigate = useNavigate();
  const [sensorService] = useState(() => new KeyboardSensorService({ enabled: true }));
  const [rideService] = useState(() => new PrototypeRideSessionService());
  const [rideStream] = useState(() => {
    const url = readPublicRideTelemetryUrl();
    return url ? new WebSocketRideTelemetryService({ url }) : null;
  });
  const [selectedScooter, setSelectedScooter] = useState<ScooterDetails | null>(null);
  const sensor = useSensorData(sensorService);
  const ride = useRideTelemetry(rideService);

  useEffect(() => {
    if (!rideStream) return;
    return rideStream.subscribe(() => {
      const next = rideStream.getSnapshot();
      rideService.applyActualTelemetry({
        rideId: next.rideId,
        distanceKm: next.distanceKm,
        fareAmount: next.fareAmount,
        currencyCode: next.currencyCode,
        errorCode: next.errorCode,
      });
    });
  }, [rideService, rideStream]);

  useEffect(() => () => {
    void sensorService.disconnect();
    void rideService.disconnect();
    void rideStream?.disconnect();
  }, [rideService, rideStream, sensorService]);

  const startSafetyCheck = useCallback((scooter: ScooterDetails) => {
    setSelectedScooter(scooter);
    navigate(ROUTES.safetyCheck);
  }, [navigate]);

  const startConfirmedRide = useCallback(() => {
    let fareConfig: { baseFareAmount: number; perMinuteFareAmount: number; currencyCode: string } | undefined;
    if (
      selectedScooter &&
      selectedScooter.baseFareAmount !== null &&
      selectedScooter.perMinuteFareAmount !== null &&
      selectedScooter.currencyCode !== null
    ) {
      fareConfig = {
        baseFareAmount: selectedScooter.baseFareAmount,
        perMinuteFareAmount: selectedScooter.perMinuteFareAmount,
        currencyCode: selectedScooter.currencyCode,
      };
    }
    rideService.confirmStarted(selectedScooter?.id ?? null, fareConfig);
    sensorService.markRiding();
    if (rideStream) void rideStream.connect().catch(() => undefined);
    navigate(ROUTES.riding, { replace: true });
  }, [navigate, rideService, rideStream, selectedScooter, sensorService]);

  const endRide = useCallback(() => {
    const snapshot = rideService.getSnapshot();
    if (snapshot.startedAt !== null) {
      addRideRecord({
        startedAt: snapshot.startedAt,
        endedAt: new Date().toISOString(),
        distanceKm: snapshot.distanceKm ?? 0,
        durationSeconds: snapshot.elapsedSeconds ?? 0,
        fareAmount: snapshot.fareAmount ?? 0,
        currencyCode: snapshot.currencyCode ?? "KRW",
        multiRiderBlockedCount: 0,
        helmetBlockedCount: 0,
      });
    }
    rideService.endConfirmedRide();
    setSelectedScooter(null);
    navigate(ROUTES.history, { replace: true });
  }, [navigate, rideService]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path={ROUTES.welcome} element={<WelcomePage />} />
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.scooters} element={<ScooterSelectionPage />} />
        <Route path={ROUTES.scooterDetail} element={<ScooterDetailPage onStartSafetyCheck={startSafetyCheck} />} />
        <Route path={ROUTES.safetyCheck} element={<SafetyCheckPage service={sensorService} snapshot={sensor.snapshot} connect={sensor.connect} onSuccess={startConfirmedRide} />} />
        <Route path={ROUTES.riding} element={<RidingPage ride={ride} sensor={sensor.snapshot} scooter={selectedScooter} onEndRide={endRide} />} />
        <Route path={ROUTES.history} element={<HistoryPage />} />
        <Route path={ROUTES.payment} element={<PaymentPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.statistics} element={<StatisticsPage />} />
        <Route path={ROUTES.friends} element={<FriendsListPage />} />
        <Route path={ROUTES.friendDetail} element={<FriendDetailPage />} />
        <Route path="*" element={<Navigate to={ROUTES.welcome} replace />} />
      </Routes>
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
