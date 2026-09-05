import { LocalRideSessionService } from "./LocalRideSessionService";

export interface PrototypeFareConfig {
  baseFareAmount: number;
  perMinuteFareAmount: number;
  currencyCode: string;
  averageSpeedKmh?: number;
}

const DEFAULT_FARE_CONFIG: PrototypeFareConfig = {
  baseFareAmount: 1000,
  perMinuteFareAmount: 150,
  currencyCode: "KRW",
  averageSpeedKmh: 14,
};

/**
 * No billing or GPS backend exists yet, so this layers a plausible distance
 * and fare on top of the honest elapsed-time clock `LocalRideSessionService`
 * already provides. Kept as a subclass instead of changing that class, since
 * its whole point is to stay `null` until a real integration exists.
 */
export class PrototypeRideSessionService extends LocalRideSessionService {
  private fareConfig: PrototypeFareConfig | null = null;
  private simulationTimer: ReturnType<typeof setInterval> | null = null;

  confirmStarted(rideId: string | null = null, fareConfig?: PrototypeFareConfig): void {
    super.confirmStarted(rideId);
    this.fareConfig = fareConfig ?? DEFAULT_FARE_CONFIG;
    this.startSimulation();
  }

  endConfirmedRide(): void {
    this.stopSimulation();
    super.endConfirmedRide();
  }

  async disconnect(): Promise<void> {
    this.stopSimulation();
    await super.disconnect();
  }

  private startSimulation(): void {
    this.stopSimulation();
    this.simulationTimer = setInterval(() => this.tick(), 1_000);
  }

  private tick(): void {
    const snapshot = this.getSnapshot();
    if (snapshot.status !== "riding" || snapshot.elapsedSeconds === null) return;
    const config = this.fareConfig ?? DEFAULT_FARE_CONFIG;
    const hours = snapshot.elapsedSeconds / 3_600;
    const distanceKm = Math.round(hours * (config.averageSpeedKmh ?? DEFAULT_FARE_CONFIG.averageSpeedKmh!) * 100) / 100;
    const minutes = Math.max(1, Math.ceil(snapshot.elapsedSeconds / 60));
    const fareAmount = config.baseFareAmount + minutes * config.perMinuteFareAmount;
    this.applyActualTelemetry({ distanceKm, fareAmount, currencyCode: config.currencyCode });
  }

  private stopSimulation(): void {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    this.simulationTimer = null;
  }
}
