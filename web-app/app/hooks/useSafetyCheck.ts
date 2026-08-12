"use client";

import { useEffect, useRef, useState } from "react";

import type {
  OverallSafetyStatus,
  SensorIssueSource,
  SensorSnapshot,
} from "@/app/types/sensor";

export const DEFAULT_SAFETY_STABLE_DURATION_MS = 2_500;
export const DEFAULT_SUCCESS_DISPLAY_DURATION_MS = 700;

export interface UseSafetyCheckOptions {
  active: boolean;
  stableDurationMs?: number;
  successDisplayDurationMs?: number;
  onSuccess?: () => void;
}

export interface SafetyCheckResult {
  status: OverallSafetyStatus;
  progress: number;
  helmetComplete: boolean;
  footComplete: boolean;
  blockingIssueCodes: readonly string[];
}

type GateClassification = OverallSafetyStatus | "eligible";

function hasSourceIssue(
  snapshot: SensorSnapshot,
  source: SensorIssueSource,
): boolean {
  return snapshot.issues.some((issue) => issue.source === source);
}

function classify(snapshot: SensorSnapshot): GateClassification {
  if (snapshot.safetyStatus === "riding") return "riding";

  if (
    snapshot.helmetConnectionStatus === "unknown" ||
    snapshot.deckConnectionStatus === "unknown" ||
    snapshot.helmetConnectionStatus === "connecting" ||
    snapshot.deckConnectionStatus === "connecting"
  ) {
    return "connecting";
  }

  if (
    snapshot.helmetConnectionStatus === "disconnected" ||
    snapshot.deckConnectionStatus === "disconnected" ||
    snapshot.helmetConnectionStatus === "error" ||
    snapshot.deckConnectionStatus === "error" ||
    snapshot.issues.length > 0 ||
    ["sensorUnavailable", "stale", "error"].includes(
      snapshot.helmetStatus,
    ) ||
    ["sensorUnavailable", "stale", "error"].includes(
      snapshot.footDetectionStatus,
    )
  ) {
    return "error";
  }

  if (
    snapshot.helmetStatus === "notWorn" ||
    [
      "multiplePressureRegions",
      "multipleRiderSuspected",
      "positionInvalid",
    ].includes(snapshot.footDetectionStatus)
  ) {
    return "attentionRequired";
  }

  if (
    snapshot.helmetConnectionStatus === "connected" &&
    snapshot.deckConnectionStatus === "connected" &&
    snapshot.helmetStatus === "worn" &&
    snapshot.footDetectionStatus === "normal" &&
    snapshot.helmetReceivedAt !== null &&
    snapshot.deckReceivedAt !== null
  ) {
    return "eligible";
  }

  return "checking";
}

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function useSafetyCheck(
  snapshot: SensorSnapshot,
  options: UseSafetyCheckOptions,
): SafetyCheckResult {
  const stableDurationMs =
    options.stableDurationMs ?? DEFAULT_SAFETY_STABLE_DURATION_MS;
  const successDisplayDurationMs =
    options.successDisplayDurationMs ?? DEFAULT_SUCCESS_DISPLAY_DURATION_MS;
  const onSuccessRef = useRef(options.onSuccess);
  const latestSnapshotRef = useRef(snapshot);
  const stableSinceRef = useRef<number | null>(null);
  const initialHelmetReceiptRef = useRef<string | null>(null);
  const initialDeckReceiptRef = useRef<string | null>(null);
  const freshHelmetObservedRef = useRef(false);
  const freshDeckObservedRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successScheduledRef = useRef(false);
  const [state, setState] = useState<Pick<SafetyCheckResult, "status" | "progress">>(
    { status: "checking", progress: 0 },
  );

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
  }, [options.onSuccess]);

  useEffect(() => {
    let animationFrame: number | null = null;

    const cancelSuccessTimer = (): void => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
      successScheduledRef.current = false;
    };

    const resetStableWindow = (): void => {
      stableSinceRef.current = null;
      initialHelmetReceiptRef.current = null;
      initialDeckReceiptRef.current = null;
      freshHelmetObservedRef.current = false;
      freshDeckObservedRef.current = false;
      cancelSuccessTimer();
    };

    if (!options.active) {
      resetStableWindow();
      return;
    }

    const classification = classify(snapshot);
    if (classification !== "eligible") {
      resetStableWindow();
      return;
    }

    if (stableSinceRef.current === null) {
      stableSinceRef.current = monotonicNow();
      initialHelmetReceiptRef.current = snapshot.helmetReceivedAt;
      initialDeckReceiptRef.current = snapshot.deckReceivedAt;
      freshHelmetObservedRef.current = false;
      freshDeckObservedRef.current = false;
    } else {
      if (snapshot.helmetReceivedAt !== initialHelmetReceiptRef.current) {
        freshHelmetObservedRef.current = true;
      }
      if (snapshot.deckReceivedAt !== initialDeckReceiptRef.current) {
        freshDeckObservedRef.current = true;
      }
    }

    const updateProgress = (): void => {
      const currentSnapshot = latestSnapshotRef.current;
      if (classify(currentSnapshot) !== "eligible") return;

      const startedAt = stableSinceRef.current;
      if (startedAt === null) return;
      const elapsed = monotonicNow() - startedAt;
      const progress = Math.min(1, Math.max(0, elapsed / stableDurationMs));
      const hasContinuousFreshData =
        freshHelmetObservedRef.current && freshDeckObservedRef.current;

      if (progress >= 1 && hasContinuousFreshData) {
        setState({ status: "success", progress: 1 });
        if (!successScheduledRef.current) {
          successScheduledRef.current = true;
          successTimerRef.current = setTimeout(() => {
            if (classify(latestSnapshotRef.current) === "eligible") {
              onSuccessRef.current?.();
            }
          }, successDisplayDurationMs);
        }
        return;
      }

      setState({ status: "checking", progress });
      animationFrame = requestAnimationFrame(updateProgress);
    };

    animationFrame = requestAnimationFrame(updateProgress);
    return () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  }, [
    options.active,
    snapshot,
    stableDurationMs,
    successDisplayDurationMs,
  ]);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  const helmetComplete =
    snapshot.helmetConnectionStatus === "connected" &&
    snapshot.helmetStatus === "worn" &&
    !hasSourceIssue(snapshot, "helmetBluetooth");
  const footComplete =
    snapshot.deckConnectionStatus === "connected" &&
    snapshot.footDetectionStatus === "normal" &&
    !hasSourceIssue(snapshot, "deckWifi");

  const immediateClassification: GateClassification = options.active
    ? classify(snapshot)
    : "idle";
  const renderedState =
    immediateClassification === "eligible"
      ? state.status === "checking" || state.status === "success"
        ? state
        : { status: "checking" as const, progress: 0 }
      : { status: immediateClassification, progress: 0 };

  return {
    ...renderedState,
    helmetComplete,
    footComplete,
    blockingIssueCodes: snapshot.issues.map((issue) => issue.code),
  };
}
