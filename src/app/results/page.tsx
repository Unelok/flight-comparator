"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plane,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  ArrowUpDown,
  Bell,
  CheckCircle2,
  RotateCcw,
  Clock,
  CircleDot,
} from "lucide-react";
import { FlightOffer } from "@/types";
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
  const [selectedReturn, setSelectedReturn] = useState<FlightOffer | null>(null);
  /** True when SerpApi departure_token step-2 was used — selectedReturn.price is the confirmed RT total */
  const [returnPriceIsTotal, setReturnPriceIsTotal] = useState(false);
  const [phase, setPhase] = useState<TripPhase>("outbound");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [alertModal, setAlertModal] = useState(false);

  // Active dates (can be changed by DatePriceStrip)
  const [activeDepartureDate, setActiveDepartureDate] = useState(departureDate);
  const [activeReturnDate, setActiveReturnDate] = useState(returnDate);

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
        // For round trips, pass returnDate → SerpApi type=1 → real round-trip prices
        if (isRoundTrip && activeReturnDate) {
          params.set("returnDate", activeReturnDate);
        }
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

  async function fetchReturnFlights(retDate: string, departureToken?: string) {
    setLoading(true);
    setError("");

    try {
      let flights: FlightOffer[] = [];

      // 1. Try step-2 with departure_token (confirmed RT prices)
      if (departureToken) {
        const params = new URLSearchParams({ departureToken, passengers });
        const res = await fetch(`/api/flights/search?${params.toString()}`);
        const data = await res.json();

        if (!data.error && (data.flights || []).length > 0) {
          setReturnPriceIsTotal(true);
          flights = data.flights as FlightOffer[];
          setReturnFlights(flights);
          setLoading(false);
          return;
        }
        // Step-2 failed — fall through to multi-airport fallback
        console.warn("[fetchReturnFlights] step-2 failed, falling back. Error:", data.error);
      }

      // 2. Fallback: search returns from destination to ALL departure airports
      setReturnPriceIsTotal(false);
      const returnTargets = origins.length > 0 ? origins : [destination];
      const promises = returnTargets.map((target) => {
        const params = new URLSearchParams({
          origin: destination,
          destination: target,
          departureDate: retDate,
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
      flights = results.flat();

      // Deduplicate and re-index IDs (multiple APIs may produce duplicate offer-N ids)
      const seen = new Set<string>();
      flights = flights
        .filter((f) => {
          const key = `${f.origin}-${f.destination}-${f.airline}-${f.departureTime}-${f.arrivalTime}-${f.price}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((f, i) => ({ ...f, id: `return-${i}` }));

      if (flights.length === 0 && results.every((r) => r.length === 0)) {
        setError("Aucun vol retour trouvé");
      }

      setReturnFlights(flights);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  // Initial outbound fetch on mount
  useEffect(() => {
    if (origins.length > 0 && destination && activeDepartureDate) {
      fetchOutboundFlights(activeDepartureDate);
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
        return a.durationMinutes - b.durationMinutes;
      case "stops":
        return a.stops - b.stops;
      default:
        return 0;
    }
  });

  const handleSelectReturn = (flight: FlightOffer) => {
    setSelectedReturn(flight);
    setPhase("complete");
  };

  const handleBackToReturn = () => {
    setSelectedReturn(null);
    setPhase("return");
  };

  const handleSelectOutbound = (flight: FlightOffer) => {
    setSelectedOutbound(flight);
    setPhase("return");
    setSortBy("price-asc");
    fetchReturnFlights(activeReturnDate, flight.departureToken);
  };

  const handleBackToOutbound = () => {
    setSelectedOutbound(null);
    setSelectedReturn(null);
    setReturnFlights([]);
    setPhase("outbound");
  };

  const cheapestFlight = currentFlights.length > 0
    ? currentFlights.reduce((min, f) => f.price < min.price ? f : min)
    : null;
  const cheapestPrice = cheapestFlight?.price;
  const cheapestCurrency = cheapestFlight?.currency ?? "EUR";

  // Confirmed total for summary view
  const totalPrice = selectedReturn
    ? returnPriceIsTotal
      ? selectedReturn.price
      : (selectedOutbound?.price ?? 0) + selectedReturn.price
    : null;

  function fmtTime(ds: string) { return format(new Date(ds), "HH:mm", { locale: fr }); }
  function fmtDate(ds: string) { return format(new Date(ds), "dd MMM yyyy", { locale: fr }); }

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
    // departure_token is outbound-specific; changing the date falls back to standard search
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
                if (phase === "complete") handleBackToReturn();
                else if (phase === "return") handleBackToOutbound();
                else router.push("/");
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
                {phase === "complete" && selectedOutbound && selectedReturn
                  ? `${selectedOutbound.origin} → ${destination} → ${selectedReturn.destination}`
                  : phase === "complete"
                  ? `${origins[0]} ⇄ ${destination}`
                  : phase === "return"
                    ? `${destination} → ${origins.length > 1 ? origins.join(", ") : (selectedOutbound?.origin ?? origins[0])}`
                    : `${origins.join(", ")} → ${destination}`}
              </h1>
              <p className="text-xs text-slate-500">
                {phase === "complete"
                  ? `Aller-retour · ${passengers} passager${parseInt(passengers) > 1 ? "s" : ""}`
                  : phase === "return"
                    ? `${activeReturnDate} (retour) · ${passengers} passager${parseInt(passengers) > 1 ? "s" : ""}`
                    : `${activeDepartureDate}${isRoundTrip ? ` — ${activeReturnDate} (aller-retour)` : " (aller simple)"} · ${passengers} passager${parseInt(passengers) > 1 ? "s" : ""}`}
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
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { if (phase !== "outbound") handleBackToOutbound(); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                phase === "outbound"
                  ? "bg-blue-600 text-white shadow-md"
                  : selectedOutbound
                    ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {selectedOutbound ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">1</span>}
              <span>Aller</span>
            </button>
            <div className="h-px flex-1 bg-slate-200" />
            <button
              onClick={() => { if (phase === "complete") handleBackToReturn(); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                phase === "return"
                  ? "bg-blue-600 text-white shadow-md"
                  : selectedReturn
                    ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {selectedReturn ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">2</span>}
              <span>Retour</span>
            </button>
            <div className="h-px flex-1 bg-slate-200" />
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
              phase === "complete" ? "bg-blue-600 text-white shadow-md" : "bg-slate-100 text-slate-400"
            }`}>
              {phase === "complete" ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">3</span>}
              <span>Récap</span>
            </div>
          </div>
        )}

        {/* Booking summary — phase complete */}
        {phase === "complete" && selectedOutbound && selectedReturn && (
          <div className="space-y-4">
            {/* Success banner */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-bold">Itinéraire sélectionné</p>
                <p className="text-green-100 text-sm">
                  {selectedOutbound.origin} → {destination} → {selectedReturn.destination} · Aller-retour · {passengers} passager{parseInt(passengers) > 1 ? "s" : ""}
                  {selectedOutbound.origin !== selectedReturn.destination && (
                    <span className="block text-xs text-green-200 mt-0.5">
                      ⚡ Retour vers un aéroport différent du départ
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Outbound leg */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Vol aller — {fmtDate(selectedOutbound.departureTime)}
                  </span>
                </div>
                <button onClick={handleBackToOutbound} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Modifier
                </button>
              </div>
              <div className="px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Plane className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{selectedOutbound.airlineName}</p>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{fmtTime(selectedOutbound.departureTime)}</p>
                    <p className="text-xs text-slate-500">{selectedOutbound.origin}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-center gap-1">
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-blue-400 to-indigo-400" />
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{selectedOutbound.duration}
                      {selectedOutbound.stops === 0
                        ? <span className="text-green-600 font-medium ml-1">Direct</span>
                        : <span className="text-orange-600 flex items-center gap-1 ml-1"><CircleDot className="w-3 h-3" />{selectedOutbound.stops} escale{selectedOutbound.stops > 1 ? "s" : ""}</span>}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{fmtTime(selectedOutbound.arrivalTime)}</p>
                    <p className="text-xs text-slate-500">{selectedOutbound.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Return leg */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Vol retour — {fmtDate(selectedReturn.departureTime)}
                  </span>
                </div>
                <button onClick={handleBackToReturn} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Modifier
                </button>
              </div>
              <div className="px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Plane className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{selectedReturn.airlineName}</p>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{fmtTime(selectedReturn.departureTime)}</p>
                    <p className="text-xs text-slate-500">{selectedReturn.origin}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-center gap-1">
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-400 to-blue-400" />
                      <ArrowRight className="w-3 h-3 text-blue-400" />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{selectedReturn.duration}
                      {selectedReturn.stops === 0
                        ? <span className="text-green-600 font-medium ml-1">Direct</span>
                        : <span className="text-orange-600 flex items-center gap-1 ml-1"><CircleDot className="w-3 h-3" />{selectedReturn.stops} escale{selectedReturn.stops > 1 ? "s" : ""}</span>}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{fmtTime(selectedReturn.arrivalTime)}</p>
                    <p className="text-xs text-slate-500">{selectedReturn.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total price & actions */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Prix total aller-retour</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {totalPrice?.toFixed(0)}
                    <span className="text-xl ml-2 font-medium">{selectedReturn.currency}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {parseInt(passengers)} passager{parseInt(passengers) > 1 ? "s" : ""}
                    {!returnPriceIsTotal ? " · aller + retour" : " · tarif aller-retour confirmé"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setAlertModal(true)}
                    className="flex items-center justify-center gap-2 text-sm font-medium text-white
                               bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Bell className="w-4 h-4" />
                    Créer une alerte prix
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600
                               hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Nouvelle recherche
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
                Prix indicatif — vérifiez les conditions tarifaires auprès de la compagnie aérienne avant de réserver.
              </p>
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
          {isRoundTrip && phase === "return" && selectedOutbound && (
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
        {phase !== "complete" && loading && (
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
        {phase !== "complete" && error && !loading && (
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
        {phase !== "complete" && !loading && !error && (
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
                👆 Sélectionnez un vol aller — les prix affichés sont les tarifs aller-retour complets
              </div>
            )}

            {/* Instruction for round-trip return phase */}
            {isRoundTrip && phase === "return" && currentFlights.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800">
                👆 Sélectionnez votre vol retour pour finaliser l&apos;itinéraire
                {origins.length > 1 && (
                  <span className="block mt-1 text-xs text-blue-600">
                    💡 Les vols retour vers tous vos aéroports de départ sont affichés — choisissez le moins cher !
                  </span>
                )}
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
                    multiOrigin={(phase === "outbound" || phase === "return") && origins.length > 1}
                    selectable={isRoundTrip && (phase === "outbound" || phase === "return")}
                    onSelect={() => phase === "return" ? handleSelectReturn(flight) : handleSelectOutbound(flight)}
                    selectedOutboundPrice={undefined}
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
        currentPrice={phase === "complete" && totalPrice ? totalPrice : cheapestPrice}
        currency={phase === "complete" ? (selectedReturn?.currency ?? cheapestCurrency) : cheapestCurrency}
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
