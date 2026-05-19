"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AdminContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!key) { setError(true); return; }
    fetch(`/api/admin?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        setCount(d.count);
      })
      .catch(() => setError(true));
  }, [key]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <p className="text-slate-500 text-sm">Not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <div className="text-center">
        <p className="text-slate-500 text-sm uppercase tracking-widest mb-2">Emails generated</p>
        {count === null ? (
          <p className="text-slate-600 text-lg">Loading…</p>
        ) : (
          <p className="text-7xl font-bold text-white tabular-nums">{count.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminContent />
    </Suspense>
  );
}
