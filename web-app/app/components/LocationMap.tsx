"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CircleMarker, Map as LeafletMap, Marker, PopupEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { listMockScooters, type MockScooterListItem } from "../data/mockScooters";
import { ROUTES } from "../config/app";
import { formatFare } from "../utils/format";

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

/**
 * There is no real nearby-scooter API yet, so markers are placed around the
 * user's real location using each mock scooter's own distanceFromUserM, at a
 * bearing hashed from its id — stable across re-renders, no fake API call.
 */
function destinationPoint(lat: number, lng: number, distanceMeters: number, bearingDegrees: number): [number, number] {
  const earthRadiusMeters = 6_371_000;
  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const angularDistance = distanceMeters / earthRadiusMeters;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [(lat2 * 180) / Math.PI, (((lng2 * 180) / Math.PI + 540) % 360) - 180];
}

function stableBearingForId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

function scooterPosition(center: VerifiedLocation, scooter: MockScooterListItem): [number, number] {
  return destinationPoint(center.latitude, center.longitude, scooter.distanceFromUserM, stableBearingForId(scooter.id ?? ""));
}

function buildScooterPopupHtml(scooter: MockScooterListItem): string {
  const battery = scooter.batteryPercent === null ? "—" : `${scooter.batteryPercent}%`;
  const range = scooter.estimatedRangeKm === null ? "—" : `${scooter.estimatedRangeKm}km`;
  const baseFare = formatFare(scooter.baseFareAmount, scooter.currencyCode);
  const perMinute = scooter.perMinuteFareAmount === null ? "" : ` + ${formatFare(scooter.perMinuteFareAmount, scooter.currencyCode)}/분`;
  return `
    <div class="map-scooter-popup">
      <span class="map-scooter-popup-id">${scooter.id}</span>
      <strong class="map-scooter-popup-name">${scooter.modelName}</strong>
      <div class="map-scooter-popup-metrics">
        <span>배터리 ${battery}</span>
        <span>${range}</span>
      </div>
      <div class="map-scooter-popup-fare">${baseFare}${perMinute}</div>
      <button type="button" class="map-scooter-popup-button" data-scooter-id="${scooter.id}">운행 시작</button>
    </div>
  `;
}

const scooterMarkerSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 19h9l5-9"/><path d="M14 19V6h4"/></svg>`;

export function LocationMap() {
  const headingId = useId();
  const descriptionId = useId();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const currentLocationMarkerRef = useRef<CircleMarker | null>(null);
  const scooterMarkersRef = useRef<Marker[]>([]);
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
      scooterMarkersRef.current = [];
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
        const scooters = listMockScooters();

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

          const scooterIcon = leaflet.divIcon({
            className: "map-scooter-marker-wrapper",
            html: `<div class="map-scooter-marker">${scooterMarkerSvg}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          scooterMarkersRef.current = scooters.map((scooter) =>
            leaflet
              .marker(scooterPosition(location, scooter), { icon: scooterIcon })
              .bindPopup(buildScooterPopupHtml(scooter))
              .addTo(map),
          );
          map.on("popupopen", (event: PopupEvent) => {
            const button = event.popup.getElement()?.querySelector<HTMLButtonElement>(".map-scooter-popup-button");
            const scooter = scooters.find((item) => item.id === button?.dataset.scooterId);
            if (!button || !scooter) return;
            button.addEventListener("click", () => navigate(ROUTES.scooterDetail, { state: { scooter } }), { once: true });
          });
        } else {
          mapInstanceRef.current.setView(mapPosition, mapZoomLevel);
          currentLocationMarkerRef.current?.setLatLng(mapPosition);
          scooterMarkersRef.current.forEach((marker, index) => {
            const scooter = scooters[index];
            if (scooter) marker.setLatLng(scooterPosition(location, scooter));
          });
        }
        window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
      } catch {
        if (!cancelled && isMountedRef.current) {
          currentLocationMarkerRef.current = null;
          scooterMarkersRef.current = [];
          mapInstanceRef.current?.remove();
          mapInstanceRef.current = null;
          setLocation(null);
          setStatus("error");
        }
      }
    };
    void createOrUpdateMap();
    return () => { cancelled = true; };
  }, [location, navigate]);

  useEffect(() => () => {
    currentLocationMarkerRef.current = null;
    scooterMarkersRef.current = [];
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
          <div className="location-map__viewport" ref={mapContainerRef} role="region" aria-label="현재 위치와 주변 킥보드가 표시된 지도" />
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
