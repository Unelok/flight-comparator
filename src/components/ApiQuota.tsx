"use client";

import { useState, useEffect } from "react";
import { Plane, MapPin } from "lucide-react";

interface CategoryUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface UsageResponse {
  flights: CategoryUsage;
  airports: CategoryUsage;
}

function QuotaBar({ label, icon: Icon, usage }: { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; usage: CategoryUsage }) {
  const pct = (usage.remaining / usage.limit) * 100;
  const color =
    pct > 50 ? "text-green-600 bg-green-50 border-green-200" :
    pct > 20 ? "text-amber-600 bg-amber-50 border-amber-200" :
               "text-red-600 bg-red-50 border-red-200";
  const barColor =
    pct > 50 ? "bg-green-500" :
    pct > 20 ? "bg-amber-500" :
               "bg-red-500";

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label} {usage.remaining.toLocaleString()}/{usage.limit.toLocaleString()}</span>
      <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ApiQuota() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then(setUsage)
      .catch(() => null);
  }, []);

  // Refresh quota when the window regains focus
  useEffect(() => {
    const refresh = () => {
      fetch("/api/usage")
        .then((res) => res.json())
        .then(setUsage)
        .catch(() => null);
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  if (!usage) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <QuotaBar label="Vols" icon={Plane} usage={usage.flights} />
      <QuotaBar label="Aéroports" icon={MapPin} usage={usage.airports} />
    </div>
  );
}
