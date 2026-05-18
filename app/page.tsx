"use client";

import { useState, useEffect } from "react";

const FREE_LIMIT = 3;
const STORAGE_KEY = "whizzmail_count";

const TONES = [
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "friendly", label: "Friendly", emoji: "😊" },
  { id: "firm", label: "Firm & Direct", emoji: "✊" },
  { id: "apologetic", label: "Apologetic", emoji: "🙏" },
  { id: "chasing", label: "Chasing Payment", emoji: "💸" },
  { id: "formal", label: "Formal / HR", emoji: "📋" },
];

type Result = {
  subject: string;
  rewritten: string;
  shorter: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [copied, setCopied] = useState<"full" | "short" | "subject" | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeOutput, setActiveOutput] = useState<"full" | "short">("full");

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    setUsageCount(stored);
  }, []);

  const remaining = Math.max(0, FREE_LIMIT - usageCount);

  async function handleRewrite() {
    if (!input.trim()) return;

    if (usageCount >= FREE_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input, tone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem(STORAGE_KEY, String(newCount));
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

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-base">
              ✉️
            </div>
            <span className="font-bold text-lg tracking-tight">Whizz Mail</span>
            <span className="hidden sm:inline text-slate-500 text-sm">— AI Email Rewriter</span>
          </div>
          <div className="flex items-center gap-4">
            {remaining > 0 ? (
              <span className="text-sm text-slate-400">
                <span className="text-indigo-400 font-semibold">{remaining}</span> free{" "}
                {remaining === 1 ? "use" : "uses"} remaining
              </span>
            ) : (
              <button
                onClick={() => setShowUpgrade(true)}
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full transition-colors font-medium"
              >
                Upgrade — £4.99/mo
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Stop agonising over work emails
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Paste your rough draft or bullet points, pick a tone, and get a polished
            email ready to send — in seconds.
          </p>
        </div>

        {/* Tool */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Your draft or bullet points
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  "e.g.\n- chase Sarah about invoice from last month\n- be polite but firm\n- ask for update by Friday"
                }
                rows={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm leading-relaxed"
              />

              <div>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Tone
                </p>
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
              </div>

              <button
                onClick={handleRewrite}
                disabled={loading || !input.trim()}
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
                    Polishing your email…
                  </span>
                ) : (
                  "Polish my email ✨"
                )}
              </button>

              {error && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
            </div>

            {/* Social proof */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Works great for
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Chasing invoices",
                  "Emailing your boss",
                  "Client updates",
                  "HR emails",
                  "Complaint letters",
                  "Follow-ups",
                  "Apology emails",
                  "Negotiating",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs border border-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Output panel */}
          <div className="flex flex-col gap-4">
            {result ? (
              <>
                {/* Subject line */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      Suggested subject line
                    </p>
                    <button
                      onClick={() => copyText(result.subject, "subject")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      {copied === "subject" ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-slate-100 font-medium">{result.subject}</p>
                </div>

                {/* Email body */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                      <button
                        onClick={() => setActiveOutput("full")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeOutput === "full"
                            ? "bg-slate-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Full email
                      </button>
                      <button
                        onClick={() => setActiveOutput("short")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeOutput === "short"
                            ? "bg-slate-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Short version
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        copyText(
                          activeOutput === "full" ? result.rewritten : result.shorter,
                          activeOutput
                        )
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      {copied === activeOutput ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap min-h-[200px]">
                    {activeOutput === "full" ? result.rewritten : result.shorter}
                  </div>

                  <button
                    onClick={() =>
                      copyText(
                        activeOutput === "full" ? result.rewritten : result.shorter,
                        activeOutput
                      )
                    }
                    className="mt-3 w-full py-2.5 rounded-xl border border-indigo-700 text-indigo-400 hover:bg-indigo-950 hover:text-indigo-300 transition-colors text-sm font-medium"
                  >
                    {copied === activeOutput ? "✓ Copied to clipboard!" : "📋 Copy to clipboard"}
                  </button>
                </div>

                {remaining <= 1 && remaining > 0 && (
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-sm text-amber-300">
                    <strong>Last free use!</strong> Upgrade for unlimited emails — only £4.99/month.
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex-1 flex flex-col items-center justify-center text-center gap-4">
                <div className="text-5xl">✉️</div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">Your polished email will appear here</p>
                  <p className="text-slate-500 text-sm">
                    Paste your rough draft on the left, choose a tone, and hit the button
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                  {[
                    "📝 Full polished email",
                    "✂️ Short version (2–3 sentences)",
                    "📌 Suggested subject line",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* How it works strip */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Paste your draft", desc: "Type a few bullet points or your rough email. Grammar and spelling don't matter." },
            { step: "2", title: "Pick your tone", desc: "Professional, friendly, firm, apologetic — we've got every work situation covered." },
            { step: "3", title: "Copy and send", desc: "Get a polished email with a subject line, ready to paste straight into your inbox." },
          ].map((item) => (
            <div key={item.step} className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
              <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-400 text-sm font-bold flex items-center justify-center mb-3">
                {item.step}
              </div>
              <p className="font-semibold text-slate-200 mb-1">{item.title}</p>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-5 text-center text-slate-600 text-sm">
        Whizz Mail · {FREE_LIMIT} free emails, then £4.99/month for unlimited
      </footer>

      {/* Upgrade modal */}
      {showUpgrade && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setShowUpgrade(false)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold mb-2">You&#39;ve used your free emails</h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Upgrade to Whizz Mail Pro for unlimited email rewrites, all tones, and priority AI processing.
            </p>
            <div className="bg-slate-800 rounded-xl p-5 mb-6 border border-slate-700">
              <p className="text-3xl font-bold text-white mb-1">
                £4.99<span className="text-lg font-normal text-slate-400">/month</span>
              </p>
              <p className="text-slate-400 text-sm">Cancel any time. Less than a coffee a month.</p>
              <ul className="mt-4 text-sm text-slate-300 text-left space-y-2">
                {["Unlimited email rewrites", "All 6 tones", "Short version included", "Subject line every time"].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-indigo-400">✓</span> {f}
                    </li>
                  )
                )}
              </ul>
            </div>
            <a
              href="https://buy.stripe.com/YOUR_STRIPE_PAYMENT_LINK"
              className="block w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors mb-3"
            >
              Get Unlimited Access
            </a>
            <button
              onClick={() => setShowUpgrade(false)}
              className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
