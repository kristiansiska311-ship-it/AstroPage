// Compact EN / SK toggle. Used in the sidebar footer and on the login screen.

import { useT } from "../i18n/LanguageContext";
import { LANG_SHORT, LANGS } from "../i18n/translations";

export default function LanguageSwitcher() {
  const { lang, setLang } = useT();
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 4, border: "1px solid rgba(127,127,127,0.20)" }}>
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            style={{
              padding: "4px 9px",
              borderRadius: 3,
              border: "none",
              cursor: active ? "default" : "pointer",
              background: active ? "rgba(204,43,43,0.12)" : "transparent",
              color: active ? "#CC2B2B" : "rgba(127,127,127,0.80)",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.10em",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {LANG_SHORT[l]}
          </button>
        );
      })}
    </div>
  );
}
