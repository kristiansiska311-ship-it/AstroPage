import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import LanguageSwitcher from "./LanguageSwitcher";


const ACCENT = "#CC2B2B";
const ACTIVE_DIM = "rgba(204,43,43,0.10)";
const SIDEBAR_TEXT = "rgba(255,255,255,0.72)";
const SIDEBAR_MUTED = "rgba(255,255,255,0.30)";


const itemBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 12px",
  borderRadius: 5,
  cursor: "pointer",
  textDecoration: "none",
  position: "relative",
};

function NavItem({
  to,
  end,
  label,
  icon,
  onClick,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: (color: string) => React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration: "none", display: "block" }} onClick={onClick}>
      {({ isActive }) => (
        <div
          style={{
            ...itemBase,
            background: isActive ? ACTIVE_DIM : "transparent",
            borderLeft: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
            paddingLeft: 10,
          }}
        >
          {icon(isActive ? ACCENT : SIDEBAR_TEXT)}
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "#FFFFFF" : SIDEBAR_TEXT,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { user, logout } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const initials = (user?.username ?? "S").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Logo */}
      <div
        style={{
          padding: "22px 16px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              color: ACCENT,
              letterSpacing: "0.04em",
            }}
          >
            A/
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "0.02em",
            }}
          >
            AstroPage
          </span>
        </div>
      </div>

      {/* User card */}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 4,
            background: ACTIVE_DIM,
            border: `1px solid ${ACCENT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            color: ACCENT,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.username ?? t("common.student")}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.03em",
              marginTop: 2,
            }}
          >
            {user?.subdomain ?? "school"}.edupage.org
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        <NavItem
          to="/"
          end
          label={t("nav.dashboard")}
          onClick={onNavClick}
          icon={(c) => (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2" y="2" width="5" height="5" rx="1" stroke={c} strokeWidth="1.3" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke={c} strokeWidth="1.3" />
              <rect x="2" y="9" width="5" height="5" rx="1" stroke={c} strokeWidth="1.3" />
              <rect x="9" y="9" width="5" height="5" rx="1" stroke={c} strokeWidth="1.3" />
            </svg>
          )}
        />
        <NavItem
          to="/homework"
          label={t("nav.homework")}
          onClick={onNavClick}
          icon={(c) => (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={c} strokeWidth="1.3" />
              <path d="M5 5h6M5 8h6M5 11h4" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          )}
        />
        <NavItem
          to="/timetable"
          label={t("nav.timetable")}
          onClick={onNavClick}
          icon={(c) => (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2" y="3" width="12" height="11" rx="1.5" stroke={c} strokeWidth="1.3" />
              <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          )}
        />
        <NavItem
          to="/grades"
          label={t("nav.grades")}
          onClick={onNavClick}
          icon={(c) => (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 2L1 5.5l7 3.5 7-3.5L8 2z" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M4 7.2v3.3c0 .8 1.8 1.8 4 1.8s4-1 4-1.8V7.2M14 6v3.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        />
        <NavItem
          to="/canteen"
          label={t("nav.canteen")}
          onClick={onNavClick}
          icon={(c) => (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M4 2v4a3 3 0 006 0V2M7 2v4M7 9v5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
              <path d="M13 2v5c0 1.1-.9 2-2 2v4" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          )}
        />
      </nav>

      {/* Bottom */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "8px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 8px" }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: SIDEBAR_MUTED,
            }}
          >
            {t("lang.label")}
          </span>
          <LanguageSwitcher />
        </div>
        <NavItem
          to="/settings"
          label={t("nav.settings")}
          onClick={onNavClick}
          icon={(c) => (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="2.5" stroke={c} strokeWidth="1.3" />
              <path
                d="M8 1.5v1M8 13.5v1M14.5 8h-1M2.5 8h-1M12.6 3.4l-.7.7M4.1 11.9l-.7.7M12.6 12.6l-.7-.7M4.1 4.1l-.7-.7"
                stroke={c}
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          )}
        />
        <LogoutButton onClick={handleLogout} label={t("nav.logout")} />
      </div>
    </>
  );
}

function DemoBanner() {
  return (
    <div
      style={{
        background: "rgba(204,43,43,0.07)",
        borderBottom: "1px solid rgba(204,43,43,0.18)",
        padding: "7px 20px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#CC2B2B", flexShrink: 0 }} />
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#CC2B2B",
        }}
      >
        Demo mode — sample data only, changes are not saved
      </span>
    </div>
  );
}

export default function AppLayout() {
  const isMobile = useIsMobile();
  const { isDemo } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openDrawer() { setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); }

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#F2F0E8" }}>
        {/* Mobile top bar */}
        <header
          style={{
            height: 52,
            minHeight: 52,
            background: "#111111",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            zIndex: 40,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Open menu"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <span style={{ width: 18, height: 1.5, background: "rgba(255,255,255,0.7)", display: "block" }} />
            <span style={{ width: 18, height: 1.5, background: "rgba(255,255,255,0.7)", display: "block" }} />
            <span style={{ width: 18, height: 1.5, background: "rgba(255,255,255,0.7)", display: "block" }} />
          </button>

          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: "#CC2B2B" }}>A/</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>AstroPage</span>
          </div>

          {/* Spacer for centering */}
          <div style={{ width: 34 }} />
        </header>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "#F2F0E8", display: "flex", flexDirection: "column" }}>
          {isDemo && <DemoBanner />}
          <div style={{ flex: 1 }}><Outlet /></div>
        </main>

        {/* Off-canvas drawer backdrop */}
        {drawerOpen && (
          <div
            onClick={closeDrawer}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 59,
            }}
          />
        )}

        {/* Off-canvas drawer */}
        <aside
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 260,
            background: "#111111",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 60,
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.28s cubic-bezier(0.2,0.7,0.15,1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "14px 14px 0",
            }}
          >
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <SidebarContent onNavClick={closeDrawer} />
        </aside>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "#F2F0E8" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 236,
          minWidth: 236,
          background: "#111111",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "#F2F0E8", display: "flex", flexDirection: "column" }}>
        {isDemo && <DemoBanner />}
        <div style={{ flex: 1 }}><Outlet /></div>
      </main>
    </div>
  );
}

function LogoutButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 5,
        cursor: "pointer",
        background: "transparent",
        border: "none",
        borderLeft: "2px solid transparent",
        width: "100%",
        textAlign: "left",
        transition: "background 0.15s",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 11l3-3-3-3M13.5 8H6"
          stroke="rgba(220,100,100,0.55)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(220,100,100,0.50)" }}>
        {label}
      </span>
    </button>
  );
}
