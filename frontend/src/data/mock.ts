// Mock data layer for the dashboard UI. Everything is generated relative to
// "now" so urgency states (due-soon banners, week pickers, current period)
// stay demoable on any day. Swap these for real API calls in api/client.ts
// once the backend endpoints exist.

// ---------- date helpers ----------

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * HOUR).toISOString();
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / HOUR;
}

export function daysRemainingLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) {
    const d = Math.ceil(-ms / DAY);
    return d <= 1 ? "overdue" : `${d} days overdue`;
  }
  if (ms < DAY) {
    const h = Math.max(1, Math.round(ms / HOUR));
    return `due in ${h}h`;
  }
  const d = Math.round(ms / DAY);
  return d === 1 ? "due tomorrow" : `${d} days left`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ---------- homework ----------

export type HomeworkStatus = "pending" | "due-soon" | "overdue" | "done";

export interface Homework {
  id: string;
  subject: string;
  title: string;
  description: string;
  teacher: string;
  assignedAt: string;
  dueAt: string;
  submitted: boolean;
}

export function getHomeworkStatus(hw: Homework): HomeworkStatus {
  if (hw.submitted) return "done";
  const h = hoursUntil(hw.dueAt);
  if (h < 0) return "overdue";
  if (h <= 24) return "due-soon";
  return "pending";
}

export const homeworkData: Homework[] = [
  {
    id: "hw-1",
    subject: "Mathematics",
    title: "Quadratic functions worksheet",
    description:
      "Solve exercises 4–12 on page 87. For each quadratic, find the vertex, axis of symmetry and roots. Sketch the graph of exercises 7 and 9 and label all intercepts.",
    teacher: "Mgr. Horváthová",
    assignedAt: hoursFromNow(-72),
    dueAt: hoursFromNow(7),
    submitted: false,
  },
  {
    id: "hw-2",
    subject: "English",
    title: "Essay: A technology that changed my life",
    description:
      "Write a 350–500 word argumentative essay. Use at least three linking devices from unit 6 and include a counter-argument paragraph. Submit as PDF.",
    teacher: "Mr. Whitfield",
    assignedAt: hoursFromNow(-120),
    dueAt: hoursFromNow(20),
    submitted: false,
  },
  {
    id: "hw-3",
    subject: "Physics",
    title: "Lab report — pendulum period measurement",
    description:
      "Write up Tuesday's lab. Include the data table, a plot of T² vs L, your computed value of g with uncertainty, and a short discussion of error sources.",
    teacher: "RNDr. Kováč",
    assignedAt: hoursFromNow(-96),
    dueAt: hoursFromNow(3 * 24),
    submitted: false,
  },
  {
    id: "hw-4",
    subject: "Informatics",
    title: "Implement binary search in Python",
    description:
      "Write an iterative and a recursive version of binary search. Add doctests covering empty lists, single elements and missing targets. Push to the class GitLab.",
    teacher: "Ing. Mrázová",
    assignedAt: hoursFromNow(-48),
    dueAt: hoursFromNow(5 * 24),
    submitted: false,
  },
  {
    id: "hw-5",
    subject: "History",
    title: "Timeline of the Velvet Revolution",
    description:
      "Create an annotated timeline of November–December 1989 with at least 8 key events. One primary source quote per event.",
    teacher: "PhDr. Urban",
    assignedAt: hoursFromNow(-30),
    dueAt: hoursFromNow(-8),
    submitted: false,
  },
  {
    id: "hw-6",
    subject: "German",
    title: "Vocabulary unit 9 + exercises",
    description:
      "Learn the unit 9 vocabulary (Reisen) and complete workbook exercises 1–5. Short quiz at the start of the next lesson.",
    teacher: "Frau Bergerová",
    assignedAt: hoursFromNow(-140),
    dueAt: hoursFromNow(-26),
    submitted: true,
  },
  {
    id: "hw-7",
    subject: "Chemistry",
    title: "Balancing redox equations",
    description:
      "Balance the 10 redox equations on the handout using the half-reaction method. Show oxidation states for every step.",
    teacher: "Mgr. Novák",
    assignedAt: hoursFromNow(-24),
    dueAt: hoursFromNow(7 * 24),
    submitted: false,
  },
  {
    id: "hw-8",
    subject: "Mathematics",
    title: "Prep: logarithm rules quiz",
    description:
      "Review sections 5.1–5.3. Practice set uploaded to EduPage — at least 15 of the 20 problems, answers will be discussed in class.",
    teacher: "Mgr. Horváthová",
    assignedAt: hoursFromNow(-200),
    dueAt: hoursFromNow(-50),
    submitted: true,
  },
];

/** Fake AI draft used by the "Let AI Make My Homework" flow. */
export function buildAiDraft(hw: Homework): string {
  return `# ${hw.title} — AI Draft

## Understanding the task
${hw.description}

## Draft solution
*(Edit me — this is a starting point, not a final answer.)*

1. Restate what the task is asking in your own words.
2. Work through the core steps:
   - Key concept: …
   - Worked example: …
3. Double-check the result against the requirements above.

## Explanation
The approach works because …

## Before you submit
- [ ] Numbers / quotes verified
- [ ] Formatting matches what ${hw.teacher} asked for
- [ ] Rewritten in your own words
`;
}

// ---------- schedule (today) ----------

export interface Period {
  period: number;
  start: string;
  end: string;
  subject: string;
  room: string;
  teacher: string;
  status: "normal" | "modified" | "cancelled";
  note?: string;
}

export const todaySchedule: Period[] = [
  { period: 1, start: "08:00", end: "08:45", subject: "Mathematics", room: "B204", teacher: "Mgr. Horváthová", status: "normal" },
  { period: 2, start: "08:55", end: "09:40", subject: "Physics", room: "LAB2", teacher: "RNDr. Kováč", status: "modified", note: "Moved to LAB2 — equipment demo" },
  { period: 3, start: "10:00", end: "10:45", subject: "English", room: "A112", teacher: "Mr. Whitfield", status: "normal" },
  { period: 4, start: "10:55", end: "11:40", subject: "German", room: "A115", teacher: "Frau Bergerová", status: "cancelled", note: "Teacher absent — self-study" },
  { period: 5, start: "11:50", end: "12:35", subject: "Informatics", room: "C301", teacher: "Ing. Mrázová", status: "normal" },
  { period: 6, start: "13:05", end: "13:50", subject: "History", room: "B110", teacher: "PhDr. Urban", status: "normal" },
];

// ---------- grades & attendance ----------

export interface Grade {
  subject: string;
  value: string;
  weight: string;
  date: string;
}

export const recentGrades: Grade[] = [
  { subject: "Mathematics", value: "1", weight: "test", date: hoursFromNow(-20) },
  { subject: "Physics", value: "2", weight: "lab", date: hoursFromNow(-50) },
  { subject: "English", value: "1", weight: "essay", date: hoursFromNow(-80) },
];

export const attendanceToday = { present: 5, total: 6, label: "1 period cancelled" };
