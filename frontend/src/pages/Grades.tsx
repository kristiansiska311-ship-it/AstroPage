import { useMemo, useState } from "react";
import { api, type Grade, type SubjectGrades } from "../api/client";
import { useCachedResource } from "../api/useCachedResource";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import RefreshButton from "../components/RefreshButton";

interface SimGrade extends Grade {
  simulated: boolean;
  hidden: boolean;
}

const GRADES_CACHE_KEY = "grades";

interface GradeTone {
  text: string;
  bg: string;
  border: string;
}

const TONES: GradeTone[] = [
  { text: "#16A34A", bg: "rgba(22,163,74,0.08)",  border: "rgba(22,163,74,0.28)"  }, // 1 best
  { text: "#65A30D", bg: "rgba(101,163,13,0.08)", border: "rgba(101,163,13,0.28)" }, // 2
  { text: "#CA8A04", bg: "rgba(202,138,4,0.08)",  border: "rgba(202,138,4,0.28)"  }, // 3
  { text: "#EA580C", bg: "rgba(234,88,12,0.08)",  border: "rgba(234,88,12,0.28)"  }, // 4
  { text: "#DC2626", bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.28)"  }, // 5 worst
];

const NEUTRAL_TONE: GradeTone = {
  text: "rgba(19,19,19,0.45)",
  bg: "rgba(0,0,0,0.04)",
  border: "rgba(0,0,0,0.12)",
};

function isAbsent(value: string): boolean {
  return value.trim().toUpperCase() === "A";
}

function classicNumeric(value: string): number {
  return isAbsent(value) ? 5 : Number(value);
}

function classicTone(value: string): GradeTone {
  if (isAbsent(value)) return TONES[4];
  const n = Number(value);
  if (n >= 1 && n <= 5) return TONES[n - 1];
  return NEUTRAL_TONE;
}

function percentTone(pct: number): GradeTone {
  if (pct >= 90) return TONES[0];
  if (pct >= 75) return TONES[1];
  if (pct >= 60) return TONES[2];
  if (pct >= 45) return TONES[3];
  return TONES[4];
}

function gradePercent(g: Pick<Grade, "value" | "maxPoints">): number {
  if (isAbsent(g.value)) return 0;
  if (g.maxPoints == null || g.maxPoints <= 0) return 100;
  return (Number(g.value) / g.maxPoints) * 100;
}

function toneFor(g: Pick<Grade, "value" | "maxPoints">): GradeTone {
  return g.maxPoints != null ? percentTone(gradePercent(g)) : classicTone(g.value);
}

function liveAverage(grades: SimGrade[], isPoints: boolean): number | null {
  const active = grades.filter((g) => !g.hidden);
  if (isPoints) {
    let earned = 0;
    let max = 0;
    for (const g of active) {
      if (g.maxPoints == null) continue;
      const v = isAbsent(g.value) ? 0 : Number(g.value);
      if (Number.isNaN(v)) continue;
      earned += v;
      max += g.maxPoints;
    }
    if (max <= 0) return null;
    return Math.round((earned / max) * 10000) / 100;
  }
  let totalWeight = 0;
  let total = 0;
  for (const g of active) {
    const v = classicNumeric(g.value);
    if (Number.isNaN(v) || g.weight <= 0) continue;
    total += v * g.weight;
    totalWeight += g.weight;
  }
  if (totalWeight === 0) return null;
  return Math.round((total / totalWeight) * 100) / 100;
}

function formatAverage(avg: number | null, isPoints: boolean): string {
  if (avg === null) return "—";
  return isPoints ? `${Math.round(avg)} %` : avg.toFixed(2);
}

const eyebrow: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#CC2B2B",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(19,19,19,0.45)",
  marginBottom: 5,
};

