"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Navigate, Route, Routes, BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { Route as RouteIcon } from "lucide-react";
import { useRideTelemetry } from "./hooks/useRideTelemetry";
import { useSensorData } from "./hooks/useSensorData";
import { LocalRideSessionService, WebSocketRideTelemetryService, readPublicRideTelemetryUrl } from "./services/ride";
import { createRealSensorServiceFromEnv, TestScenarioSensorService, type SensorService } from "./services/sensor";
import { HomePage } from "./pages/HomePage";
import { RidingPage } from "./pages/RidingPage";
import { SafetyCheckPage } from "./pages/SafetyCheckPage";
import { ScooterDetailPage, ScooterSelectionPage } from "./pages/ScooterPages";
import { HistoryPage, PaymentPage, ProfilePage, StatisticsPage } from "./pages/UtilityPages";
import { WelcomePage } from "./pages/WelcomePage";
import { ROUTES } from "./config/app";

function createSensorService(): SensorService {
  const testAllowed = process.env.NEXT_PUBLIC_ENABLE_SENSOR_SCENARIOS === "true" || process.env.VITE_ENABLE_SENSOR_SCENARIOS === "true";
  const testRequested = new URLSearchParams(window.location.search).get("sensor") === "test";
  if (testAllowed && testRequested) return new TestScenarioSensorService({ enabled: true });
  return createRealSensorServiceFromEnv();
}

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
  const [sensorService] = useState<SensorService>(() => createSensorService());
  const [rideService] = useState(() => new LocalRideSessionService());
  const [rideStream] = useState(() => {
    const url = readPublicRideTelemetryUrl();
    return url ? new WebSocketRideTelemetryService({ url }) : null;
  });
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
    if ("dispose" in sensorService && typeof sensorService.dispose === "function") sensorService.dispose();
    void rideService.disconnect();
    void rideStream?.disconnect();
  }, [rideService, rideStream, sensorService]);

  const startSafetyCheck = useCallback(() => {
    const connectionAttempt = sensor.connect();
    navigate(ROUTES.safetyCheck);
    return connectionAttempt.catch(() => {
      // The safety page distinguishes configuration, permission, and connection failures.
    });
  }, [navigate, sensor]);

  const startConfirmedRide = useCallback(() => {
    rideService.confirmStarted(null);
    if (sensorService instanceof TestScenarioSensorService) sensorService.markRiding();
    if (rideStream) void rideStream.connect().catch(() => undefined);
    navigate(ROUTES.riding, { replace: true });
  }, [navigate, rideService, rideStream, sensorService]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path={ROUTES.welcome} element={<WelcomePage />} />
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.scooters} element={<ScooterSelectionPage />} />
        <Route path={ROUTES.scooterDetail} element={<ScooterDetailPage onStartSafetyCheck={startSafetyCheck} />} />
        <Route path={ROUTES.safetyCheck} element={<SafetyCheckPage service={sensorService} snapshot={sensor.snapshot} connect={sensor.connect} onSuccess={startConfirmedRide} />} />
        <Route path={ROUTES.riding} element={<RidingPage ride={ride} sensor={sensor.snapshot} />} />
        <Route path={ROUTES.history} element={<HistoryPage />} />
        <Route path={ROUTES.payment} element={<PaymentPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.statistics} element={<StatisticsPage />} />
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
