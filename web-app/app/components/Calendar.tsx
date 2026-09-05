"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, HardHat } from "lucide-react";
import { addMonths, toDateKey } from "../utils/date";

interface CalendarProps {
  markedDates: ReadonlySet<string>;
  selectedDate: string;
  onSelectDate(dateKey: string): void;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function buildMonthGrid(viewDate: Date): Array<Date | null> {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function Calendar({ markedDates, selectedDate, onSelectDate }: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, 1);
  });

  const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const todayKey = toDateKey(new Date());

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" aria-label="이전 달" onClick={() => setViewDate((current) => addMonths(current, -1))}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <strong>{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</strong>
        <button type="button" className="calendar-nav" aria-label="다음 달" onClick={() => setViewDate((current) => addMonths(current, 1))}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="calendar-grid">
        {cells.map((cell, index) => {
          if (cell === null) return <span key={`empty-${index}`} className="calendar-cell is-empty" aria-hidden="true" />;
          const dateKey = toDateKey(cell);
          const isSelected = dateKey === selectedDate;
          const hasRecord = markedDates.has(dateKey);
          return (
            <button
              key={dateKey}
              type="button"
              className={`calendar-cell ${isSelected ? "is-selected" : ""} ${dateKey === todayKey ? "is-today" : ""}`}
              aria-pressed={isSelected}
              aria-label={`${cell.getMonth() + 1}월 ${cell.getDate()}일${hasRecord ? " 이용 기록 있음" : ""}`}
              onClick={() => onSelectDate(dateKey)}
            >
              <span>{cell.getDate()}</span>
              {hasRecord ? <HardHat className="calendar-mark" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
