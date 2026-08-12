"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type LocationStatus = "idle" | "requesting" | "ready" | "permission-denied" | "unavailable" | "timeout" | "unsupported" | "error";
type VerifiedLocation = { latitude: number; longitude: number };
type StatusMessage = { title: string; description: string };

const statusMessages: Record<Exclude<LocationStatus, "ready">, StatusMessage> = {
  idle: { title: "현재 위치를 확인해 주세요", description: "주변 지도를 보려면 위치 접근이 필요해요." },
  requesting: { title: "현재 위치를 확인하고 있어요", description: "브라우저의 위치 권한 요청을 확인해 주세요." },
  "permission-denied": { title: "위치 권한이 필요해요", description: "브라우저 설정에서 위치 접근을 허용한 뒤 다시 시도해 주세요." },
  unavailable: { title: "현재 위치를 찾을 수 없어요", description: "기기의 위치 서비스를 켠 뒤 다시 시도해 주세요." },
  timeout: { title: "위치 확인이 늦어지고 있어요", description: "위치 신호가 잘 잡히는 곳에서 다시 시도해 주세요." },
  unsupported: { title: "이 브라우저에서는 위치를 사용할 수 없어요", description: "위치 기능을 지원하는 모바일 브라우저에서 이용해 주세요." },
  error: { title: "지도를 불러오지 못했어요", description: "잠시 뒤 현재 위치를 다시 확인해 주세요." },
};

const locationOptions: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 };
const mapZoomLevel = 16;
const openStreetMapTiles = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function getButtonLabel(status: LocationStatus) {
  if (status === "requesting") return "위치 확인 중";
  if (status === "ready") return "현재 위치 다시 찾기";
  if (status === "idle") return "현재 위치 확인하기";
  return "다시 시도";
}

function getErrorStatus(error: GeolocationPositionError): LocationStatus {
  if (error.code === error.PERMISSION_DENIED) return "permission-denied";
  if (error.code === error.POSITION_UNAVAILABLE) return "unavailable";
  if (error.code === error.TIMEOUT) return "timeout";
  return "error";
}

function isValidLocation(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function LocationMap() {
  const headingId = useId();
  const descriptionId = useId();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const currentLocationMarkerRef = useRef<CircleMarker | null>(null);
  const requestSequenceRef = useRef(0);
  const isMountedRef = useRef(false);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [location, setLocation] = useState<VerifiedLocation | null>(null);

  const requestCurrentLocation = useCallback(() => {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setLocation(null);

    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current || requestSequence !== requestSequenceRef.current) return;
        const { latitude, longitude } = position.coords;
        if (!isValidLocation(latitude, longitude)) {
          setStatus("error");
          return;
        }
        setLocation({ latitude, longitude });
        setStatus("ready");
      },
      (error) => {
        if (!isMountedRef.current || requestSequence !== requestSequenceRef.current) return;
        setLocation(null);
        setStatus(getErrorStatus(error));
      },
      locationOptions,
    );
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!location) {
      currentLocationMarkerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      return;
    }

    let cancelled = false;
    const createOrUpdateMap = async () => {
      try {
        const leaflet = await import("leaflet");
        if (cancelled || !mapContainerRef.current) return;
        const mapPosition: [number, number] = [location.latitude, location.longitude];

        if (!mapInstanceRef.current) {
          const map = leaflet.map(mapContainerRef.current, { attributionControl: true, keyboard: true, preferCanvas: true, zoomControl: true }).setView(mapPosition, mapZoomLevel);
          mapInstanceRef.current = map;
          leaflet.tileLayer(openStreetMapTiles, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
            maxZoom: 19,
          }).addTo(map);
          currentLocationMarkerRef.current = leaflet.circleMarker(mapPosition, {
            color: "#ffffff", fillColor: "#397bf6", fillOpacity: 1, radius: 8, weight: 3,
          }).bindTooltip("현재 위치", { direction: "top", offset: [0, -8] }).addTo(map);
        } else {
          mapInstanceRef.current.setView(mapPosition, mapZoomLevel);
          currentLocationMarkerRef.current?.setLatLng(mapPosition);
        }
        window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
      } catch {
        if (!cancelled && isMountedRef.current) {
          currentLocationMarkerRef.current = null;
          mapInstanceRef.current?.remove();
          mapInstanceRef.current = null;
          setLocation(null);
          setStatus("error");
        }
      }
    };
    void createOrUpdateMap();
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => () => {
    currentLocationMarkerRef.current = null;
    mapInstanceRef.current?.remove();
    mapInstanceRef.current = null;
  }, []);

  const isRequesting = status === "requesting";
  const isReady = status === "ready" && location !== null;
  const statusMessage = isReady ? null : statusMessages[status as Exclude<LocationStatus, "ready">];

  return (
    <section className={`location-map location-map--${status}`} aria-labelledby={headingId} aria-describedby={descriptionId}>
      <div className="location-map__header">
        <div className="location-map__heading-group">
          <h2 className="location-map__title" id={headingId}>주변 지도</h2>
          <p className="location-map__description" id={descriptionId}>현재 위치를 기준으로 지도를 확인해요</p>
        </div>
        <button className="location-map__location-button" type="button" onClick={requestCurrentLocation} disabled={isRequesting} aria-label={isRequesting ? "현재 위치를 확인하고 있어요" : getButtonLabel(status)}>
          <LocateFixed aria-hidden="true" />
          <span>{getButtonLabel(status)}</span>
        </button>
      </div>
      <div className="location-map__content" aria-busy={isRequesting ? "true" : "false"}>
        {isReady ? (
          <div className="location-map__viewport" ref={mapContainerRef} role="region" aria-label="현재 위치가 표시된 지도" />
        ) : (
          <div className={`location-map__state location-map__state--${status}`} role={status === "permission-denied" || status === "error" ? "alert" : "status"} aria-live={status === "permission-denied" || status === "error" ? "assertive" : "polite"}>
            <span className="location-map__state-symbol" aria-hidden="true"><MapPin /></span>
            <strong className="location-map__state-title">{statusMessage?.title}</strong>
            <p className="location-map__state-description">{statusMessage?.description}</p>
            {!isRequesting ? <button className="location-map__state-action" type="button" onClick={requestCurrentLocation}>{getButtonLabel(status)}</button> : null}
          </div>
        )}
      </div>
      {isReady ? <p className="location-map__ready-message" role="status" aria-live="polite">현재 위치를 지도에 표시했어요</p> : null}
    </section>
  );
}

export default LocationMap;
