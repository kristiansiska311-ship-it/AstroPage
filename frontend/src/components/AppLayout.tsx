import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, BookOpen, GraduationCap, UtensilsCrossed, UserCog, LogOut, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/homework", label: "Homework", icon: BookOpen },
  { to: "/grades", label: "Grades", icon: GraduationCap },
  { to: "/canteen", label: "Canteen", icon: UtensilsCrossed },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
    isActive
      ? "bg-violet-500/15 text-violet-300 shadow-[inset_2px_0_0_0_theme(colors.violet.400)]"
      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
  ].join(" ");
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const initials = (user?.username ?? "S").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-dvh bg-slate-950 text-slate-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
        {/* Branding */}
        <div className="px-5 pb-2 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-violet-600/20 text-violet-300">
              <Rocket className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white [text-shadow:0_0_18px_rgb(139_92_246/0.6)]">
              AstroPage
            </span>
          </div>
        </div>

        {/* User snippet */}
        <div className="mx-4 mb-4 mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-semibold text-violet-300">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">
              {user?.username ?? "Student"}
            </p>
            <span className="mt-0.5 inline-block max-w-full truncate rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[11px] font-medium text-violet-300">
              {user?.subdomain ?? "school"}.edupage.org
            </span>
          </div>
        </div>

        {/* Primary navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4" aria-label="Main">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="size-4.5 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Utility group */}
        <div className="space-y-1 border-t border-slate-800 px-4 py-4">
          <NavLink to="/settings" className={navClass}>
            <UserCog className="size-4.5 shrink-0" aria-hidden />
            Edit Account
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="size-4.5 shrink-0" aria-hidden />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
