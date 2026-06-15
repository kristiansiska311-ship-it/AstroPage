import { Link } from "react-router-dom";
import {
  AlarmClockMinus,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  attendanceToday,
  getHomeworkStatus,
  homeworkData,
  recentGrades,
  todaySchedule,
  type Period,
} from "../data/mock";

export default function Dashboard() {
  const { user } = useAuth();

  const pending = homeworkData.filter((hw) => !hw.submitted);
  const urgent = pending.filter((hw) => getHomeworkStatus(hw) === "due-soon");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Welcome back, {user?.username ?? "Student"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {urgent.length > 0 && (
        <Link
          to="/homework"
          className="mb-8 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5 transition-colors duration-200 hover:bg-amber-500/15"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              {urgent.length === 1
                ? "1 assignment is due within 24 hours"
                : `${urgent.length} assignments are due within 24 hours`}
            </p>
            <p className="mt-0.5 truncate text-sm text-amber-200/80">
              {urgent.map((hw) => `${hw.subject}: ${hw.title}`).join(" · ")}
            </p>
          </div>
          <span className="ml-auto self-center whitespace-nowrap text-xs font-medium text-amber-300/90">
            Open Homework →
          </span>
        </Link>
      )}

      {/* Metrics row */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<ClipboardList className="size-5" aria-hidden />}
          tint="text-violet-300 bg-violet-500/15"
          label="Pending Tasks"
          value={String(pending.length)}
          sub={
            urgent.length > 0
              ? `${urgent.length} due in the next 24h`
              : "Nothing urgent today"
          }
        />
        <MetricCard
          icon={<CalendarCheck className="size-5" aria-hidden />}
          tint="text-emerald-300 bg-emerald-500/15"
          label="Day's Attendance"
          value={`${attendanceToday.present}/${attendanceToday.total}`}
          sub={attendanceToday.label}
        />
        <MetricCard
          icon={<GraduationCap className="size-5" aria-hidden />}
          tint="text-sky-300 bg-sky-500/15"
          label="Recent Grades"
          value={recentGrades[0] ? recentGrades[0].value : "—"}
          sub={recentGrades
            .map((g) => `${g.subject.slice(0, 4)} ${g.value}`)
            .join(" · ")}
        />
      </div>

      {/* Schedule timeline */}
      <section aria-labelledby="schedule-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="schedule-heading" className="text-lg font-semibold text-white">
            Today's Schedule
          </h2>
          <span className="text-xs text-slate-500">
            {todaySchedule.filter((p) => p.status !== "cancelled").length} of{" "}
            {todaySchedule.length} periods running
          </span>
        </div>
        <ol className="relative space-y-3 border-l border-slate-800 pl-6">
          {todaySchedule.map((p) => (
            <TimelineItem key={p.period} period={p} />
          ))}
        </ol>
      </section>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  sub: string;
}

function MetricCard({ icon, tint, label, value, sub }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-colors duration-200 hover:border-slate-700">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-lg ${tint}`}>{icon}</span>
        <p className="text-sm font-medium text-slate-400">{label}</p>
      </div>
      <p className="mt-4 font-mono text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function periodIsNow(p: Period): boolean {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hm >= p.start && hm <= p.end;
}

function TimelineItem({ period }: { period: Period }) {
  const cancelled = period.status === "cancelled";
  const modified = period.status === "modified";
  const current = !cancelled && periodIsNow(period);

  return (
    <li className="relative">
      <span
        className={[
          "absolute -left-[31px] top-4 size-2.5 rounded-full ring-4 ring-slate-950",
          cancelled ? "bg-red-500" : modified ? "bg-amber-400" : current ? "bg-violet-400" : "bg-slate-600",
        ].join(" ")}
        aria-hidden
      />
      <div
        className={[
          "rounded-xl border px-4 py-3 transition-colors duration-200",
          cancelled
            ? "border-red-500/30 bg-red-500/5"
            : modified
              ? "border-amber-500/30 bg-amber-500/5"
              : current
                ? "border-violet-500/40 bg-violet-500/10"
                : "border-slate-800 bg-slate-900/60",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {period.start}–{period.end}
          </span>
          <span
            className={[
              "text-sm font-semibold",
              cancelled ? "text-red-300 line-through" : "text-white",
            ].join(" ")}
          >
            {period.subject}
          </span>
          <span className="text-xs text-slate-500">
            {period.room} · {period.teacher}
          </span>
          {current && (
            <span className="ml-auto rounded-md bg-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
              Now
            </span>
          )}
          {cancelled && (
            <span className="ml-auto rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
              Cancelled
            </span>
          )}
          {modified && (
            <span className="ml-auto rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
              Changed
            </span>
          )}
        </div>
        {period.note && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <AlarmClockMinus className="size-3.5 shrink-0" aria-hidden />
            {period.note}
          </p>
        )}
      </div>
    </li>
  );
}
