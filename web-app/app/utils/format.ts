export function formatMetric(value: number | null, unit: string): string {
  return value === null ? "—" : `${value.toLocaleString("ko-KR")} ${unit}`;
}

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function formatFare(amount: number | null, currencyCode: string | null): string {
  if (amount === null || currencyCode === null) return "—";
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return "—";
  }
}