export default function GradesPage() {
  const { t } = useT();
  const isMobile = useIsMobile();
  const { data, loading, refreshing, error, lastUpdated, refresh } =
    useCachedResource<SubjectGrades[]>(GRADES_CACHE_KEY, api.listGrades, {
      errorFallback: t("grades.loadError"),
    });
  const subjects = useMemo(() => data ?? [], [data]);
  const [picked, setPicked] = useState<string | null>(null);
  const desktopSelected = picked ?? subjects[0]?.subjectName ?? null;

  const desktopSubject = useMemo(
    () => subjects.find((s) => s.subjectName === desktopSelected) ?? null,
    [subjects, desktopSelected],
  );

  function toggleMobile(name: string) {
    setPicked((prev) => (prev === name ? null : name));
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...eyebrow, marginBottom: 6 }}>{t("grades.eyebrow")}</div>
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
            {t("grades.title")}
          </div>
        </div>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} lastUpdated={lastUpdated} />
      </div>

      {error ? (
        <div
          style={{
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.22)",
            borderRadius: 8,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.35)", margin: "6px 0 0" }}>
            {t("common.retryOrLogin")}
          </p>
        </div>
      ) : loading ? (
        isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: 92, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,340px) 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ height: 92, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
              ))}
            </div>
            <div style={{ height: 420, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
          </div>
        )
      ) : subjects.length === 0 ? (
        <div style={{ border: "1px dashed #E5E3DC", borderRadius: 8, padding: "64px 24px", textAlign: "center" }}>
          <p style={{ ...eyebrow, color: "rgba(19,19,19,0.28)", margin: 0 }}>{t("grades.noGrades")}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.35)", margin: "8px 0 0" }}>
            {t("grades.noGradesHint")}
          </p>
        </div>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-label={t("grades.subjects")}>
          {subjects.map((subject) => {
            const isOpen = picked === subject.subjectName;
            return (
              <div key={subject.subjectName}>
                <SubjectAccordionHeader subject={subject} isOpen={isOpen} onToggle={() => toggleMobile(subject.subjectName)} t={t} />
                {isOpen && <Sandbox key={subject.subjectName} subject={subject} accordionMode />}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,340px) 1fr", gap: 20, alignItems: "start" }}>
          <ReportCard subjects={subjects} selected={desktopSelected} onSelect={setPicked} />
          {desktopSubject ? (
            <Sandbox key={desktopSubject.subjectName} subject={desktopSubject} accordionMode={false} />
          ) : (
            <div
              style={{
                display: "grid",
                placeItems: "center",
                border: "1px dashed #E5E3DC",
                borderRadius: 8,
                minHeight: 320,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: "rgba(19,19,19,0.35)",
              }}
            >
              {t("grades.selectSubject")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubjectAccordionHeader({
  subject,
  isOpen,
  onToggle,
  t,
}: {
  subject: SubjectGrades;
  isOpen: boolean;
  onToggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      onMouseEnter={(e) => {
        if (!isOpen) e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)";
      }}
      onMouseLeave={(e) => {
        if (!isOpen) e.currentTarget.style.borderColor = "#E5E3DC";
      }}
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        background: isOpen ? "rgba(204,43,43,0.05)" : "#FFFFFF",
        border: `1px solid ${isOpen ? "rgba(204,43,43,0.22)" : "#E5E3DC"}`,
        borderRadius: isOpen ? "8px 8px 0 0" : 8,
        padding: 16,
        transition: "border-color 0.15s, background 0.15s, border-radius 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <path d="M4 2l4 4-4 4" stroke={isOpen ? "#CC2B2B" : "rgba(19,19,19,0.35)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "#131313",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subject.subjectName}
          </span>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            fontWeight: 500,
            color: isOpen ? "#CC2B2B" : "rgba(19,19,19,0.55)",
            background: isOpen ? "rgba(204,43,43,0.07)" : "rgba(0,0,0,0.04)",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          {subject.isPoints ? "" : "Ø "}
          {formatAverage(subject.currentAverage, subject.isPoints)}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12, paddingLeft: 22 }}>
        {subject.grades.map((g) => (
          <span key={g.id} title={`${g.description}${g.maxPoints != null ? "" : ` · ${t("grades.weightMeta", { n: g.weight })}`}`}>
            <GradeBadge grade={g} />
          </span>
        ))}
      </div>
    </button>
  );
}

function GradeBadge({ grade, size = "sm", dimmed = false }: { grade: Pick<Grade, "value" | "maxPoints">; size?: "sm" | "lg"; dimmed?: boolean }) {
  const tone = toneFor(grade);
  const isPoints = grade.maxPoints != null;
  const lg = size === "lg";
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        minWidth: lg ? 34 : 24,
        height: lg ? 34 : 24,
        padding: isPoints ? (lg ? "0 9px" : "0 6px") : 0,
        borderRadius: 4,
        flexShrink: 0,
        fontFamily: "'DM Mono', monospace",
        fontSize: lg ? 13 : 11,
        fontWeight: 500,
        color: tone.text,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        opacity: dimmed ? 0.4 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {isPoints ? `${grade.value}/${grade.maxPoints}` : grade.value}
    </span>
  );
}

function ReportCard({ subjects, selected, onSelect }: { subjects: SubjectGrades[]; selected: string | null; onSelect: (name: string) => void }) {
  const { t } = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-label={t("grades.subjects")}>
      {subjects.map((subject) => {
        const isActive = subject.subjectName === selected;
        return (
          <button
            key={subject.subjectName}
            type="button"
            onClick={() => onSelect(subject.subjectName)}
            aria-pressed={isActive}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "#E5E3DC"; }}
            style={{
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              background: isActive ? "rgba(204,43,43,0.05)" : "#FFFFFF",
              border: `1px solid ${isActive ? "rgba(204,43,43,0.22)" : "#E5E3DC"}`,
              borderRadius: 8,
              padding: 16,
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#131313", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {subject.subjectName}
              </span>
              <span style={{
                flexShrink: 0,
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                fontWeight: 500,
                color: isActive ? "#CC2B2B" : "rgba(19,19,19,0.55)",
                background: isActive ? "rgba(204,43,43,0.07)" : "rgba(0,0,0,0.04)",
                borderRadius: 4,
                padding: "3px 8px",
              }}>
                {subject.isPoints ? "" : "Ø "}{formatAverage(subject.currentAverage, subject.isPoints)}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
              {subject.grades.map((g) => (
                <span key={g.id} title={`${g.description}${g.maxPoints != null ? "" : ` · ${t("grades.weightMeta", { n: g.weight })}`}`}>
                  <GradeBadge grade={g} />
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface SandboxProps {
  subject: SubjectGrades;
  accordionMode?: boolean;
}

function Sandbox({ subject, accordionMode = false }: SandboxProps) {
  const { t } = useT();
  const isMobile = useIsMobile();
  const isPoints = subject.isPoints;

  const official = useMemo<SimGrade[]>(
    () => subject.grades.map((g) => ({ ...g, simulated: false, hidden: false })),
    [subject],
  );
  const [grades, setGrades] = useState<SimGrade[]>(official);

  const [newValue, setNewValue] = useState<string>("1");
  const [newWeight, setNewWeight] = useState<string>("20");
  const [newEarned, setNewEarned] = useState<string>("");
  const [newMax, setNewMax] = useState<string>("10");
  const [newLabel, setNewLabel] = useState<string>("");

  const officialAvg = subject.currentAverage;
  const simulatedAvg = useMemo(() => liveAverage(grades, isPoints), [grades, isPoints]);
  const modified = grades.some((g) => g.simulated || g.hidden);
  const delta =
    officialAvg !== null && simulatedAvg !== null
      ? Math.round((simulatedAvg - officialAvg) * 100) / 100
      : null;
  const improved = delta !== null && delta !== 0 ? (isPoints ? delta > 0 : delta < 0) : null;

  function addHypo(e: React.FormEvent) {
    e.preventDefault();
    let grade: SimGrade;
    if (isPoints) {
      const max = Number(newMax);
      const earned = Number(newEarned);
      if (Number.isNaN(max) || max <= 0 || Number.isNaN(earned) || earned < 0) return;
      grade = {
        id: `sim-${Date.now()}`,
        value: String(earned),
        weight: Math.round(max),
        maxPoints: max,
        description: newLabel.trim() || t("grades.hypotheticalGrade"),
        date: null,
        simulated: true,
        hidden: false,
      };
      setNewEarned("");
    } else {
      const weight = Number(newWeight);
      if (Number.isNaN(weight) || weight <= 0) return;
      grade = {
        id: `sim-${Date.now()}`,
        value: newValue,
        weight,
        maxPoints: null,
        description: newLabel.trim() || t("grades.hypotheticalGrade"),
        date: null,
        simulated: true,
        hidden: false,
      };
    }
    setGrades((prev) => [grade, ...prev]);
    setNewLabel("");
  }

  function removeGrade(id: string) {
    setGrades((prev) => prev.filter((g) => g.id !== id));
  }

  function toggleHidden(id: string) {
    setGrades((prev) => prev.map((g) => (g.id === id ? { ...g, hidden: !g.hidden } : g)));
  }

  function reset() {
    setGrades(official);
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        background: "#FFFFFF",
        border: accordionMode ? "1px solid rgba(204,43,43,0.22)" : "1px solid #E5E3DC",
        borderTop: accordionMode ? "none" : undefined,
        borderRadius: accordionMode ? "0 0 8px 8px" : 8,
        padding: 20,
      }}
    >
      {/* Metric header: official vs simulated */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#F7F5EF", border: "1px solid #E5E3DC", borderRadius: 8, padding: "16px 18px" }}>
          <div style={{ ...fieldLabel, marginBottom: 10 }}>{t("grades.officialAverage")}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 400, color: "#131313", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {formatAverage(officialAvg, isPoints)}
          </div>
        </div>
        <div style={{ background: "rgba(204,43,43,0.05)", border: "1px solid rgba(204,43,43,0.20)", borderRadius: 8, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <FlaskIcon />
            <span style={{ ...fieldLabel, color: "#CC2B2B", marginBottom: 0 }}>{t("grades.simulatedAverage")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 400, color: "#CC2B2B", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {formatAverage(simulatedAvg, isPoints)}
            </span>
            {delta !== null && delta !== 0 && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  fontWeight: 500,
                  color: improved ? "#16A34A" : "#DC2626",
                }}
              >
                {delta > 0 ? "+" : ""}
                {isPoints ? `${Math.round(delta)} %` : delta.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* What-if form */}
      <form
        onSubmit={addHypo}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto 1fr auto",
          gap: 10,
          alignItems: "end",
          background: "#F7F5EF",
          border: "1px solid #E5E3DC",
          borderRadius: 8,
          padding: 16,
        }}
      >
        {isPoints ? (
          <>
            <label style={{ display: "block" }}>
              <div style={fieldLabel}>{t("grades.points")}</div>
              <input
                type="number"
                min={0}
                value={newEarned}
                onChange={(e) => setNewEarned(e.target.value)}
                placeholder={t("grades.pointsPlaceholder")}
                style={{ width: 80, padding: "9px 11px", fontFamily: "'DM Mono', monospace", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "block" }}>
              <div style={fieldLabel}>{t("grades.max")}</div>
              <input
                type="number"
                min={1}
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
                style={{ width: 80, padding: "9px 11px", fontFamily: "'DM Mono', monospace", fontSize: 14 }}
              />
            </label>
          </>
        ) : (
          <>
            <label style={{ display: "block" }}>
              <div style={fieldLabel}>{t("grades.grade")}</div>
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                style={{ width: 64, padding: "9px 11px", fontFamily: "'DM Mono', monospace", fontSize: 13 }}
              >
                {["1", "2", "3", "4", "5", "A"].map((v) => (
                  <option key={v} value={v}>
                    {v === "A" ? t("grades.absent") : v}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <div style={fieldLabel}>{t("grades.weight")}</div>
              <input
                type="number"
                min={1}
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                style={{ width: 80, padding: "9px 11px", fontFamily: "'DM Mono', monospace", fontSize: 14 }}
              />
            </label>
          </>
        )}
        <label style={{ display: "block", gridColumn: isMobile ? "1 / -1" : undefined }}>
          <div style={fieldLabel}>{t("grades.descriptionOptional")}</div>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t("grades.descriptionPlaceholder")}
            style={{ width: "100%", padding: "9px 11px", fontFamily: "'Inter', sans-serif", fontSize: 13 }}
          />
        </label>
        <button
          type="submit"
          onMouseEnter={(e) => (e.currentTarget.style.background = "#B02424")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#CC2B2B")}
          style={{
            background: "#CC2B2B",
            color: "#FFFFFF",
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 500,
            padding: "10px 14px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background 0.2s",
            gridColumn: isMobile ? "1 / -1" : undefined,
          }}
        >
          {t("grades.add")}
        </button>
      </form>

      {/* Grade list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={{ ...eyebrow, whiteSpace: "nowrap" }}>{t("grades.title")}</span>
            <div style={{ flex: 1, height: 1, background: "#E5E3DC" }} />
          </div>
          {modified && (
            <button
              type="button"
              onClick={reset}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.22)";
                e.currentTarget.style.color = "rgba(19,19,19,0.70)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E3DC";
                e.currentTarget.style.color = "rgba(19,19,19,0.40)";
              }}
              style={{
                marginLeft: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid #E5E3DC",
                borderRadius: 4,
                padding: "5px 10px",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(19,19,19,0.40)",
                transition: "border-color 0.15s, color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <ResetIcon />
              {t("grades.reset")}
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {grades.map((g) => (
            <GradeRow
              key={g.id}
              grade={g}
              onToggleHidden={() => toggleHidden(g.id)}
              onRemove={() => removeGrade(g.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function GradeRow({ grade, onToggleHidden, onRemove }: { grade: SimGrade; onToggleHidden: () => void; onRemove: () => void }) {
  const { t } = useT();
  const meta =
    grade.maxPoints != null
      ? t("grades.pointsMeta", { earned: grade.value, max: grade.maxPoints })
      : t("grades.weightMeta", { n: grade.weight });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 6,
        background: grade.simulated ? "rgba(204,43,43,0.04)" : "#F7F5EF",
        border: grade.simulated ? "1px dashed rgba(204,43,43,0.30)" : "1px solid #E5E3DC",
        opacity: grade.hidden ? 0.55 : 1,
      }}
    >
      <GradeBadge grade={grade} size="lg" dimmed={grade.hidden} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "#131313",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: grade.hidden ? "line-through" : undefined,
            }}
          >
            {grade.description}
          </span>
          {grade.simulated && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: "'DM Mono', monospace",
                fontSize: 7,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#CC2B2B",
                background: "rgba(204,43,43,0.08)",
                borderRadius: 3,
                padding: "2px 6px",
              }}
            >
              {t("grades.simulatedBadge")}
            </span>
          )}
          {grade.hidden && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: "'DM Mono', monospace",
                fontSize: 7,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(19,19,19,0.40)",
                background: "rgba(0,0,0,0.05)",
                borderRadius: 3,
                padding: "2px 6px",
              }}
            >
              {t("grades.hidden")}
            </span>
          )}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(19,19,19,0.35)", letterSpacing: "0.02em", marginTop: 3 }}>
          {meta}
          {grade.date ? ` · ${grade.date}` : ""}
        </div>
      </div>
      {grade.simulated ? (
        <IconButton label={t("grades.removeAria", { name: grade.description })} onClick={onRemove} hoverColor="#DC2626" hoverBg="rgba(220,38,38,0.08)">
          <TrashIcon />
        </IconButton>
      ) : (
        <IconButton
          label={grade.hidden ? t("grades.showAria", { name: grade.description }) : t("grades.hideAria", { name: grade.description })}
          onClick={onToggleHidden}
          hoverColor="#CC2B2B"
          hoverBg="rgba(204,43,43,0.08)"
        >
          {grade.hidden ? <EyeIcon /> : <EyeOffIcon />}
        </IconButton>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  hoverColor,
  hoverBg,
  children,
}: {
  label: string;
  onClick: () => void;
  hoverColor: string;
  hoverBg: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "rgba(19,19,19,0.35)";
      }}
      style={{
        display: "grid",
        placeItems: "center",
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 5,
        border: "none",
        background: "transparent",
        color: "rgba(19,19,19,0.35)",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function FlaskIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M6 1.5h4M6.5 1.5v4L3 12a1.5 1.5 0 001.3 2.3h7.4A1.5 1.5 0 0013 12L9.5 5.5v-4" stroke="#CC2B2B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5h6" stroke="#CC2B2B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path d="M3 8a5 5 0 105-5 5 5 0 00-3.5 1.5L3 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M6.5 4V2.8a.8.8 0 01.8-.8h1.4a.8.8 0 01.8.8V4M4.5 4l.5 8.2a1 1 0 001 .8h4a1 1 0 001-.8L11.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 4.2A6 6 0 018 4c3 0 5.3 2.2 6 4-.3.8-.9 1.7-1.7 2.4M9.5 11.8A6 6 0 018 12c-3 0-5.3-2.2-6-4 .4-1 1.2-2 2.3-2.8M6.6 6.6a2 2 0 102.8 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 8c.7-1.8 3-4 6-4s5.3 2.2 6 4c-.7 1.8-3 4-6 4s-5.3-2.2-6-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
