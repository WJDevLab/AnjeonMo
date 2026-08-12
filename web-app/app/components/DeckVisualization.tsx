"use client";

import { Footprints } from "lucide-react";
import type { FootPosition, PressureRegion } from "../types/sensor";

interface DeckVisualizationProps {
  regions: readonly PressureRegion[] | null;
  feet: readonly FootPosition[] | null;
  status: "neutral" | "checking" | "normal" | "attention" | "error";
}

function percent(value: number) {
  return `${Math.max(0, Math.min(1, value)) * 100}%`;
}

export function DeckVisualization({ regions, feet, status }: DeckVisualizationProps) {
  return (
    <div className={`deck-visualization is-${status}`} role="img" aria-label="킥보드 데크 위 발 위치 감지 상태">
      <div className="deck-caption">앞</div>
      <div className="deck-body">
        <div className="deck-sensor-line" aria-hidden="true" />
        {(regions ?? []).map((region) => (
          <span
            className="pressure-region"
            key={region.id}
            style={{
              top: percent(region.startRatio),
              height: percent(Math.max(0.04, region.endRatio - region.startRatio)),
              opacity: region.intensityRatio === null ? undefined : Math.max(0.28, region.intensityRatio),
            }}
            aria-hidden="true"
          />
        ))}
        {(feet ?? []).map((foot) => (
          <span
            className={`foot-position foot-${foot.role}`}
            key={foot.id}
            style={{ top: percent(foot.longitudinalRatio) }}
            aria-hidden="true"
          >
            <Footprints />
          </span>
        ))}
      </div>
      <div className="deck-caption">뒤</div>
      <span className="sr-only">
        {feet === null ? "발 위치 정보를 기다리고 있어요" : feet.length === 0 ? "감지된 발 위치가 없어요" : "발 위치가 데크 위에 표시됐어요"}
      </span>
    </div>
  );
}
