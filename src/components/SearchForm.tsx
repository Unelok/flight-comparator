"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Users } from "lucide-react";
import MultiAirportSearch from "./MultiAirportSearch";
import AirportSearch from "./AirportSearch";

export default function SearchForm() {
  const router = useRouter();
  const [origins, setOrigins] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (origins.length === 0 || !destination || !departureDate) return;

    const params = new URLSearchParams({
      origin: origins.join(","),
      destination,
      departureDate,
      passengers: passengers.toString(),
    });

    if (returnDate) params.set("returnDate", returnDate);

    setLoading(true);
    router.push(`/results?${params.toString()}`);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Origines (multi-select) */}
          <MultiAirportSearch
            label="Départ (plusieurs aéroports possibles)"
            values={origins}
            onChange={(codes) => setOrigins(codes)}
            placeholder="Paris, CDG..."
          />

          {/* Destination */}
          <AirportSearch
            label="Arrivée"
            value={destination}
            onChange={(code) => setDestination(code)}
            placeholder="New York, JFK..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Date de départ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de départ
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={today}
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Date de retour */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de retour
              <span className="text-slate-400 font-normal"> (optionnel)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={departureDate || today}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Passagers */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Passagers
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value))}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           text-slate-900 transition-all appearance-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "passager" : "passagers"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bouton de recherche */}
        <button
          type="submit"
          disabled={loading || origins.length === 0 || !destination || !departureDate}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                     rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40
                     hover:from-blue-700 hover:to-indigo-700
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-blue-500/25
                     transition-all duration-200 flex items-center justify-center gap-2 text-lg"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Rechercher des vols
            </>
          )}
        </button>
      </div>
    </form>
  );
}
