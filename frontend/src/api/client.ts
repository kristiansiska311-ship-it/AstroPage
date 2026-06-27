// Central API client. All requests go through here so auth, base URL, and
// error handling live in one place. `/api` is proxied to the backend by Vite
// in dev (see vite.config.ts) and by the reverse proxy in production.

import { homeworkData, buildAiDraft, todaySchedule, type Homework } from "../data/mock";

// ── Demo mode ──────────────────────────────────────────────────────────────
// When true, every api.* method returns mock data instead of hitting the network.
let _demoMode = false;
export function setDemoMode(on: boolean): void { _demoMode = on; }
export function isDemoMode(): boolean { return _demoMode; }

const BASE = "/api/v1";

export interface ApiError {
  status: number;
  detail: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    // Send the HttpOnly session cookie on every request.
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw { status: res.status, detail } satisfies ApiError;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface LoginPayload {
  username: string;
  password: string;
  subdomain: string;
}

export interface LoginResponse {
  username: string;
  subdomain: string;
}

// Wire shape returned by GET /homework/list (snake_case, nullable fields).
interface HomeworkItemDTO {
  id: string;
  subject: string | null;
  title: string;
  description: string;
  teacher: string | null;
  assigned_at: string | null;
  due_date: string | null;
  is_done: boolean;
  has_attachments: boolean;
}

export interface HomeworkAttachment {
  name: string;
  url: string;
  type: string | null;
  extension: string | null;
}

function toHomework(item: HomeworkItemDTO): Homework {
  // The UI's date helpers assume non-null ISO strings; fall back gracefully
  // when EduPage omits a due/assigned date.
  const fallbackDate = item.due_date ?? item.assigned_at ?? new Date().toISOString();
  return {
    id: item.id,
    subject: item.subject ?? "General",
    title: item.title,
    description: item.description,
    teacher: item.teacher ?? "Unknown",
    assignedAt: item.assigned_at ?? fallbackDate,
    dueAt: item.due_date ?? fallbackDate,
    submitted: item.is_done,
    hasAttachments: item.has_attachments,
  };
}

// ── Canteen wire shapes (snake_case, nullable fields) ───────────────────────

export interface MenuOptionDTO {
  letter: string;
  name: string | null;
  allergens: string | null;
  weight: string | null;
}

export interface MealDayDTO {
  date: string; // "YYYY-MM-DD"
  open: boolean;
  title: string | null;
  options: MenuOptionDTO[];
  /** Letter of the currently ordered menu, null when signed off / not ordered. */
  ordered_meal: string | null;
  can_be_changed_until: string | null;
}

// ── Grades wire shapes (snake_case, nullable fields) ────────────────────────

interface GradeDTO {
  id: string;
  value: string;
  weight: number;
  description: string;
  date: string | null; // "YYYY-MM-DD"
  max_points: number | null;
}

interface SubjectGradesDTO {
  subject_name: string;
  current_average: number | null;
  is_points: boolean;
  grades: GradeDTO[];
}

interface GradesResponseDTO {
  subjects: SubjectGradesDTO[];
}

/** One official grade on a subject's report card. For points grades `value`
 *  is the earned points and `maxPoints` the maximum (render as "value/max"). */
export interface Grade {
  id: string;
  value: string;
  weight: number;
  description: string;
  date: string | null;
  maxPoints: number | null;
}

/** A subject with its grades and EduPage's average. When `isPoints` is true,
 *  `currentAverage` is a percentage (0–100); otherwise a 1–5 weighted average. */
export interface SubjectGrades {
  subjectName: string;
  currentAverage: number | null;
  isPoints: boolean;
  grades: Grade[];
}

function toSubjectGrades(dto: SubjectGradesDTO): SubjectGrades {
  return {
    subjectName: dto.subject_name,
    currentAverage: dto.current_average,
    isPoints: dto.is_points,
    grades: dto.grades.map((g) => ({
      id: g.id,
      value: g.value,
      weight: g.weight,
      description: g.description,
      date: g.date,
      maxPoints: g.max_points,
    })),
  };
}

// ── Dashboard wire shapes ───────────────────────────────────────────────────

interface PeriodDTO {
  period: number | null;
  start: string;
  end: string;
  subject: string;
  classroom: string | null;
  teacher: string | null;
  is_cancelled: boolean;
  curriculum: string | null;
}

interface DashboardSummaryDTO {
  date: string;
  pending_homework: number;
  due_within_24h: number;
  lessons_total: number;
  lessons_cancelled: number;
  schedule_available: boolean;
  schedule: PeriodDTO[];
}

/** One timetable period on the dashboard. */
export interface DashboardPeriod {
  period: number | null;
  start: string;
  end: string;
  subject: string;
  classroom: string | null;
  teacher: string | null;
  isCancelled: boolean;
  curriculum: string | null;
}

/** Live home-page summary: today's timetable + homework counts. */
export interface DashboardSummary {
  date: string;
  pendingHomework: number;
  dueWithin24h: number;
  lessonsTotal: number;
  lessonsCancelled: number;
  scheduleAvailable: boolean;
  schedule: DashboardPeriod[];
}

function toDashboardSummary(dto: DashboardSummaryDTO): DashboardSummary {
  return {
    date: dto.date,
    pendingHomework: dto.pending_homework,
    dueWithin24h: dto.due_within_24h,
    lessonsTotal: dto.lessons_total,
    lessonsCancelled: dto.lessons_cancelled,
    scheduleAvailable: dto.schedule_available,
    schedule: dto.schedule.map((p) => ({
      period: p.period,
      start: p.start,
      end: p.end,
      subject: p.subject,
      classroom: p.classroom,
      teacher: p.teacher,
      isCancelled: p.is_cancelled,
      curriculum: p.curriculum,
    })),
  };
}

// ── Timetable wire shapes ───────────────────────────────────────────────────

interface TimetableDayDTO {
  date: string;
  available: boolean;
  periods: PeriodDTO[];
}

interface TimetableWeekDTO {
  week_start: string;
  week_offset: number;
  days: TimetableDayDTO[];
}

/** One weekday's lessons. `available` is false when EduPage couldn't load it. */
export interface TimetableDay {
  date: string;
  available: boolean;
  periods: DashboardPeriod[];
}

export interface TimetableWeek {
  weekStart: string;
  weekOffset: number;
  days: TimetableDay[];
}

function toTimetableWeek(dto: TimetableWeekDTO): TimetableWeek {
  return {
    weekStart: dto.week_start,
    weekOffset: dto.week_offset,
    days: dto.days.map((d) => ({
      date: d.date,
      available: d.available,
      periods: d.periods.map((p) => ({
        period: p.period,
        start: p.start,
        end: p.end,
        subject: p.subject,
        classroom: p.classroom,
        teacher: p.teacher,
        isCancelled: p.is_cancelled,
        curriculum: p.curriculum,
      })),
    })),
  };
}

// ── AI homework draft wire shapes ───────────────────────────────────────────

interface DraftResponseDTO {
  assignment_id: string;
  draft: string;
  cached: boolean;
  created_at: string;
}

/** An AI-generated homework draft (Gemini, produced server-side). */
export interface AiDraft {
  assignmentId: string;
  draft: string;
  cached: boolean;
  createdAt: string;
}

export interface OrderResponseDTO {
  date: string;
  ordered_meal: string | null;
}

export interface BulkSignupResponseDTO {
  updated_days: number;
  skipped_days: number;
}

// ── Demo mock data ─────────────────────────────────────────────────────────

const MOCK_GRADES: SubjectGrades[] = [
  {
    subjectName: "Mathematics",
    currentAverage: 1.8,
    isPoints: false,
    grades: [
      { id: "g1", value: "1", weight: 3, description: "Term test", date: "2026-03-15", maxPoints: null },
      { id: "g2", value: "2", weight: 2, description: "Homework check", date: "2026-04-02", maxPoints: null },
      { id: "g3", value: "2", weight: 1, description: "Quiz", date: "2026-05-10", maxPoints: null },
    ],
  },
  {
    subjectName: "Physics",
    currentAverage: 2.1,
    isPoints: false,
    grades: [
      { id: "g4", value: "2", weight: 3, description: "Lab report", date: "2026-03-20", maxPoints: null },
      { id: "g5", value: "3", weight: 2, description: "Test", date: "2026-04-18", maxPoints: null },
      { id: "g6", value: "1", weight: 1, description: "Participation", date: "2026-05-05", maxPoints: null },
    ],
  },
  {
    subjectName: "English",
    currentAverage: 1.3,
    isPoints: false,
    grades: [
      { id: "g7", value: "1", weight: 3, description: "Essay", date: "2026-03-28", maxPoints: null },
      { id: "g8", value: "1", weight: 2, description: "Speaking test", date: "2026-04-25", maxPoints: null },
      { id: "g9", value: "2", weight: 1, description: "Listening", date: "2026-05-20", maxPoints: null },
    ],
  },
  {
    subjectName: "Informatics",
    currentAverage: null,
    isPoints: true,
    grades: [
      { id: "g10", value: "87", weight: 1, description: "Project submission", date: "2026-04-10", maxPoints: 100 },
      { id: "g11", value: "45", weight: 1, description: "Algorithm quiz", date: "2026-05-08", maxPoints: 50 },
    ],
  },
  {
    subjectName: "German",
    currentAverage: 2.5,
    isPoints: false,
    grades: [
      { id: "g12", value: "2", weight: 3, description: "Written exam", date: "2026-03-22", maxPoints: null },
      { id: "g13", value: "3", weight: 2, description: "Dictation", date: "2026-04-30", maxPoints: null },
    ],
  },
  {
    subjectName: "Chemistry",
    currentAverage: 2.2,
    isPoints: false,
    grades: [
      { id: "g14", value: "2", weight: 3, description: "Practical exam", date: "2026-04-05", maxPoints: null },
      { id: "g15", value: "2", weight: 2, description: "Theory test", date: "2026-05-14", maxPoints: null },
      { id: "g16", value: "3", weight: 1, description: "Lab notebook", date: "2026-05-28", maxPoints: null },
    ],
  },
];

function _getDemoDashboard(): DashboardSummary {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const pending = homeworkData.filter((h) => !h.submitted);
  const due24 = pending.filter((h) => {
    const t = new Date(h.dueAt).getTime();
    return t > now && t <= now + h24;
  });
  return {
    date: new Date().toISOString().slice(0, 10),
    pendingHomework: pending.length,
    dueWithin24h: due24.length,
    lessonsTotal: todaySchedule.length,
    lessonsCancelled: todaySchedule.filter((p) => p.status === "cancelled").length,
    scheduleAvailable: true,
    schedule: todaySchedule.map((p) => ({
      period: p.period,
      start: p.start,
      end: p.end,
      subject: p.subject,
      classroom: p.room,
      teacher: p.teacher,
      isCancelled: p.status === "cancelled",
      curriculum: p.note ?? null,
    })),
  };
}

function _getDemoTimetable(offset: number): TimetableWeek {
  const monday = new Date();
  const dow = monday.getDay();
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const basePeriods: DashboardPeriod[] = todaySchedule.map((p) => ({
    period: p.period,
    start: p.start,
    end: p.end,
    subject: p.subject,
    classroom: p.room,
    teacher: p.teacher,
    isCancelled: p.status === "cancelled",
    curriculum: p.note ?? null,
  }));

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekOffset: offset,
    days: [0, 1, 2, 3, 4].map((d) => {
      const day = new Date(monday);
      day.setDate(day.getDate() + d);
      return { date: day.toISOString().slice(0, 10), available: true, periods: basePeriods };
    }),
  };
}

