"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  Plane,
  ArrowLeft,
  SlidersHorizontal,
  ArrowUpDown,
  Bell,
} from "lucide-react";
import { FlightOffer } from "@/lib/amadeus";
import FlightCard from "@/components/FlightCard";
import AlertModal from "@/components/AlertModal";
import ApiQuota from "@/components/ApiQuota";

type SortOption = "price-asc" | "price-desc" | "duration" | "stops";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const originParam = searchParams.get("origin") || "";
  const origins = originParam.split(",").filter(Boolean);
  const destination = searchParams.get("destination") || "";
  const departureDate = searchParams.get("departureDate") || "";
  const returnDate = searchParams.get("returnDate") || "";
  const passengers = searchParams.get("passengers") || "1";

  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [alertModal, setAlertModal] = useState(false);

  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch flights from all origins in parallel
        const promises = origins.map((origin) => {
          const params = new URLSearchParams({
            origin,
            destination,
            departureDate,
            passengers,
          });
          if (returnDate) params.set("returnDate", returnDate);

          return fetch(`/api/flights/search?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.error) return [];
              return (data.flights || []) as FlightOffer[];
            })
            .catch(() => [] as FlightOffer[]);
        });

        const results = await Promise.all(promises);
        const allFlights = results.flat();

        // Deduplicate by generating a unique key per flight
        const seen = new Set<string>();
        const uniqueFlights = allFlights.filter((f) => {
          const key = `${f.origin}-${f.airline}-${f.departureTime}-${f.arrivalTime}-${f.price}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setFlights(uniqueFlights);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inattendue");
      } finally {
        setLoading(false);
      }
    };

    if (origins.length > 0 && destination && departureDate) {
      fetchFlights();
    }
  }, [originParam, destination, departureDate, returnDate, passengers]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedFlights = [...flights].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "duration":
        return a.duration.localeCompare(b.duration);
      case "stops":
        return a.stops - b.stops;
      default:
        return 0;
    }
  });

  const cheapestPrice =
    flights.length > 0 ? Math.min(...flights.map((f) => f.price)) : undefined;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {origins.join(", ")} → {destination}
              </h1>
              <p className="text-xs text-slate-500">
                {departureDate}
                {returnDate ? ` — ${returnDate}` : " (aller simple)"} ·{" "}
                {passengers} passager{parseInt(passengers) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ApiQuota />
            <a
              href="/alerts"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600
                         bg-white hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl transition-colors"
            >
              <Bell className="w-4 h-4" />
              Mes alertes
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full" />
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
            <p className="text-slate-500 mt-6 text-lg">
              Recherche des meilleurs tarifs...
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Cela peut prendre quelques secondes
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-2">
              Erreur lors de la recherche
            </p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              ← Nouvelle recherche
            </button>
          </div>
        )}

        {/* Résultats */}
        {!loading && !error && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">
                <span className="font-bold text-slate-900">
                  {flights.length}
                </span>{" "}
                vol{flights.length !== 1 ? "s" : ""} trouvé
                {flights.length !== 1 ? "s" : ""}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAlertModal(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 
                             bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                >
                  🔔 Créer une alerte
                </button>

                <div className="relative">
                  <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white
                               text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                               appearance-none cursor-pointer"
                  >
                    <option value="price-asc">
                      Prix croissant
                    </option>
                    <option value="price-desc">
                      Prix décroissant
                    </option>
                    <option value="duration">Durée</option>
                    <option value="stops">Escales</option>
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Liste des vols */}
            {flights.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <p className="text-2xl mb-2">✈️</p>
                <p className="text-slate-600 font-semibold mb-1">
                  Aucun vol trouvé
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  Essayez avec des dates ou destinations différentes
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  ← Modifier la recherche
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFlights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    onCreateAlert={() => setAlertModal(true)}
                    multiOrigin={origins.length > 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal alerte */}
      <AlertModal
        isOpen={alertModal}
        onClose={() => setAlertModal(false)}
        origin={origins.join(", ")}
        destination={destination}
        departureDate={departureDate}
        returnDate={returnDate || undefined}
        currentPrice={cheapestPrice}
      />
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
