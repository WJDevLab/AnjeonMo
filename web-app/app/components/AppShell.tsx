"use client";

import type { ReactNode } from "react";
import { ChevronLeft, History, Home, UserRound, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "../config/app";

interface AppShellProps {
  children: ReactNode;
  bottomNavigation?: boolean;
  className?: string;
}

export function AppShell({ children, bottomNavigation = false, className = "" }: AppShellProps) {
  return (
    <div className={`app-stage ${className}`.trim()}>
      <main className={`app-scroll ${bottomNavigation ? "has-bottom-nav" : ""}`.trim()}>{children}</main>
      {bottomNavigation ? <BottomNavigation /> : null}
    </div>
  );
}

interface TopBarProps {
  title: string;
  back?: boolean;
  right?: ReactNode;
  eyebrow?: string;
}

export function TopBar({ title, back = false, right, eyebrow }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="top-bar">
      <div className="top-bar-side">
        {back ? (
          <button className="icon-button" type="button" aria-label="이전 화면으로 이동" onClick={() => navigate(-1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
        ) : (
          <span className="top-bar-spacer" aria-hidden="true" />
        )}
      </div>
      <div className="top-bar-title-wrap">
        {eyebrow ? <span className="top-bar-eyebrow">{eyebrow}</span> : null}
        <h1 className="top-bar-title">{title}</h1>
      </div>
      <div className="top-bar-side top-bar-side-right">{right ?? <span className="top-bar-spacer" aria-hidden="true" />}</div>
    </header>
  );
}

export function BottomNavigation() {
  const items = [
    { to: ROUTES.home, label: "홈", icon: Home },
    { to: ROUTES.history, label: "이용내역", icon: History },
    { to: ROUTES.friends, label: "친구", icon: Users },
    { to: ROUTES.profile, label: "내 정보", icon: UserRound },
  ];

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} className={({ isActive }) => `bottom-nav-item ${isActive ? "is-active" : ""}`} to={to}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function SurfaceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card ${className}`.trim()}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, disabled = false, onClick, type = "button", ariaDescribedBy }: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  ariaDescribedBy?: string;
}) {
  return (
    <button className="primary-button" type={type} disabled={disabled} onClick={onClick} aria-describedby={ariaDescribedBy}>
      {children}
    </button>
  );
}