function _getDemoMeals(weeks: number): MealDayDTO[] {
  const meals: MealDayDTO[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() + i);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = day.toISOString().slice(0, 10);
    const isPast = day.getTime() < todayTs;
    meals.push({
      date: dateStr,
      open: true,
      title: null,
      options: [
        { letter: "A", name: "Tomato soup, grilled chicken breast, roasted potatoes", allergens: "1,3", weight: "120/250/150g" },
        { letter: "B", name: "Lentil soup, pasta with bolognese sauce, side salad", allergens: "1,3,7", weight: "130/280g" },
        { letter: "V", name: "Vegetable stir-fry with tofu, steamed rice", allergens: "6", weight: "350g" },
      ],
      ordered_meal: i < 5 ? "A" : null,
      can_be_changed_until: isPast ? null : `${dateStr}T10:00:00`,
    });
  }
  return meals;
}

// ── API ────────────────────────────────────────────────────────────────────

export const api = {
  login: (payload: LoginPayload) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  getDashboard: async (): Promise<DashboardSummary> => {
    if (_demoMode) return _getDemoDashboard();
    return toDashboardSummary(await request<DashboardSummaryDTO>("/dashboard/summary"));
  },
  getTimetable: async (offset = 0): Promise<TimetableWeek> => {
    if (_demoMode) return _getDemoTimetable(offset);
    return toTimetableWeek(await request<TimetableWeekDTO>(`/timetable/week?offset=${offset}`));
  },
  listHomework: async (): Promise<Homework[]> => {
    if (_demoMode) return Promise.resolve([...homeworkData]);
    const items = await request<HomeworkItemDTO[]>("/homework/list");
    return items.map(toHomework);
  },
  listHomeworkAttachments: (id: string) => {
    if (_demoMode) return Promise.resolve<HomeworkAttachment[]>([]);
    return request<HomeworkAttachment[]>(`/homework/${encodeURIComponent(id)}/attachments`);
  },
  setHomeworkDone: (id: string, done: boolean) => {
    if (_demoMode) return Promise.resolve({ assignment_id: id, is_done: done });
    return request<{ assignment_id: string; is_done: boolean }>(
      `/homework/${encodeURIComponent(id)}/done`,
      { method: "POST", body: JSON.stringify({ done }) },
    );
  },
  // Ask the AI assistant (Gemini, backend-side) to draft this assignment. The
  // backend pulls the assignment's attachment files and the student's custom
  // prompt into the request; we only pass the id. `force` regenerates instead
  // of returning a cached draft.
  generateAiDraft: async (assignmentId: string, force = false): Promise<AiDraft> => {
    if (_demoMode) {
      const hw = homeworkData.find((h) => h.id === assignmentId);
      return Promise.resolve({
        assignmentId,
        draft: hw ? buildAiDraft(hw) : "# AI Draft\n\nNo assignment found.",
        cached: false,
        createdAt: new Date().toISOString(),
      });
    }
    const dto = await request<DraftResponseDTO>("/homework/generate-ai", {
      method: "POST",
      body: JSON.stringify({ assignment_id: assignmentId, force }),
    });
    return {
      assignmentId: dto.assignment_id,
      draft: dto.draft,
      cached: dto.cached,
      createdAt: dto.created_at,
    };
  },
  listGrades: async (): Promise<SubjectGrades[]> => {
    if (_demoMode) return Promise.resolve(MOCK_GRADES);
    const body = await request<GradesResponseDTO>("/grades");
    return body.subjects.map(toSubjectGrades);
  },
  listMeals: (weeks = 3): Promise<MealDayDTO[]> => {
    if (_demoMode) return Promise.resolve(_getDemoMeals(weeks));
    return request<MealDayDTO[]>(`/canteen/meals?weeks=${weeks}`);
  },
  // `choice` is a menu letter ("A", "B", …), or null to sign off the meal.
  orderMeal: (date: string, choice: string | null) => {
    if (_demoMode) return Promise.resolve<OrderResponseDTO>({ date, ordered_meal: choice });
    return request<OrderResponseDTO>("/canteen/order", {
      method: "POST",
      body: JSON.stringify({ date, choice }),
    });
  },
  bulkSignup: (daysCount: number, preferredChoice: string) => {
    if (_demoMode) return Promise.resolve<BulkSignupResponseDTO>({ updated_days: daysCount, skipped_days: 0 });
    return request<BulkSignupResponseDTO>("/canteen/bulk-signup", {
      method: "POST",
      body: JSON.stringify({ days_count: daysCount, preferred_choice: preferredChoice }),
    });
  },
};
