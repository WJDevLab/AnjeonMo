import type { Metadata } from "next";
import { ScooterApp } from "../ScooterApp";

export const metadata: Metadata = {
  title: "앱 이름 | 안전 전동킥보드",
  description: "헬멧과 발 위치를 확인한 뒤 시작하는 전동킥보드 모바일 웹",
};

export default function AppRoute() {
  return <ScooterApp />;
}
