import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";

interface AiRules {
  systemPrompt: string;
  stepByStep: boolean;
  simpleLanguage: boolean;
  citeSources: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useT();
  const isMobile = useIsMobile();
  const [rules, setRules] = useState<AiRules>(() => ({
    systemPrompt: t("settings.defaultPrompt"),
    stepByStep: true,
    simpleLanguage: false,
    citeSources: true,
  }));
  const [saved, setSaved] = useState(false);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 40px", maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#CC2B2B", marginBottom: 6 }}>
          {t("settings.accountAi")}
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400, color: "#131313", letterSpacing: "-0.01em" }}>
          {t("settings.title")}
        </div>
      </div>

      {/* AI panel */}
      <form
        onSubmit={handleSave}
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E3DC",
          borderRadius: 10,
          padding: 24,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="#CC2B2B" strokeWidth="1.2" />
            <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4" stroke="#CC2B2B" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#131313" }}>
            {t("settings.aiRules")}
          </span>
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(19,19,19,0.45)", marginBottom: 6 }}>
          {t("settings.promptLabel")}
        </div>
        <textarea
          rows={4}
          value={rules.systemPrompt}
          onChange={(e) => setRules((r) => ({ ...r, systemPrompt: e.target.value }))}
          style={{ width: "100%", padding: 12, fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
        />
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.30)", marginTop: 6, marginBottom: 18 }}>
          {t("settings.promptNote")}
        </div>

        <Toggle
          label={t("settings.presetStepByStep")}
          description={t("settings.presetStepByStepDesc")}
          checked={rules.stepByStep}
          onChange={(v) => setRules((r) => ({ ...r, stepByStep: v }))}
        />
        <Toggle
          label={t("settings.presetSimpler")}
          description={t("settings.presetSimplerDesc")}
          checked={rules.simpleLanguage}
          onChange={(v) => setRules((r) => ({ ...r, simpleLanguage: v }))}
        />
        <Toggle
          label={t("settings.presetCite")}
          description={t("settings.presetCiteDesc")}
          checked={rules.citeSources}
          onChange={(v) => setRules((r) => ({ ...r, citeSources: v }))}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button
            type="submit"
            style={{
              background: "#CC2B2B",
              color: "#FFFFFF",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "10px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {t("settings.save")}
          </button>
          {saved && (
            <span
              aria-live="polite"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#16A34A",
              }}
            >
              ✓ {t("settings.saved")}
            </span>
          )}
        </div>
      </form>

      {/* Account panel */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E3DC",
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="3" stroke="#CC2B2B" strokeWidth="1.2" />
            <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="#CC2B2B" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#131313" }}>
            {t("settings.account")}
          </span>
        </div>

        <MetaRow label={t("login.username")} value={user?.username ?? "—"} />
        <MetaRow label={t("common.school")} value={`${user?.subdomain ?? "—"}.edupage.org`} />
        <MetaRow label={t("settings.session")} value={t("settings.sessionValue")} />

        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(22,163,74,0.06)",
            border: "1px solid rgba(22,163,74,0.20)",
            borderRadius: 4,
            padding: "10px 14px",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L1 5v3c0 3 2.5 5 6 5s6-2 6-5V5L7 1z" stroke="#16A34A" strokeWidth="1.2" />
            <path d="M4.5 7l1.5 1.5L9.5 5" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#16A34A" }}>
            {t("settings.passwordNever")}
          </span>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderTop: "1px solid #E5E3DC",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#131313", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(19,19,19,0.45)" }}>
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "#CC2B2B" : "rgba(19,19,19,0.10)",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
          border: "none",
          transition: "background 0.2s",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 10,
        padding: "11px 0",
        borderTop: "1px solid #E5E3DC",
      }}
    >
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(19,19,19,0.38)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(19,19,19,0.70)" }}>
        {value}
      </span>
    </div>
  );
}
