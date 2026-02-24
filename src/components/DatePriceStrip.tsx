"use client";

import { useState, useEffect } from "react";
import { CalendarDays, TrendingDown, Loader2 } from "lucide-react";

interface DatePrice {
  date: string;
  price: number | null;
}

interface DatePriceStripProps {
  origin: string;
  destination: string;
  selectedDate: string;
  passengers: string;
  label: string;
  onDateSelect: (date: string) => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short" });
}

export default function DatePriceStrip({
  origin,
  destination,
  selectedDate,
  passengers,
  label,
  onDateSelect,
}: DatePriceStripProps) {
  const [datePrices, setDatePrices] = useState<DatePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 3));
  const today = new Date().toISOString().split("T")[0];
  const validDates = dates.filter((d) => d >= today);

  useEffect(() => {
    if (!expanded) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchPrices = async () => {
      setLoading(true);
      try {
        const promises = validDates.map(async (date) => {
          try {
            const params = new URLSearchParams({
              origin,
              destination,
              departureDate: date,
              passengers,
            });
            const res = await fetch(`/api/flights/search?${params}`, { signal });
            if (!res.ok) return { date, price: null };
            const data = await res.json();
            const flights = data.flights || [];
            const cheapest = flights.length > 0
              ? Math.min(...flights.map((f: { price: number }) => f.price))
              : null;
            return { date, price: cheapest };
          } catch {
            return { date, price: null };
          }
        });

        const results = await Promise.all(promises);
        if (!signal.aborted) setDatePrices(results);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchPrices();
    return () => controller.abort();
  }, [expanded, origin, destination, selectedDate, passengers]); // eslint-disable-line react-hooks/exhaustive-deps

  const cheapestDate = datePrices.reduce<DatePrice | null>((min, dp) => {
    if (dp.price === null) return min;
    if (!min || dp.price < min.price!) return dp;
    return min;
  }, null);

  const selectedDatePrice = datePrices.find((dp) => dp.date === selectedDate);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          {label} — Dates flexibles (±3 jours)
        </div>
        <div className="flex items-center gap-2">
          {cheapestDate && cheapestDate.date !== selectedDate && cheapestDate.price !== null && selectedDatePrice?.price !== null && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {cheapestDate.price}€ le {formatShortDate(cheapestDate.date)}
            </span>
          )}
          <span className="text-slate-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-5 pt-1">
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Recherche des prix sur les dates proches...
            </div>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {validDates.map((date) => {
                const dp = datePrices.find((p) => p.date === date);
                const isSelected = date === selectedDate;
                const isCheapest = cheapestDate?.date === date;
                const price = dp?.price;

                return (
                  <button
                    key={date}
                    onClick={() => {
                      if (date !== selectedDate && price !== null) {
                        onDateSelect(date);
                      }
                    }}
                    disabled={price === null}
                    className={`
                      flex flex-col items-center min-w-[72px] px-2 py-2.5 rounded-xl border text-xs transition-all
                      ${isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : isCheapest
                          ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                          : price !== null
                            ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                      }
                    `}
                  >
                    <span className={`font-medium ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                      {formatWeekday(date)}
                    </span>
                    <span className={`font-semibold ${isSelected ? "text-white" : ""}`}>
                      {formatShortDate(date)}
                    </span>
                    <span className={`mt-1 font-bold text-sm ${
                      isSelected ? "text-white" : isCheapest ? "text-green-600" : ""
                    }`}>
                      {price !== null ? `${price}€` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-2">
            ⚠️ Chaque date consomme 1 recherche API. Cliquez sur une date pour relancer la recherche.
          </p>
        </div>
      )}
    </div>
  );
}
