import { useEffect, useMemo, useState } from "react";
import { api, type MealDayDTO, type MenuOptionDTO } from "../api/client";
import { useCachedResource } from "../api/useCachedResource";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import RefreshButton from "../components/RefreshButton";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const WEEKS_AHEAD = 3;
const MEALS_CACHE_KEY = `canteen:meals:${WEEKS_AHEAD}`;

function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function weekKey(iso: string): string {
  const d = parseDay(iso);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function weekLabel(key: string, t: Translate): string {
  const thisMonday = weekKey(new Date().toISOString().slice(0, 10));
  const diffWeeks = Math.round(
    (parseDay(key).getTime() - parseDay(thisMonday).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  if (diffWeeks <= 0) return t("canteen.thisWeek");
  if (diffWeeks === 1) return t("canteen.nextWeek");
  return t("canteen.inWeeks", { n: diffWeeks });
}

interface Week {
  key: string;
  label: string;
  days: MealDayDTO[];
}

function groupByWeek(meals: MealDayDTO[], t: Translate): Week[] {
  const buckets = new Map<string, MealDayDTO[]>();
  for (const meal of meals) {
    const key = weekKey(meal.date);
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(meal);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, days]) => ({
      key,
      label: weekLabel(key, t),
      days: days.sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

type Toast = { tone: "error" | "success"; message: string } | null;

export default function CanteenPage() {
  const { t } = useT();
  const isMobile = useIsMobile();
  const { data, loading, refreshing, error, lastUpdated, refresh, mutate } =
    useCachedResource<MealDayDTO[]>(MEALS_CACHE_KEY, () => api.listMeals(WEEKS_AHEAD), {
      errorFallback: t("canteen.loadError"),
    });
  const meals = useMemo(() => data ?? [], [data]);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [bulkDays, setBulkDays] = useState(5);
  const [bulkChoice, setBulkChoice] = useState("A");

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const weeks = useMemo(() => groupByWeek(meals, t), [meals, t]);
  const week = weeks.find((w) => w.key === activeWeek) ?? weeks[0];

  const letters = useMemo(() => {
    const set = new Set<string>();
    for (const m of meals) for (const o of m.options) set.add(o.letter);
    return set.size ? [...set].sort() : ["A", "B"];
  }, [meals]);

  function setOrdered(date: string, ordered: string | null) {
    mutate((prev) => (prev ?? []).map((m) => (m.date === date ? { ...m, ordered_meal: ordered } : m)));
  }

  function markPending(date: string, on: boolean) {
    setPending((prev) => { const next = new Set(prev); if (on) next.add(date); else next.delete(date); return next; });
  }

  async function changeMeal(date: string, choice: string | null) {
    const previous = meals.find((m) => m.date === date)?.ordered_meal ?? null;
    if (previous === choice) return;
    setOrdered(date, choice);
    markPending(date, true);
    try {
      const res = await api.orderMeal(date, choice);
      setOrdered(date, res.ordered_meal);
    } catch (err) {
      setOrdered(date, previous);
      setToast({ tone: "error", message: (err as { detail?: string })?.detail ?? t("canteen.orderError") });
    } finally {
      markPending(date, false);
    }
  }

  async function runBulk() {
    setBulkBusy(true);
    try {
      const res = await api.bulkSignup(bulkDays, bulkChoice);
      refresh();
      if (res.updated_days === 0) {
        const skipped = res.skipped_days ? t("canteen.bulkNoneSkipped", { n: res.skipped_days }) : "";
        setToast({ tone: "error", message: t("canteen.bulkNone", { skipped }) });
      } else {
        const skipped = res.skipped_days ? t("canteen.bulkOkSkipped", { n: res.skipped_days }) : "";
        setToast({
          tone: "success",
          message: t("canteen.bulkOk", { updated: res.updated_days, choice: bulkChoice, skipped }),
        });
      }
    } catch (err) {
      setToast({ tone: "error", message: (err as { detail?: string })?.detail ?? t("canteen.bulkError") });
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#CC2B2B", marginBottom: 6 }}>
            {t("canteen.eyebrow")}
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400, color: "#131313", letterSpacing: "-0.01em" }}>
            {t("canteen.title")}
          </div>
        </div>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} lastUpdated={lastUpdated} />
      </div>

      {/* Bulk automation */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E3DC",
          borderRadius: 8,
          padding: "20px 22px",
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 1l1.4 3.5L12 5 9.7 7.3l.8 3.7L7 9.5 3.5 11l.8-3.7L2 5l3.6-.5L7 1z" stroke="#CC2B2B" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#CC2B2B" }}>
            {t("canteen.autoOrder")}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(19,19,19,0.45)", marginBottom: 5 }}>
              {t("canteen.daysCount")}
            </div>
            <input
              type="number"
              min={1}
              max={31}
              value={bulkDays}
              disabled={bulkBusy}
              onChange={(e) => setBulkDays(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              style={{ width: "100%", padding: "9px 11px", fontFamily: "'DM Mono', monospace", fontSize: 14 }}
            />
          </div>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(19,19,19,0.45)", marginBottom: 5 }}>
              {t("canteen.preferredMenu")}
            </div>
            <select
              value={bulkChoice}
              disabled={bulkBusy}
              onChange={(e) => setBulkChoice(e.target.value)}
              style={{ width: "100%", padding: "9px 11px", fontFamily: "'DM Mono', monospace", fontSize: 13 }}
            >
              {letters.map((l) => (
                <option key={l} value={l}>{t("canteen.menu", { letter: l })}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={runBulk}
            disabled={bulkBusy || loading || !!error}
            style={{
              background: bulkBusy ? "rgba(204,43,43,0.6)" : "#CC2B2B",
              color: "#FFFFFF",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "10px 14px",
              borderRadius: 4,
              border: "none",
              cursor: bulkBusy ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.2s",
              gridColumn: isMobile ? "1 / -1" : undefined,
            }}
          >
            {bulkBusy ? t("canteen.running") : t("canteen.run")}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.35)", margin: "6px 0 0" }}>{t("common.retryOrLogin")}</p>
        </div>
      ) : loading ? (
        isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: 120, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: 288, background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid #E5E3DC" }} />
            ))}
          </div>
        )
      ) : !week ? (
        <div style={{ border: "1px dashed #E5E3DC", borderRadius: 8, padding: "64px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(19,19,19,0.28)", margin: 0 }}>
            {t("canteen.noMenu")}
          </p>
        </div>
      ) : (
        <>
          {/* Week tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {weeks.map((w) => {
              const active = w.key === week.key;
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setActiveWeek(w.key)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 4,
                    background: active ? "rgba(204,43,43,0.07)" : "#FFFFFF",
                    border: `1px solid ${active ? "rgba(204,43,43,0.25)" : "#E5E3DC"}`,
                    cursor: "pointer",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: active ? "#CC2B2B" : "rgba(19,19,19,0.40)",
                    transition: "all 0.15s",
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>

          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {week.days.map((day) => (
                <DayCard key={day.date} day={day} isPending={pending.has(day.date)} onChange={(choice) => changeMeal(day.date, choice)} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {week.days.map((day) => (
                <DayCard key={day.date} day={day} isPending={pending.has(day.date)} onChange={(choice) => changeMeal(day.date, choice)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            background: "#FFFFFF",
            border: `1px solid ${toast.tone === "success" ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.25)"}`,
            borderRadius: 6,
            padding: "11px 18px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "opacity 0.3s",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.10em",
              color: toast.tone === "success" ? "#16A34A" : "#DC2626",
            }}
          >
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(19,19,19,0.35)", padding: 0, fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  isPending,
  onChange,
}: {
  day: MealDayDTO;
  isPending: boolean;
  onChange: (choice: string | null) => void;
}) {
  const { t, locale } = useT();
  const d = parseDay(day.date);
  const dayName = d.toLocaleDateString(locale, { weekday: "long" }).toUpperCase();
  const dateStr = `${d.getDate()}.${d.getMonth() + 1}.`;
  const signedUp = day.ordered_meal !== null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E3DC",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #E5E3DC" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(19,19,19,0.35)", marginBottom: 2 }}>
          {dayName}
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "#131313", fontWeight: 400, marginBottom: 6 }}>
          {dateStr}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <div
            style={{
              padding: "3px 7px",
              borderRadius: 3,
              background: signedUp ? "rgba(22,163,74,0.08)" : "rgba(0,0,0,0.04)",
            }}
          >
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: "0.08em", color: signedUp ? "#16A34A" : "rgba(19,19,19,0.32)" }}>
              {signedUp ? t("canteen.signedUp", { letter: day.ordered_meal ?? "" }) : t("canteen.notSignedUp")}
            </span>
          </div>
          {signedUp && day.open && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={isPending}
              onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.color = "#DC2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(220,80,80,0.65)"; }}
              style={{
                background: "transparent",
                border: "none",
                padding: "2px 4px",
                cursor: isPending ? "wait" : "pointer",
                fontFamily: "'DM Mono', monospace",
                fontSize: 7,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(220,80,80,0.65)",
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {t("canteen.signOff")} ✕
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!day.open ? (
        <div style={{ padding: "18px 12px", textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(19,19,19,0.20)" }}>
            {t("canteen.closed")}
          </div>
        </div>
      ) : day.options.length === 0 ? (
        <div style={{ padding: "18px 12px", textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(19,19,19,0.20)" }}>
            {t("canteen.menuNotPublished")}
          </div>
        </div>
      ) : (
        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {day.options.map((opt) => (
            <MealOption
              key={opt.letter}
              opt={opt}
              selected={day.ordered_meal === opt.letter}
              disabled={isPending}
              onClick={() => onChange(opt.letter)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MealOption({
  opt,
  selected,
  disabled,
  onClick,
}: {
  opt: MenuOptionDTO;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useT();
  const details = [opt.weight, opt.allergens ? t("canteen.allergens", { a: opt.allergens }) : null].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 10px",
        borderRadius: 5,
        border: `1px solid ${selected ? "rgba(204,43,43,0.28)" : "#E5E3DC"}`,
        background: selected ? "rgba(204,43,43,0.06)" : "transparent",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.7 : 1,
        textAlign: "left",
        transition: "all 0.15s",
        width: "100%",
      }}
    >
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.10em", textTransform: "uppercase", color: "#CC2B2B", marginBottom: 3 }}>
        {t("canteen.menu", { letter: opt.letter })}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: "#131313", lineHeight: 1.3, marginBottom: 2 }}>
        {opt.name ?? "—"}
      </div>
      {details && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "rgba(19,19,19,0.28)", lineHeight: 1.4 }}>
          {details}
        </div>
      )}
    </button>
  );
}
