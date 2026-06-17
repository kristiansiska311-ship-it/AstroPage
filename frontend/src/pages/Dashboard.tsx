import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getHomeworkStatus,
  homeworkData,
  todaySchedule,
  type Period,
} from "../data/mock";

function getScheduleState(p: Period): "past" | "now" | "cancelled" | "normal" {
  if (p.status === "cancelled") return "cancelled";
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (hm > p.end) return "past";
  if (hm >= p.start) return "now";
  return "normal";
}

function skDate(): string {
  return new Date().toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user } = useAuth();

  const pending = homeworkData.filter((hw) => !hw.submitted);
  const urgent = pending.filter((hw) => getHomeworkStatus(hw) === "due-soon");
  const firstName = (user?.username ?? "Študent").split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div style={{ padding: "36px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(176,141,87,0.5)",
            marginBottom: 6,
          }}
        >
          {skDate()}
        </div>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 34,
            fontWeight: 500,
            color: "#E8DCC7",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          Dobrý deň,{" "}
          <em style={{ fontStyle: "italic", color: "#B08D57" }}>{displayName}.</em>
        </div>
      </div>

      {/* Urgent banner */}
      {urgent.length > 0 && (
        <Link
          to="/homework"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              background: "rgba(120,88,32,0.14)",
              border: "1px solid rgba(140,106,48,0.3)",
              borderRadius: 8,
              padding: "11px 16px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#d4a85a",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#d4a85a" }}>
                {urgent.length === 1
                  ? "1 úloha splatná do 24 hodín"
                  : `${urgent.length} úlohy splatné do 24 hodín`}
              </span>
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(212,168,90,0.65)",
              }}
            >
              Otvoriť →
            </div>
          </div>
        </Link>
      )}

      {/* Metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 32,
        }}
      >
        <MetricCard
          dot="#B08D57"
          dotLabelColor="rgba(176,141,87,0.55)"
          label="Pending tasks"
          value={String(pending.length)}
          sub="aktívne úlohy"
        />
        <MetricCard
          dot="#4a8c62"
          dotLabelColor="rgba(74,140,98,0.65)"
          label="Dochádzka"
          value="94%"
          sub="tento semester"
        />
        <MetricCard
          dot="#4a7a8c"
          dotLabelColor="rgba(74,122,140,0.65)"
          label="Posledná známka"
          value="B+"
          sub="Fyzika · nedávno"
        />
      </div>

      {/* Schedule section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(176,141,87,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          Dnešný rozvrh
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(176,141,87,0.1)" }} />
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {todaySchedule.map((p) => (
          <ScheduleItem key={p.period} period={p} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  dot,
  dotLabelColor,
  label,
  value,
  sub,
}: {
  dot: string;
  dotLabelColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "#161208",
        border: "1px solid rgba(176,141,87,0.14)",
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: dotLabelColor,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 40,
          fontWeight: 400,
          color: "#E8DCC7",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: "rgba(232,220,199,0.32)",
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function ScheduleItem({ period }: { period: Period }) {
  const state = getScheduleState(period);

  const dotColor =
    state === "now" ? "#B08D57" :
    state === "cancelled" ? "rgba(232,220,199,0.15)" :
    "rgba(176,141,87,0.32)";

  const cardBg =
    state === "now" ? "rgba(176,141,87,0.12)" : "rgba(232,220,199,0.03)";

  const cardBorder =
    state === "now" ? "rgba(176,141,87,0.32)" : "rgba(176,141,87,0.12)";

  const subjColor =
    state === "cancelled" ? "rgba(232,220,199,0.28)" :
    state === "now" ? "#E8DCC7" :
    "rgba(232,220,199,0.75)";

  const badge =
    state === "now" ? { text: "Teraz", bg: "#B08D57", color: "#0a0805" } :
    state === "cancelled" ? { text: "Zrušená", bg: "rgba(100,48,48,0.2)", color: "#c88888" } :
    period.status === "modified" ? { text: "Zmenená", bg: "rgba(110,78,20,0.2)", color: "#d4a85a" } :
    null;

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 13,
          flexShrink: 0,
          width: 14,
        }}
      >
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          padding: "11px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
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
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: 3,
                  background: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.text}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: "rgba(232,220,199,0.3)",
              letterSpacing: "0.05em",
            }}
          >
            {period.room} · {period.teacher}
          </div>
          {period.note && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "rgba(232,220,199,0.35)",
                marginTop: 3,
              }}
            >
              {period.note}
            </div>
          )}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "rgba(232,220,199,0.38)",
            letterSpacing: "0.04em",
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {period.start}–{period.end}
        </div>
      </div>
    </div>
  );
}
