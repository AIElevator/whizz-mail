"use client";

import { useState, useEffect, useCallback } from "react";

/* global Office */
declare const Office: any; // eslint-disable-line @typescript-eslint/no-explicit-any

const APP_NAME = "Whizz Mail";

const TONES = [
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "friendly",     label: "Friendly",     emoji: "😊" },
  { id: "firm",         label: "Firm & Direct", emoji: "✊" },
  { id: "apologetic",   label: "Apologetic",    emoji: "🙏" },
  { id: "chasing",      label: "Chasing",       emoji: "💸" },
  { id: "formal",       label: "Formal / HR",   emoji: "📋" },
];

type Screen = "loading" | "read-prompt" | "write" | "polish" | "result";
type OutlookMode = "compose" | "read";
type Result = { subject: string; rewritten: string; shorter: string };

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function ToneGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {TONES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border ${
            value === t.id
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          }`}
        >
          <span>{t.emoji}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function WhizzMailAddin() {
  const [screen, setScreen]           = useState<Screen>("loading");
  const [outlookMode, setOutlookMode] = useState<OutlookMode>("read");
  const [emailBody, setEmailBody]     = useState("");       // raw body from Outlook
  const [input, setInput]             = useState("");       // editable draft for polish screen
  const [tone, setTone]               = useState("professional");
  const [result, setResult]           = useState<Result | null>(null);
  const [activeOutput, setActiveOutput] = useState<"full" | "short">("full");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [copied, setCopied]           = useState(false);
  const [inserted, setInserted]       = useState(false);

  // Write-from-scratch form
  const [about, setAbout]         = useState("");
  const [recipient, setRecipient] = useState("");
  const [points, setPoints]       = useState("");

  // ─── Office init ──────────────────────────────────────────────────────────
  const initOffice = useCallback(() => {
    Office.onReady((info: { host: string }) => {
      if (info.host !== "Outlook") return;

      const item = Office.context.mailbox.item;
      const isCompose = !!item?.body?.setAsync;
      setOutlookMode(isCompose ? "compose" : "read");

      item.body.getAsync(
        "text",
        (res: { status: string; value: string }) => {
          if (res.status === "succeeded") {
            const body = res.value.trim();
            setEmailBody(body);

            if (!isCompose) {
              // Reading an email — show the prompt
              setScreen("read-prompt");
            } else if (!body) {
              // New blank compose — offer to write from scratch
              // Try to pre-fill recipient name
              item.to?.getAsync?.((toRes: { status: string; value: Array<{ displayName: string }> }) => {
                if (toRes.status === "succeeded" && toRes.value?.length) {
                  setRecipient(toRes.value[0].displayName);
                }
              });
              setScreen("write");
            } else {
              // Composing with existing content — go straight to polish
              setInput(body);
              setScreen("polish");
            }
          } else {
            // Fallback: still show appropriate screen
            setScreen(isCompose ? "write" : "read-prompt");
          }
        }
      );
    });
  }, []);

  useEffect(() => {
    if (typeof Office !== "undefined" && Office.onReady) {
      initOffice();
    } else {
      const interval = setInterval(() => {
        if (typeof Office !== "undefined" && Office.onReady) {
          clearInterval(interval);
          initOffice();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [initOffice]);

  // ─── API call ─────────────────────────────────────────────────────────────
  async function callApi(payload: Record<string, string>) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setResult(data);
      setActiveOutput("full");
      setScreen("result");
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleImprove() {
    callApi({ type: "rewrite", email: input || emailBody });
  }

  function handleGenerate() {
    if (!about.trim()) { setError("Please describe what the email is about."); return; }
    callApi({ type: "generate", about, recipient, points });
  }

  // ─── Insert / copy helpers ────────────────────────────────────────────────
  function insertIntoEmail() {
    if (!result) return;
    const body = activeOutput === "full" ? result.rewritten : result.shorter;
    Office.context.mailbox.item.body.setAsync(
      body,
      { coercionType: "text" },
      (res: { status: string }) => {
        if (res.status === "succeeded") {
          setInserted(true);
          setTimeout(() => setInserted(false), 3000);
          if (result.subject) {
            Office.context.mailbox.item.subject?.setAsync(result.subject, () => {});
          }
        }
      }
    );
  }

  async function copyText() {
    if (!result) return;
    const text = activeOutput === "full" ? result.rewritten : result.shorter;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setResult(null);
    setError("");
    setInserted(false);
    setCopied(false);
    if (outlookMode === "read") setScreen("read-prompt");
    else if (!emailBody) setScreen("write");
    else { setInput(emailBody); setScreen("polish"); }
  }

  // ─── Header ───────────────────────────────────────────────────────────────
  const Header = ({ back }: { back?: () => void }) => (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 flex-shrink-0">
      {back && (
        <button onClick={back} className="text-slate-500 hover:text-slate-300 mr-1 transition-colors">
          ←
        </button>
      )}
      <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-xs">⚡</div>
      <span className="font-bold text-sm tracking-tight">{APP_NAME}</span>
    </div>
  );

  // ─── Screens ──────────────────────────────────────────────────────────────

  // Loading
  if (screen === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl">⚡</div>
        <p className="text-slate-400 text-sm">Connecting to Outlook…</p>
        <Spinner />
      </div>
    );
  }

  // Read mode — "Would you like to improve this email?"
  if (screen === "read-prompt") {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-3xl">
            ⚡
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">You have a new email</p>
            <h2 className="text-lg font-bold text-white leading-snug">
              Would you like to improve the impact of this email with{" "}
              <span className="text-indigo-400">{APP_NAME}</span>?
            </h2>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => { setInput(emailBody); setScreen("polish"); }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
            >
              Yes, improve it ✨
            </button>
            <p className="text-xs text-slate-500 mt-1">
              Or just read it below — no action required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compose, empty body — write from scratch
  if (screen === "write") {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="text-center py-2">
            <p className="text-xs text-slate-500 mb-0.5">New email</p>
            <h2 className="font-bold text-white text-base">
              Write an email with <span className="text-indigo-400">{APP_NAME}</span>
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              What&apos;s this email about? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="e.g. Chase invoice from last month, ask for update by Friday"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Who are you writing to? <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. My manager, a client, Sarah"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Key points to include <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder={"e.g.\n- reference invoice #1042\n- deadline is end of week\n- keep it brief"}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tone</p>
            <ToneGrid value={tone} onChange={setTone} />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !about.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Spinner /> Writing your email…</span>
            ) : (
              "Write my email ⚡"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Compose with existing content — polish flow
  if (screen === "polish") {
    return (
      <div className="flex flex-col h-full">
        <Header back={outlookMode === "read" ? () => setScreen("read-prompt") : undefined} />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email draft
              </label>
              {outlookMode === "compose" && emailBody && (
                <button
                  onClick={() => setInput(emailBody)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  ↺ Reset
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={7}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tone</p>
            <ToneGrid value={tone} onChange={setTone} />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleImprove}
            disabled={loading || !input.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Spinner /> Improving…</span>
            ) : (
              "Improve this email ✨"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Result screen
  if (screen === "result" && result) {
    return (
      <div className="flex flex-col h-full">
        <Header back={reset} />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

          {/* Subject */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject line</p>
            <p className="text-slate-200 text-sm font-medium">{result.subject}</p>
          </div>

          {/* Body */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 flex flex-col gap-3">
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {(["full", "short"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setActiveOutput(v)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeOutput === v ? "bg-slate-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {v === "full" ? "Full email" : "Short version"}
                </button>
              ))}
            </div>

            <div className="bg-slate-950 rounded-lg p-3 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
              {activeOutput === "full" ? result.rewritten : result.shorter}
            </div>

            <div className="flex gap-2">
              {outlookMode === "compose" && (
                <button
                  onClick={insertIntoEmail}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  {inserted ? "✓ Inserted!" : "Insert into email"}
                </button>
              )}
              <button
                onClick={copyText}
                className={`${outlookMode === "compose" ? "flex-1" : "w-full"} py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium transition-colors`}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <button
            onClick={reset}
            className="text-slate-500 hover:text-slate-400 text-xs text-center transition-colors py-1"
          >
            ← Start over
          </button>
        </div>
      </div>
    );
  }

  return null;
}
