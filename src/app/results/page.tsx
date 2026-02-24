"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import {
  Plane,
  ArrowLeft,
  SlidersHorizontal,
  ArrowUpDown,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { FlightOffer } from "@/lib/google-flights";
import FlightCard from "@/components/FlightCard";
import AlertModal from "@/components/AlertModal";
import ApiQuota from "@/components/ApiQuota";
import DatePriceStrip from "@/components/DatePriceStrip";

type SortOption = "price-asc" | "price-desc" | "duration" | "stops";
type TripPhase = "outbound" | "return" | "complete";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const originParam = searchParams.get("origin") || "";
  const origins = originParam.split(",").filter(Boolean);
  const destination = searchParams.get("destination") || "";
  const departureDate = searchParams.get("departureDate") || "";
  const returnDate = searchParams.get("returnDate") || "";
  const passengers = searchParams.get("passengers") || "1";

  const isRoundTrip = !!returnDate;

  const [outboundFlights, setOutboundFlights] = useState<FlightOffer[]>([]);
  const [returnFlights, setReturnFlights] = useState<FlightOffer[]>([]);
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);
  const [phase, setPhase] = useState<TripPhase>(isRoundTrip ? "outbound" : "complete");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [alertModal, setAlertModal] = useState(false);

  // Active dates (can be changed by DatePriceStrip)
  const [activeDepartureDate, setActiveDepartureDate] = useState(departureDate);
  const [activeReturnDate, setActiveReturnDate] = useState(returnDate);

  // Ref to prevent double-fetch in React strict mode
  const fetchingRef = useRef(false);

  async function fetchOutboundFlights(depDate: string) {
    setLoading(true);
    setError("");
    try {
      const promises = origins.map((origin) => {
        const params = new URLSearchParams({
          origin,
          destination,
          departureDate: depDate,
          passengers,
        });
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

      const seen = new Set<string>();
      const uniqueFlights = allFlights.filter((f) => {
        const key = `${f.origin}-${f.airline}-${f.departureTime}-${f.arrivalTime}-${f.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setOutboundFlights(uniqueFlights);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  async function fetchReturnFlights(retDate: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        origin: destination,
        destination: origins[0],
        departureDate: retDate,
        passengers,
      });

      const res = await fetch(`/api/flights/search?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setReturnFlights([]);
      } else {
        setReturnFlights((data.flights || []) as FlightOffer[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  // Initial outbound fetch on mount
  useEffect(() => {
    if (fetchingRef.current) return;
    if (origins.length > 0 && destination && activeDepartureDate) {
      fetchingRef.current = true;
      fetchOutboundFlights(activeDepartureDate).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentFlights = phase === "return" ? returnFlights : outboundFlights;

  const sortedFlights = [...currentFlights].sort((a, b) => {
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

  const handleSelectOutbound = (flight: FlightOffer) => {
    setSelectedOutbound(flight);
    setPhase("return");
    setSortBy("price-asc");
    // Directly fetch return flights instead of relying on useEffect
    fetchReturnFlights(activeReturnDate);
  };

  const handleBackToOutbound = () => {
    setSelectedOutbound(null);
    setReturnFlights([]);
    setPhase("outbound");
  };

  const cheapestPrice =
    currentFlights.length > 0
      ? Math.min(...currentFlights.map((f) => f.price))
      : undefined;

  const handleDepartureDateChange = (newDate: string) => {
    setActiveDepartureDate(newDate);
    setSelectedOutbound(null);
    setReturnFlights([]);
    if (isRoundTrip) {
      setPhase("outbound");
    }
    fetchOutboundFlights(newDate);
  };

  const handleReturnDateChange = (newDate: string) => {
    setActiveReturnDate(newDate);
    fetchReturnFlights(newDate);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (phase === "return") {
                  handleBackToOutbound();
                } else {
                  router.push("/");
                }
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {phase === "return"
                  ? `${destination} → ${origins[0]}`
                  : `${origins.join(", ")} → ${destination}`}
              </h1>
              <p className="text-xs text-slate-500">
                {phase === "return" ? activeReturnDate : activeDepartureDate}
                {isRoundTrip && phase !== "return"
                  ? ` — ${activeReturnDate} (aller-retour)`
                  : !isRoundTrip
                    ? " (aller simple)"
                    : " (retour)"}{" "}
                · {passengers} passager{parseInt(passengers) > 1 ? "s" : ""}
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
        {/* Round-trip step indicator */}
        {isRoundTrip && (
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                if (phase === "return") handleBackToOutbound();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                phase === "outbound"
                  ? "bg-blue-600 text-white shadow-md"
                  : selectedOutbound
                    ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {selectedOutbound ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">1</span>
              )}
              <span>Aller</span>
              {selectedOutbound && (
                <span className="text-xs ml-1">
                  {selectedOutbound.airlineName} · {selectedOutbound.price}€
                </span>
              )}
            </button>
            <div className="h-px flex-1 bg-slate-200" />
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                phase === "return"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">2</span>
              <span>Retour</span>
            </div>
          </div>
        )}

        {/* Selected outbound summary when viewing returns */}
        {phase === "return" && selectedOutbound && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plane className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Vol aller sélectionné : {selectedOutbound.airlineName}
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedOutbound.origin} → {selectedOutbound.destination} ·{" "}
                    {selectedOutbound.duration} · {selectedOutbound.stops === 0 ? "Direct" : `${selectedOutbound.stops} escale(s)`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{selectedOutbound.price}€</p>
                <button
                  onClick={handleBackToOutbound}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Price Strips */}
        <div className="space-y-3 mb-6">
          {phase !== "return" && (
            <DatePriceStrip
              origin={origins[0]}
              destination={destination}
              selectedDate={activeDepartureDate}
              passengers={passengers}
              label="Aller"
              onDateSelect={handleDepartureDateChange}
            />
          )}
          {isRoundTrip && phase === "return" && (
            <DatePriceStrip
              origin={destination}
              destination={origins[0]}
              selectedDate={activeReturnDate}
              passengers={passengers}
              label="Retour"
              onDateSelect={handleReturnDateChange}
            />
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full" />
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
            <p className="text-slate-500 mt-6 text-lg">
              {phase === "return"
                ? "Recherche des vols retour..."
                : "Recherche des meilleurs tarifs..."}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Cela peut prendre quelques secondes
            </p>
          </div>
        )}

        {/* Error */}
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

        {/* Results */}
        {!loading && !error && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">
                <span className="font-bold text-slate-900">
                  {currentFlights.length}
                </span>{" "}
                vol{currentFlights.length !== 1 ? "s" : ""}{" "}
                {phase === "return" ? "retour" : ""} trouvé
                {currentFlights.length !== 1 ? "s" : ""}
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
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                    <option value="duration">Durée</option>
                    <option value="stops">Escales</option>
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Instruction for round-trip outbound phase */}
            {isRoundTrip && phase === "outbound" && currentFlights.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
                👆 Sélectionnez un vol aller pour voir les vols retour disponibles
              </div>
            )}

            {/* Flight list */}
            {currentFlights.length === 0 ? (
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
                    multiOrigin={phase === "outbound" && origins.length > 1}
                    selectable={isRoundTrip && phase === "outbound"}
                    onSelect={() => handleSelectOutbound(flight)}
                    selectedOutboundPrice={
                      phase === "return" && selectedOutbound
                        ? selectedOutbound.price
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Alert modal */}
      <AlertModal
        isOpen={alertModal}
        onClose={() => setAlertModal(false)}
        origin={origins.join(", ")}
        destination={destination}
        departureDate={activeDepartureDate}
        returnDate={activeReturnDate || undefined}
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
