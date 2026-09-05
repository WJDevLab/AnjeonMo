"use client";

interface TrendPoint {
  dateKey: string;
  distanceKm: number;
}

export function MonthlyTrendChart({ points }: { points: readonly TrendPoint[] }) {
  const max = Math.max(...points.map((point) => point.distanceKm), 0.1);

  return (
    <div className="trend-chart" role="img" aria-label="선택한 기간의 일별 주행 거리 추이">
      <div className="trend-chart-bars">
        {points.map((point) => {
          const heightPercent = Math.max(6, (point.distanceKm / max) * 100);
          const day = Number(point.dateKey.slice(-2));
          return (
            <div className="trend-bar-column" key={point.dateKey}>
              {point.distanceKm === max ? <span className="trend-bar-value">{point.distanceKm}km</span> : null}
              <span
                className="trend-bar"
                style={{ height: `${heightPercent}%` }}
                title={`${day}일 · ${point.distanceKm}km`}
                aria-label={`${day}일 ${point.distanceKm}킬로미터`}
              />
              <span className="trend-bar-label">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
