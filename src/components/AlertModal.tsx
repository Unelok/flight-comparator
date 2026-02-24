"use client";

import { useState } from "react";
import { X, Bell, Mail, DollarSign } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  currentPrice?: number;
}

export default function AlertModal({
  isOpen,
  onClose,
  origin,
  destination,
  departureDate,
  returnDate,
  currentPrice,
}: AlertModalProps) {
  const [email, setEmail] = useState("");
  const [maxPrice, setMaxPrice] = useState(currentPrice ? Math.round(currentPrice * 0.9) : 200);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          origin,
          destination,
          departureDate,
          returnDate,
          maxPrice,
          currency: "EUR",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Alerte créée !
            </h3>
            <p className="text-slate-500">
              Vous recevrez un email quand le prix descendra sous {maxPrice} EUR.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Créer une alerte prix
                </h3>
                <p className="text-sm text-slate-500">
                  {origin} → {destination}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Votre email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prix maximum souhaité (EUR)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    required
                    min={1}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               text-slate-900"
                  />
                </div>
                {currentPrice && (
                  <p className="text-xs text-slate-500 mt-1">
                    Prix actuel le plus bas : {currentPrice.toFixed(0)} EUR
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                           font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700
                           disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Activer l&apos;alerte
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
