import { useEffect, useMemo, useState } from "react";
import {
  CircleCheck,
  CircleSlash,
  LoaderCircle,
  Soup,
  Sparkles,
  X,
} from "lucide-react";
import { api, type MealDayDTO } from "../api/client";

const WEEKS_AHEAD = 3;

// EduPage dates are plain "YYYY-MM-DD"; parse as local midnight so the weekday
// label doesn't shift across timezones.
function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Monday 00:00 of the given date's week, as a "YYYY-MM-DD" key. */
function weekKey(iso: string): string {
  const d = parseDay(iso);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function weekLabel(key: string): string {
  const thisMonday = weekKey(new Date().toISOString().slice(0, 10));
  const diffWeeks = Math.round(
    (parseDay(key).getTime() - parseDay(thisMonday).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  if (diffWeeks <= 0) return "This Week";
  if (diffWeeks === 1) return "Next Week";
  return `In ${diffWeeks} Weeks`;
}

interface Week {
  key: string;
  label: string;
  days: MealDayDTO[];
}

function groupByWeek(meals: MealDayDTO[]): Week[] {
  const buckets = new Map<string, MealDayDTO[]>();
  for (const meal of meals) {
    const key = weekKey(meal.date);
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(meal);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, days]) => ({
      key,
      label: weekLabel(key),
      days: days.sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

type Toast = { tone: "error" | "success"; message: string } | null;

export default function CanteenPage() {
  const [meals, setMeals] = useState<MealDayDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  // Dates with an in-flight order request — used to disable their controls.
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // Bulk-automation controls.
  const [bulkDays, setBulkDays] = useState(5);
  const [bulkChoice, setBulkChoice] = useState("A");

  function loadMeals(signal?: { cancelled: boolean }) {
    return api
      .listMeals(WEEKS_AHEAD)
      .then((data) => {
        if (signal?.cancelled) return;
        setMeals(data);
        setActiveWeek((cur) => cur ?? groupByWeek(data)[0]?.key ?? null);
      })
      .catch((err: { detail?: string }) => {
        if (!signal?.cancelled) setError(err?.detail ?? "Could not load canteen menus from EduPage.");
      });
  }

  useEffect(() => {
    const signal = { cancelled: false };
    loadMeals(signal).finally(() => {
      if (!signal.cancelled) setLoading(false);
    });
    return () => {
      signal.cancelled = true;
    };
  }, []);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const weeks = useMemo(() => groupByWeek(meals), [meals]);
  const week = weeks.find((w) => w.key === activeWeek) ?? weeks[0];

  // Menu letters offered anywhere in the dataset — drives the bulk dropdown.
  const letters = useMemo(() => {
    const set = new Set<string>();
    for (const m of meals) for (const o of m.options) set.add(o.letter);
    return set.size ? [...set].sort() : ["A", "B"];
  }, [meals]);

  function setOrdered(date: string, ordered: string | null) {
    setMeals((prev) => prev.map((m) => (m.date === date ? { ...m, ordered_meal: ordered } : m)));
  }

  function markPending(date: string, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(date);
      else next.delete(date);
      return next;
    });
  }

  // Optimistically apply an order/sign-off, rolling back on failure.
  async function changeMeal(date: string, choice: string | null) {
    const previous = meals.find((m) => m.date === date)?.ordered_meal ?? null;
    if (previous === choice) return;

    setOrdered(date, choice);
    markPending(date, true);
    try {
      const res = await api.orderMeal(date, choice);
      setOrdered(date, res.ordered_meal); // trust the server's view
    } catch (err) {
      setOrdered(date, previous); // roll back
      const detail = (err as { detail?: string })?.detail ?? "Could not update that meal.";
      setToast({ tone: "error", message: detail });
    } finally {
      markPending(date, false);
    }
  }

  async function runBulk() {
    setBulkBusy(true);
    try {
      const res = await api.bulkSignup(bulkDays, bulkChoice);
      await loadMeals(); // re-sync so newly-ordered days flip together
      setToast({
        tone: "success",
        message: `Scheduled ${res.updated_days} day${res.updated_days === 1 ? "" : "s"} for Menu ${bulkChoice}${
          res.skipped_days ? ` · ${res.skipped_days} skipped` : ""
        }.`,
      });
    } catch (err) {
      const detail = (err as { detail?: string })?.detail ?? "Auto-scheduling failed.";
      setToast({ tone: "error", message: detail });
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">School Canteen</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick your menus and manage meal sign-ups for the weeks ahead.
        </p>
      </header>

      {/* Bulk automation control suite */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Sparkles className="size-4 text-violet-400" aria-hidden />
            Bulk Automation
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Auto-register for your preferred menu several days ahead.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-400">
            Days ahead
            <input
              type="number"
              min={1}
              max={31}
              value={bulkDays}
              disabled={bulkBusy}
              onChange={(e) => setBulkDays(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 block w-20 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </label>
          <label className="text-xs font-medium text-slate-400">
            Preferred menu
            <select
              value={bulkChoice}
              disabled={bulkBusy}
              onChange={(e) => setBulkChoice(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {letters.map((l) => (
                <option key={l} value={l}>
                  Menu {l}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={runBulk}
            disabled={bulkBusy || loading || !!error}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkBusy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            Auto-Schedule Meals
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-16 text-center">
          <p className="text-sm font-medium text-red-300">{error}</p>
          <p className="mt-1 text-xs text-slate-500">
            Try reloading, or log in again if your session expired.
          </p>
        </div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      ) : !week ? (
        <div className="rounded-xl border border-dashed border-slate-800 px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-300">No menus available.</p>
          <p className="mt-1 text-xs text-slate-500">EduPage didn't return any upcoming meals.</p>
        </div>
      ) : (
        <>
          {/* Week picker */}
          <div
            className="mb-6 flex gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 sm:w-fit"
            role="tablist"
            aria-label="Week"
          >
            {weeks.map((w) => (
              <button
                key={w.key}
                type="button"
                role="tab"
                aria-selected={w.key === week.key}
                onClick={() => setActiveWeek(w.key)}
                className={[
                  "flex-1 cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 sm:flex-none",
                  w.key === week.key
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                ].join(" ")}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Menu grid: Mon–Fri */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {week.days.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                pending={pending.has(day.date)}
                onChange={(choice) => changeMeal(day.date, choice)}
              />
            ))}
          </div>
        </>
      )}

      {toast && (
        <div
          role="status"
          className={[
            "fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl",
            toast.tone === "error"
              ? "border-red-500/40 bg-red-500/15 text-red-200"
              : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
          ].join(" ")}
        >
          {toast.tone === "error" ? (
            <CircleSlash className="size-4 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="size-4 shrink-0" aria-hidden />
          )}
          <span className="min-w-0">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-1 cursor-pointer rounded text-current/70 hover:text-current"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

interface DayCardProps {
  day: MealDayDTO;
  pending: boolean;
  onChange: (choice: string | null) => void;
}

function DayCard({ day, pending, onChange }: DayCardProps) {
  const date = parseDay(day.date);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const shortDate = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const signedUp = day.ordered_meal !== null;

  return (
    <div
      className={[
        "flex flex-col rounded-xl border p-4 transition-colors duration-200",
        day.open
          ? "border-slate-800 bg-slate-900/60 hover:border-slate-700"
          : "border-slate-800/60 bg-slate-900/30",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">{weekday}</p>
          <p className="text-xs text-slate-500">{shortDate}</p>
        </div>
        {day.open && (
          <span
            className={[
              "rounded-md px-2 py-0.5 text-[11px] font-semibold",
              signedUp ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/40 text-slate-400",
            ].join(" ")}
          >
            {signedUp ? "Signed in" : "Not signed in"}
          </span>
        )}
      </div>

      {!day.open ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <CircleSlash className="size-6 text-slate-600" aria-hidden />
          <p className="text-sm text-slate-500">No service</p>
        </div>
      ) : day.options.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <Soup className="size-6 text-slate-600" aria-hidden />
          <p className="text-sm text-slate-500">No menu published yet</p>
        </div>
      ) : (
        <>
          <fieldset className="flex-1 space-y-2" disabled={pending}>
            <legend className="sr-only">Menu choice for {weekday}</legend>
            {day.options.map((opt) => {
              const checked = day.ordered_meal === opt.letter;
              return (
                <label
                  key={opt.letter}
                  className={[
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-200",
                    pending
                      ? "cursor-wait opacity-70"
                      : checked
                        ? "cursor-pointer border-violet-500/60 bg-violet-500/10"
                        : "cursor-pointer border-slate-800 hover:border-slate-600",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name={`menu-${day.date}`}
                    value={opt.letter}
                    checked={checked}
                    disabled={pending}
                    onChange={() => onChange(opt.letter)}
                    className="mt-1 size-3.5 shrink-0 accent-violet-500"
                  />
                  <span className="min-w-0">
                    <span
                      className={[
                        "block text-sm font-medium",
                        checked ? "text-violet-200" : "text-slate-200",
                      ].join(" ")}
                    >
                      Menu {opt.letter} — {opt.name ?? "—"}
                    </span>
                    {opt.weight && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Soup className="size-3 shrink-0" aria-hidden />
                        {opt.weight}
                        {opt.allergens ? ` · allergens ${opt.allergens}` : ""}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-4 border-t border-slate-800 pt-3">
            <p
              className={[
                "mb-2 flex items-center gap-1.5 text-xs font-medium",
                signedUp ? "text-emerald-300" : "text-slate-400",
              ].join(" ")}
            >
              {signedUp ? (
                <>
                  <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                  Signed in · Menu {day.ordered_meal}
                </>
              ) : (
                <>
                  <CircleSlash className="size-3.5 shrink-0" aria-hidden />
                  No meal this day
                </>
              )}
            </p>
            <button
              type="button"
              disabled={pending || !signedUp}
              onClick={() => onChange(null)}
              className="w-full cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Saving…" : "Check out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
