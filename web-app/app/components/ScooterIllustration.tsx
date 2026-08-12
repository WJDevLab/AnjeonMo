export function ScooterIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`scooter-illustration ${compact ? "is-compact" : ""}`} role="img" aria-label="전동킥보드 일러스트">
      <span className="scooter-halo" aria-hidden="true" />
      <span className="scooter-handle" aria-hidden="true" />
      <span className="scooter-stem" aria-hidden="true" />
      <span className="scooter-deck" aria-hidden="true" />
      <span className="scooter-wheel scooter-wheel-front" aria-hidden="true" />
      <span className="scooter-wheel scooter-wheel-back" aria-hidden="true" />
      <span className="scooter-accent" aria-hidden="true" />
    </div>
  );
}
