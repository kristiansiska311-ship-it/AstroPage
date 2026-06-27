import { useState } from "react";
import { api, type DashboardPeriod, type TimetableDay, type TimetableWeek } from "../api/client";
import { useCachedResource } from "../api/useCachedResource";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import RefreshButton from "../components/RefreshButton";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const cacheKey = (offset: number) => `timetable:${offset}`;

function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function weekRangeLabel(weekStartIso: string, locale: string): string {
  const mon = parseDay(weekStartIso);
  const fri = new Date(mon);
  fri.setDate(fri.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}

function offsetLabel(offset: number, t: Translate): string {
  if (offset === 0) return t("timetable.thisWeek");
  if (offset === 1) return t("timetable.nextWeek");
  if (offset === -1) return t("timetable.lastWeek");
  return offset > 0 ? t("timetable.inWeeks", { n: offset }) : t("timetable.weeksAgo", { n: -offset });
}

const eyebrow: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#CC2B2B",
};

export default function TimetablePage() {
  const { t, locale } = useT();
  const isMobile = useIsMobile();
  const [offset, setOffset] = useState(0);

  const { data: week, refreshing, error, lastUpdated, refresh } = useCachedResource<TimetableWeek>(
    cacheKey(offset),
    () => api.getTimetable(offset),
    { errorFallback: t("timetable.loadError") },
  );

  const loading = !error && (week == null || week.weekOffset !== offset);

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...eyebrow, marginBottom: 6 }}>{offsetLabel(offset, t)}</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400, color: "#131313", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
            {t("timetable.title")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <RefreshButton onRefresh={refresh} refreshing={refreshing} lastUpdated={lastUpdated} />
          <WeekNav
            label={week ? weekRangeLabel(week.weekStart, locale) : "—"}
            offset={offset}
            onPrev={() => setOffset((o) => o - 1)}
            onNext={() => setOffset((o) => o + 1)}
            onToday={() => setOffset(0)}
          />
        </div>
      </div>

      {error ? (
        <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.35)", margin: "6px 0 0" }}>
            {t("common.retryOrLogin")}
          </p>
        </div>
      ) : loading || !week ? (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(140px, 1fr))", gap: 8, minWidth: isMobile ? 700 : undefined }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: 360, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(140px, 1fr))", gap: 8, minWidth: isMobile ? 700 : undefined }}>
            {week.days.map((day) => (
              <DayColumn key={day.date} day={day} isWeekViewable={offset === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeekNav({
  label,
  offset,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const { t } = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {offset !== 0 && (
        <button type="button" onClick={onToday} style={pillBtn(false)}>
          {t("timetable.today")}
        </button>
      )}
      <button type="button" onClick={onPrev} aria-label={t("timetable.prevWeek")} style={arrowBtn}>‹</button>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#131313", letterSpacing: "0.02em", minWidth: 120, textAlign: "center" }}>
        {label}
      </span>
      <button type="button" onClick={onNext} aria-label={t("timetable.nextWeekAria")} style={arrowBtn}>›</button>
    </div>
  );
}

const arrowBtn: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 30,
  height: 30,
  borderRadius: 4,
  border: "1px solid #E5E3DC",
  background: "#FFFFFF",
  color: "rgba(19,19,19,0.60)",
  cursor: "pointer",
  fontFamily: "'DM Mono', monospace",
  fontSize: 16,
  lineHeight: 1,
};

function pillBtn(active: boolean): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 4,
    background: active ? "rgba(204,43,43,0.07)" : "#FFFFFF",
    border: `1px solid ${active ? "rgba(204,43,43,0.25)" : "#E5E3DC"}`,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: active ? "#CC2B2B" : "rgba(19,19,19,0.50)",
  };
}

function DayColumn({ day, isWeekViewable }: { day: TimetableDay; isWeekViewable: boolean }) {
  const { t, locale } = useT();
  const d = parseDay(day.date);
  const dayName = d.toLocaleDateString(locale, { weekday: "long" }).toUpperCase();
  const dateStr = `${d.getDate()}.${d.getMonth() + 1}.`;
  const isToday = isWeekViewable && day.date === todayIso();

  const sorted = [...day.periods].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div
      style={{
        background: isToday ? "rgba(204,43,43,0.04)" : "#FFFFFF",
        border: `1px solid ${isToday ? "rgba(204,43,43,0.22)" : "#E5E3DC"}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${isToday ? "rgba(204,43,43,0.14)" : "#E5E3DC"}` }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.10em", textTransform: "uppercase", color: isToday ? "#CC2B2B" : "rgba(19,19,19,0.35)", marginBottom: 2 }}>
          {dayName}
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#131313", fontWeight: 400 }}>
          {dateStr}
        </div>
      </div>

      {!day.available ? (
        <Placeholder text={t("timetable.unavailable")} />
      ) : sorted.length === 0 ? (
        <Placeholder text={t("timetable.noLessons")} />
      ) : (
        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {sorted.map((p, i) => (
            <PeriodCard key={p.period ?? `p-${i}`} period={p} highlightNow={isToday} />
          ))}
        </div>
      )}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div style={{ padding: "28px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(19,19,19,0.20)" }}>
        {text}
      </div>
    </div>
  );
}

function PeriodCard({ period, highlightNow }: { period: DashboardPeriod; highlightNow: boolean }) {
  const { t } = useT();
  const hm = nowHm();
  const isNow = highlightNow && !period.isCancelled && period.start <= hm && hm <= period.end;
  const meta = [period.classroom, period.teacher].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        borderRadius: 5,
        border: `1px solid ${isNow ? "rgba(204,43,43,0.25)" : "#E5E3DC"}`,
        background: isNow ? "rgba(204,43,43,0.05)" : "transparent",
        padding: "7px 9px",
        opacity: period.isCancelled ? 0.55 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: period.isCancelled ? "rgba(19,19,19,0.35)" : "#131313",
            textDecoration: period.isCancelled ? "line-through" : undefined,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {period.period != null ? `${period.period}. ` : ""}{period.subject}
        </span>
        {isNow && (
          <span style={{ flexShrink: 0, fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 5px", borderRadius: 3, background: "#CC2B2B", color: "#FFFFFF" }}>
            {t("dashboard.now")}
          </span>
        )}
        {period.isCancelled && (
          <span style={{ flexShrink: 0, fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 5px", borderRadius: 3, background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
            {t("common.cancelled")}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(19,19,19,0.38)", letterSpacing: "0.02em" }}>
        {period.start}–{period.end}
      </div>
      {meta && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(19,19,19,0.28)", letterSpacing: "0.02em", marginTop: 2 }}>
          {meta}
        </div>
      )}
    </div>
  );
}
