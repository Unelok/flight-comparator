"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  ArrowLeft,
  Bell,
  Trash2,
  Mail,
  Search,
} from "lucide-react";
import PriceChart from "@/components/PriceChart";

interface AlertData {
  id: string;
  email: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  maxPrice: number;
  lastPrice?: number;
  currency: string;
  active: boolean;
  createdAt: string;
  priceHistory: Array<{
    id: string;
    price: number;
    currency: string;
    airline?: string;
    recordedAt: string;
  }>;
}

function AlertsContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteError("");
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setDeleteError("Impossible de supprimer l'alerte. Réessayez.");
      }
    } catch {
      setDeleteError("Erreur de connexion lors de la suppression.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Mes alertes</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Recherche par email */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Retrouver mes alertes
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email"
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                         font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700
                         disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Chercher
            </button>
          </form>
        </div>

        {/* Résultats */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {searched && !loading && alerts.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold mb-1">
              Aucune alerte trouvée
            </p>
            <p className="text-slate-400 text-sm">
              Recherchez des vols et créez votre première alerte !
            </p>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="space-y-4">
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {deleteError}
              </div>
            )}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {alert.origin} → {alert.destination}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {alert.departureDate}
                      {alert.returnDate ? ` — ${alert.returnDate}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Seuil</p>
                      <p className="font-bold text-blue-600">
                        {alert.maxPrice} {alert.currency}
                      </p>
                    </div>
                    {alert.lastPrice && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Dernier prix</p>
                        <p
                          className={`font-bold ${
                            alert.lastPrice <= alert.maxPrice
                              ? "text-green-600"
                              : "text-slate-900"
                          }`}
                        >
                          {alert.lastPrice} {alert.currency}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg
                                 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Graphique d'historique */}
                <PriceChart
                  data={alert.priceHistory.map((p) => ({
                    date: new Date(p.recordedAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    }),
                    price: p.price,
                  }))}
                  currency={alert.currency}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
