"use client";

import { useState } from "react";

const TONES = [
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "friendly",     label: "Friendly",     emoji: "😊" },
  { id: "firm",         label: "Firm & Direct", emoji: "✊" },
  { id: "apologetic",   label: "Apologetic",    emoji: "🙏" },
  { id: "chasing",      label: "Chasing",       emoji: "💸" },
  { id: "formal",       label: "Formal / HR",   emoji: "📋" },
];

type Mode = "polish" | "reply" | "generate";
type Result = { subject: string; rewritten: string; shorter: string };

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "reply",    label: "Write a reply",     desc: "Paste in an email you've received" },
  { id: "polish",   label: "Polish my draft",   desc: "Improve something you've already written" },
  { id: "generate", label: "Write from scratch", desc: "Start with bullet points or a brief" },
];

export default function Home() {
  const [mode, setMode]     = useState<Mode>("reply");
  const [tone, setTone]     = useState("professional");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [copied, setCopied] = useState<"full" | "short" | "subject" | null>(null);
  const [activeOutput, setActiveOutput] = useState<"full" | "short">("full");

  // Polish mode
  const [draft, setDraft] = useState("");

  // Reply mode — two steps
  const [thread, setThread]       = useState("");
  const [replyStep, setReplyStep] = useState<"paste" | "questions">("paste");
  const [analysing, setAnalysing] = useState(false);
  const [summary, setSummary]     = useState("");
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [answers, setAnswers]     = useState<Record<string, string>>({});

  // Generate mode
  const [about, setAbout]         = useState("");
  const [recipient, setRecipient] = useState("");
  const [points, setPoints]       = useState("");

  async function handleAnalyse() {
    if (!thread.trim()) { setError("Please paste the email you want to reply to."); return; }
    setAnalysing(true);
    setError("");
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not analyse the email."); return; }
      setSummary(data.summary ?? "");
      setQuestions(data.questions ?? []);
      setAnswers({});
      setReplyStep("questions");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAnalysing(false);
    }
  }

  function buildPayload(): Record<string, unknown> | null {
    if (mode === "reply") {
      if (!thread.trim()) { setError("Please paste the email you want to reply to."); return null; }
      const answersArray = questions.map((q) => ({ question: q.question, answer: answers[q.id] ?? "" }));
      return { type: "reply", thread, answers: answersArray, tone };
    }
    if (mode === "polish") {
      if (!draft.trim()) { setError("Please paste your draft email."); return null; }
      return { type: "rewrite", email: draft, tone };
    }
    if (!about.trim()) { setError("Please describe what the email is about."); return null; }
    return { type: "generate", about, recipient, points, tone };
  }

  async function handleSubmit() {
    setError("");
    const payload = buildPayload();
    if (!payload) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload as Record<string, string>),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); return; }
      setResult(data);
      setActiveOutput("full");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, type: "full" | "short" | "subject") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const buttonLabel = mode === "reply" ? "Write my reply" : mode === "polish" ? "Polish my email" : "Write my email";

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-base">⚡</div>
            <span className="font-bold text-lg tracking-tight">Whizz Mail</span>
            <span className="hidden sm:inline text-slate-500 text-sm">— AI Email Writer</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Stop agonising over work emails
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Reply to emails, polish drafts, or write from scratch — in seconds.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6 max-w-2xl mx-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResult(null); setError(""); setReplyStep("paste"); }}
              className={`flex-1 px-4 py-3 rounded-xl border text-left transition-all ${
                mode === m.id
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              <p className="font-semibold text-sm">{m.label}</p>
              <p className={`text-xs mt-0.5 ${mode === m.id ? "text-indigo-200" : "text-slate-500"}`}>{m.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">

              {/* Reply mode — step 1: paste */}
              {mode === "reply" && replyStep === "paste" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Email or thread to reply to
                    </label>
                    <textarea
                      value={thread}
                      onChange={(e) => setThread(e.target.value)}
                      placeholder="Paste the email or conversation thread here…"
                      rows={10}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                    />
                  </div>
                  <button
                    onClick={handleAnalyse}
                    disabled={analysing || !thread.trim()}
                    className="w-full py-3.5 rounded-xl font-semibold text-base transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                  >
                    {analysing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Reading your email…
                      </span>
                    ) : "Analyse this email ⚡"}
                  </button>
                </>
              )}

              {/* Reply mode — step 2: answer questions */}
              {mode === "reply" && replyStep === "questions" && (
                <>
                  <div className="bg-slate-800/60 rounded-xl border border-slate-700 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">About this email</p>
                    <p className="text-slate-200 text-sm leading-relaxed">{summary}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {questions.map((q) => (
                      <div key={q.id}>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">{q.question}</label>
                        <textarea
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Your answer…"
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { setReplyStep("paste"); setResult(null); }}
                    className="text-slate-500 hover:text-slate-400 text-sm transition-colors text-left"
                  >
                    ← Change email
                  </button>
                </>
              )}

              {/* Polish mode */}
              {mode === "polish" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Your draft or bullet points
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={"e.g.\n- chase Sarah about invoice from last month\n- be polite but firm\n- ask for update by Friday"}
                    rows={10}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                  />
                </div>
              )}

              {/* Generate mode */}
              {mode === "generate" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      What is this email about? <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="e.g. Chase invoice from last month, ask for update by Friday"
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Who are you writing to? <span className="text-slate-600 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="e.g. My manager, a client, Sarah"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Key points to include <span className="text-slate-600 normal-case font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder={"e.g.\n- reference invoice #1042\n- deadline is end of week\n- keep it brief"}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                    />
                  </div>
                </>
              )}

              {/* Tone — hidden on reply step 1 */}
              {!(mode === "reply" && replyStep === "paste") && <div>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Tone</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        tone === t.id
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white"
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>}

              {!(mode === "reply" && replyStep === "paste") && <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-base transition-all
                  bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  shadow-lg shadow-indigo-900/30 text-white"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Working on it…
                  </span>
                ) : (
                  `${buttonLabel} ⚡`
                )}
              </button>}

              {error && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Output panel */}
          <div className="flex flex-col gap-4">
            {result ? (
              <>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      Subject line
                    </p>
                    <button
                      onClick={() => copyText(result.subject, "subject")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      {copied === "subject" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-slate-100 font-medium">{result.subject}</p>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                      {(["full", "short"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setActiveOutput(v)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            activeOutput === v ? "bg-slate-600 text-white" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {v === "full" ? "Full email" : "Short version"}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => copyText(activeOutput === "full" ? result.rewritten : result.shorter, activeOutput)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      {copied === activeOutput ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap min-h-[200px]">
                    {activeOutput === "full" ? result.rewritten : result.shorter}
                  </div>

                  <button
                    onClick={() => copyText(activeOutput === "full" ? result.rewritten : result.shorter, activeOutput)}
                    className="mt-3 w-full py-2.5 rounded-xl border border-indigo-700 text-indigo-400 hover:bg-indigo-950 hover:text-indigo-300 transition-colors text-sm font-medium"
                  >
                    {copied === activeOutput ? "Copied to clipboard!" : "Copy to clipboard"}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex-1 flex flex-col items-center justify-center text-center gap-4">
                <div className="text-5xl">⚡</div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">Your email will appear here</p>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    {mode === "reply" && "Paste the email you received, add any notes, and hit the button."}
                    {mode === "polish" && "Paste your rough draft or bullet points and hit the button."}
                    {mode === "generate" && "Describe what you need and hit the button."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                  {["Full polished email", "Short version (2 to 3 sentences)", "Suggested subject line"].map((item) => (
                    <div key={item} className="text-sm text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-5 text-center text-slate-600 text-sm">
        Whizz Mail
      </footer>
    </div>
  );
}
