"use client";

import { ArrowRight, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell, PrimaryButton } from "../components/AppShell";
import { ScooterIllustration } from "../components/ScooterIllustration";
import { ROUTES } from "../config/app";

export function WelcomePage() {
  const navigate = useNavigate();
  return (
    <AppShell className="welcome-stage">
      <div className="welcome-page">
        <div className="brand-symbol" role="img" aria-label="임시 로고 심볼">
          <Route aria-hidden="true" />
        </div>
        <div className="welcome-copy">
          <h1>한 사람만,<br />더 안전하게</h1>
          <p>압력센서와 헬멧 감지로<br />안전한 킥보드 탑승을 시작하세요</p>
        </div>
        <div className="welcome-art">
          <span className="city-shape city-shape-one" aria-hidden="true" />
          <span className="city-shape city-shape-two" aria-hidden="true" />
          <ScooterIllustration />
        </div>
        <div className="page-indicator" aria-label="첫 번째 안내 화면">
          <span className="is-active" />
          <span />
          <span />
        </div>
        <div className="welcome-actions">
          <PrimaryButton onClick={() => navigate(ROUTES.home)}>
            시작하기 <ArrowRight aria-hidden="true" />
          </PrimaryButton>
          <p>안전하게 타고, 안심하고 이동하세요</p>
        </div>
      </div>
    </AppShell>
  );
}
