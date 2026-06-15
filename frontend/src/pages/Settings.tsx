import { useState, type FormEvent } from "react";
import { BrainCircuit, Check, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DEFAULT_PROMPT =
  "You are a study assistant. Draft and explain solutions step by step so I can " +
  "learn from them — never just hand me a final answer.";

interface AiRules {
  systemPrompt: string;
  stepByStep: boolean;
  simpleLanguage: boolean;
  citeSources: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  // Kept in memory only for now; a real implementation persists via the API,
  // never localStorage.
  const [rules, setRules] = useState<AiRules>({
    systemPrompt: DEFAULT_PROMPT,
    stepByStep: true,
    simpleLanguage: false,
    citeSources: true,
  });
  const [saved, setSaved] = useState(false);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tune the AI assistant and review your account details.
        </p>
      </header>

      {/* AI rules */}
      <form
        onSubmit={handleSave}
        className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6"
        aria-labelledby="ai-rules-heading"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
            <BrainCircuit className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="ai-rules-heading" className="font-semibold text-white">
              AI Assistant Rules
            </h2>
            <p className="text-xs text-slate-500">
              Applied to every homework draft the assistant generates.
            </p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-300">
            Custom system prompt
          </span>
          <textarea
            value={rules.systemPrompt}
            onChange={(e) => setRules((r) => ({ ...r, systemPrompt: e.target.value }))}
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm leading-relaxed text-white placeholder-slate-600 transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="mt-1 block text-xs text-slate-500">
            The study-assistant constraint (draft &amp; explain, never final answers) is always
            appended and cannot be removed.
          </span>
        </label>

        <div className="mt-5 space-y-3">
          <Toggle
            label="Explain step by step"
            description="Drafts include reasoning for every step, not just results."
            checked={rules.stepByStep}
            onChange={(v) => setRules((r) => ({ ...r, stepByStep: v }))}
          />
          <Toggle
            label="Use simpler language"
            description="Prefer shorter sentences and everyday vocabulary."
            checked={rules.simpleLanguage}
            onChange={(v) => setRules((r) => ({ ...r, simpleLanguage: v }))}
          />
          <Toggle
            label="Cite sources"
            description="Include references for facts used in the draft."
            checked={rules.citeSources}
            onChange={(v) => setRules((r) => ({ ...r, citeSources: v }))}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Save AI rules
          </button>
          <span
            aria-live="polite"
            className={[
              "flex items-center gap-1.5 text-sm text-emerald-300 transition-opacity duration-300",
              saved ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <Check className="size-4" aria-hidden />
            Saved
          </span>
        </div>
      </form>

      {/* Account metadata */}
      <section
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
        aria-labelledby="account-heading"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="account-heading" className="font-semibold text-white">
              Account
            </h2>
            <p className="text-xs text-slate-500">Linked EduPage identity.</p>
          </div>
        </div>

        <dl className="divide-y divide-slate-800 text-sm">
          <MetaRow label="Username" value={user?.username ?? "—"} />
          <MetaRow label="School" value={`${user?.subdomain ?? "—"}.edupage.org`} />
          <MetaRow label="Session" value="Encrypted server-side session (HttpOnly cookie)" />
        </dl>

        <p className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Your EduPage password is never stored. To change it, use EduPage directly — AstroPage
          only proxies your session.
        </p>
      </section>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-800 px-4 py-3 text-left transition-colors duration-200 hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <span
        aria-hidden
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-violet-600" : "bg-slate-700",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 size-5 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-200">{value}</dd>
    </div>
  );
}
