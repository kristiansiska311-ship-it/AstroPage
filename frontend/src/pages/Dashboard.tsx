import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, type DashboardPeriod, type DashboardSummary } from "../api/client";
import { useCachedResource } from "../api/useCachedResource";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import RefreshButton from "../components/RefreshButton";

const DASHBOARD_CACHE_KEY = "dashboard";

type ScheduleState = "past" | "now" | "cancelled" | "normal";

function getScheduleState(p: DashboardPeriod): ScheduleState {
  if (p.isCancelled) return "cancelled";
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (hm > p.end) return "past";
  if (hm >= p.start) return "now";
  return "normal";
}

function localeDate(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t, locale } = useT();
  const isMobile = useIsMobile();

  const { data: summary, loading, refreshing, error, lastUpdated, refresh } =
    useCachedResource<DashboardSummary>(DASHBOARD_CACHE_KEY, api.getDashboard, {
      errorFallback: t("dashboard.loadError"),
    });

  const firstName = (user?.username ?? t("common.student")).split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#CC2B2B",
              marginBottom: 6,
            }}
          >
            {localeDate(locale)}
          </div>
          <div
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 34,
              fontWeight: 400,
              color: "#131313",
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            {(() => {
              const [before, after] = t("dashboard.greeting").split("{name}");
              return (
                <>
                  {before}
                  <em style={{ fontStyle: "italic", color: "#CC2B2B" }}>{displayName}</em>
                  {after}
                </>
              );
            })()}
          </div>
        </div>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} lastUpdated={lastUpdated} />
      </div>

      {error ? (
        <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.35)", margin: "6px 0 0" }}>
            {t("common.retryOrLogin")}
          </p>
        </div>
      ) : loading || !summary ? (
        <DashboardSkeleton />
      ) : (
        <DashboardBody summary={summary} />
      )}
    </div>
  );
}

function DashboardBody({ summary }: { summary: DashboardSummary }) {
  const { t, tn } = useT();
  const { dueWithin24h, pendingHomework, lessonsTotal, lessonsCancelled, schedule, scheduleAvailable } = summary;

  return (
    <>
      {/* Urgent banner */}
      {dueWithin24h > 0 && (
        <Link to="/homework" style={{ textDecoration: "none" }}>
          <div
            style={{
              background: "rgba(180,83,9,0.06)",
              border: "1px solid rgba(180,83,9,0.22)",
              borderRadius: 6,
              padding: "11px 16px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#B45309", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#B45309" }}>
                {tn("dashboard.dueBanner", dueWithin24h)}
              </span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(180,83,9,0.65)" }}>
              {t("dashboard.open")}
            </div>
          </div>
        </Link>
      )}

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        <MetricCard
          accentColor={pendingHomework === 0 ? "#16A34A" : "#CC2B2B"}
          label={t("dashboard.activeTasks")}
          value={String(pendingHomework)}
          sub={pendingHomework === 0 ? t("dashboard.allDone") : t("dashboard.unfinishedTasks")}
        />
        <MetricCard
          accentColor={dueWithin24h > 0 ? "#B45309" : "#16A34A"}
          label={t("dashboard.due24")}
          value={String(dueWithin24h)}
          sub={dueWithin24h > 0 ? t("dashboard.needsAttention") : t("dashboard.noRush")}
        />
        <MetricCard
          accentColor="#1D4ED8"
          label={t("dashboard.todayLessons")}
          value={String(lessonsTotal)}
          sub={lessonsCancelled > 0 ? tn("dashboard.cancelledN", lessonsCancelled) : t("dashboard.noneCancelled")}
        />
      </div>

      {/* Schedule section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(19,19,19,0.40)", whiteSpace: "nowrap" }}>
          {t("dashboard.todaySchedule")}
        </div>
        <div style={{ flex: 1, height: 1, background: "#E5E3DC" }} />
      </div>

      {/* Timeline */}
      {schedule.length === 0 ? (
        <div style={{ border: "1px dashed #E5E3DC", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(19,19,19,0.28)", margin: 0 }}>
            {scheduleAvailable ? t("dashboard.noLessonsToday") : t("dashboard.scheduleLoadFailed")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {schedule.map((p, i) => (
            <ScheduleItem key={p.period ?? `p-${i}`} period={p} />
          ))}
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ height: 112, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ height: 58, background: "rgba(0,0,0,0.04)", borderRadius: 6, border: "1px solid #E5E3DC" }} />
        ))}
      </div>
    </>
  );
}

function MetricCard({
  accentColor,
  label,
  value,
  sub,
}: {
  accentColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E3DC", borderRadius: 8, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 16, background: accentColor, borderRadius: 1, flexShrink: 0 }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(19,19,19,0.45)" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 400, color: "#131313", lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.40)", marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
}

function ScheduleItem({ period }: { period: DashboardPeriod }) {
  const { t } = useT();
  const state = getScheduleState(period);

  const dotColor =
    state === "now" ? "#CC2B2B" :
    state === "cancelled" ? "rgba(19,19,19,0.15)" :
    "#E5E3DC";

  const cardBg = state === "now" ? "rgba(204,43,43,0.05)" : "#FFFFFF";
  const cardBorder = state === "now" ? "rgba(204,43,43,0.20)" : "#E5E3DC";

  const subjColor =
    state === "cancelled" ? "rgba(19,19,19,0.30)" :
    state === "past" ? "rgba(19,19,19,0.40)" :
    "#131313";

  const badge =
    state === "now" ? { text: t("dashboard.now"), bg: "#CC2B2B", color: "#FFFFFF" } :
    state === "cancelled" ? { text: t("common.cancelled"), bg: "rgba(220,38,38,0.08)", color: "#DC2626" } :
    null;

  const meta = [period.classroom, period.teacher].filter(Boolean).join(" · ");

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, flexShrink: 0, width: 12 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      </div>
      <div
        style={{
          flex: 1,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 6,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: subjColor,
                textDecoration: state === "cancelled" ? "line-through" : undefined,
              }}
            >
              {period.subject}
            </span>
            {badge && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.10em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, background: badge.bg, color: badge.color }}>
                {badge.text}
              </span>
            )}
          </div>
          {meta && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(19,19,19,0.35)", letterSpacing: "0.04em" }}>
              {meta}
            </div>
          )}
          {period.curriculum && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.40)", marginTop: 2 }}>
              {period.curriculum}
            </div>
          )}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(19,19,19,0.40)", letterSpacing: "0.02em", flexShrink: 0, marginLeft: 12 }}>
          {period.start}–{period.end}
        </div>
      </div>
    </div>
  );
}
