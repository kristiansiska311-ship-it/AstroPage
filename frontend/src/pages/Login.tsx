import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import LanguageSwitcher from "../components/LanguageSwitcher";
import type { ApiError } from "../api/client";

export default function Login() {
  const { login, loginAsDemo } = useAuth();
  const { t } = useT();
  const isMobile = useIsMobile();
  const [subdomain, setSubdomain] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username, password, subdomain });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 429) {
        setError(t("login.tooManyAttempts"));
      } else {
        setError(apiErr.detail ?? t("login.failed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F2F0E8" }}>
      {/* Left — form panel */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "40px 24px" : "60px 48px",
          overflow: "hidden",
        }}
      >
        {/* Masthead rules */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none" }}>
          <div style={{ height: 2, background: "#CC2B2B" }} />
          <div style={{ height: 1, background: "#E5E3DC", marginTop: 6 }} />
          <div style={{ height: 1, background: "#E5E3DC", marginTop: 4 }} />
        </div>

        {/* Vertical stamp — bottom left */}
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              bottom: 32,
              left: 28,
              pointerEvents: "none",
              fontFamily: "'DM Mono', monospace",
              fontSize: 7,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(19,19,19,0.13)",
              writingMode: "vertical-lr",
              transform: "rotate(180deg)",
              userSelect: "none",
            }}
          >
            AstroPage · Portal · MMXXV
          </div>
        )}

        {/* Faint background "A" watermark */}
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: -20,
              transform: "translateY(-52%)",
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontSize: 380,
              lineHeight: 1,
              color: "rgba(19,19,19,0.028)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            A
          </div>
        )}
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Brand mark */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#CC2B2B",
                marginBottom: 8,
              }}
            >
              EduPage · {t("login.eyebrow")}
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 38,
                fontWeight: 400,
                color: "#131313",
                margin: 0,
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
              }}
            >
              AstroPage
            </h1>
          </div>

          <div style={{ height: 1, background: "#E5E3DC", marginBottom: 28 }} />

          <form onSubmit={handleSubmit}>
            <Field
              label={t("login.school")}
              value={subdomain}
              onChange={setSubdomain}
              placeholder="spsezochova"
              autoComplete="organization"
            />
            <Field
              label={t("login.username")}
              value={username}
              onChange={setUsername}
              placeholder="janko.hrasko"
              autoComplete="username"
            />
            <Field
              label={t("login.password")}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ marginBottom: 20 }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  borderRadius: 4,
                  padding: "9px 12px",
                  marginBottom: 14,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: "#DC2626",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                background: submitting ? "rgba(204,43,43,0.7)" : "#CC2B2B",
                color: "#FFFFFF",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                fontWeight: 500,
                padding: 13,
                textAlign: "center",
                borderRadius: 4,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {submitting ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          {/* Demo access — no EduPage account needed */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 0" }}>
            <div style={{ flex: 1, height: 1, background: "#E5E3DC" }} />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(19,19,19,0.28)",
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: 1, background: "#E5E3DC" }} />
          </div>
          <button
            type="button"
            onClick={loginAsDemo}
            style={{
              width: "100%",
              marginTop: 12,
              background: "transparent",
              color: "rgba(19,19,19,0.60)",
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: 12,
              textAlign: "center",
              borderRadius: 4,
              border: "1px solid #E5E3DC",
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(204,43,43,0.40)";
              e.currentTarget.style.color = "#CC2B2B";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E5E3DC";
              e.currentTarget.style.color = "rgba(19,19,19,0.60)";
            }}
          >
            Try demo — no account needed
          </button>

          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.10em",
              color: "rgba(19,19,19,0.28)",
              marginTop: 14,
              textAlign: "center",
            }}
          >
            {t("settings.passwordNever")}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Right — brand panel (hidden on mobile) */}
      {!isMobile && (
        <div
          style={{
            width: 380,
            flexShrink: 0,
            background: "#111111",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 40px",
            overflow: "hidden",
          }}
        >
          {/* Dot grid + concentric rings */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="login-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="0.9" fill="rgba(255,255,255,0.07)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-dots)" />
            <circle cx="50%" cy="50%" r="155" fill="none" stroke="rgba(204,43,43,0.11)" strokeWidth="1" />
            <circle cx="50%" cy="50%" r="112" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <circle cx="50%" cy="50%" r="70" fill="none" stroke="rgba(204,43,43,0.07)" strokeWidth="0.5" />
          </svg>

          {/* Corner crop marks */}
          {([
            { top: 20, left: 20, borderTop: "1px solid rgba(255,255,255,0.18)", borderLeft: "1px solid rgba(255,255,255,0.18)" },
            { top: 20, right: 20, borderTop: "1px solid rgba(255,255,255,0.18)", borderRight: "1px solid rgba(255,255,255,0.18)" },
            { bottom: 20, left: 20, borderBottom: "1px solid rgba(255,255,255,0.18)", borderLeft: "1px solid rgba(255,255,255,0.18)" },
            { bottom: 20, right: 20, borderBottom: "1px solid rgba(255,255,255,0.18)", borderRight: "1px solid rgba(255,255,255,0.18)" },
          ] as React.CSSProperties[]).map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 18, height: 18, pointerEvents: "none", ...s }} />
          ))}

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                fontSize: 108,
                color: "#CC2B2B",
                lineHeight: 1,
                marginBottom: 20,
                userSelect: "none",
              }}
            >
              A
            </div>
            <div
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 22,
                color: "rgba(255,255,255,0.85)",
                marginBottom: 12,
              }}
            >
              AstroPage
            </div>
            <div
              style={{
                width: 32,
                height: 1,
                background: "#CC2B2B",
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                lineHeight: 1.7,
              }}
            >
              EduPage Portal
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  style?: React.CSSProperties;
}

function Field({ label, value, onChange, type = "text", placeholder, autoComplete, style }: FieldProps) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(19,19,19,0.50)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <input
        type={type}
        required
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          background: "#FFFFFF",
          borderRadius: 4,
        }}
      />
    </div>
  );
}
