"use client";

import { FlightOffer } from "@/lib/amadeus";
import {
  Plane,
  Clock,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FlightCardProps {
  flight: FlightOffer;
  onCreateAlert?: () => void;
  multiOrigin?: boolean;
}

function formatTime(dateString: string) {
  return format(new Date(dateString), "HH:mm", { locale: fr });
}

function formatDate(dateString: string) {
  return format(new Date(dateString), "dd MMM", { locale: fr });
}

export default function FlightCard({ flight, onCreateAlert, multiOrigin }: FlightCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Info compagnie */}
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Plane className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {flight.airlineName}
            </p>
            <p className="text-xs text-slate-500">{flight.airline}</p>
          </div>
        </div>

        {/* Trajet aller */}
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center">
            <p className="text-xl font-bold text-slate-900">
              {formatTime(flight.departureTime)}
            </p>
            {multiOrigin ? (
              <span className="inline-block text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                {flight.origin}
              </span>
            ) : (
              <p className="text-xs text-slate-500">{flight.origin}</p>
            )}
            <p className="text-xs text-slate-400">
              {formatDate(flight.departureTime)}
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {flight.duration}
            </p>
            <div className="w-full flex items-center gap-1">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-blue-400 to-indigo-400" />
              <ArrowRight className="w-3 h-3 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-500">
              {flight.stops === 0 ? (
                <span className="text-green-600 font-medium">Direct</span>
              ) : (
                <span className="text-orange-600 flex items-center gap-1">
                  <CircleDot className="w-3 h-3" />
                  {flight.stops} escale{flight.stops > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-slate-900">
              {formatTime(flight.arrivalTime)}
            </p>
            <p className="text-xs text-slate-500">{flight.destination}</p>
            <p className="text-xs text-slate-400">
              {formatDate(flight.arrivalTime)}
            </p>
          </div>
        </div>

        {/* Trajet retour */}
        {flight.returnDepartureTime && (
          <>
            <div className="hidden md:block w-px h-16 bg-slate-200" />
            <div className="flex items-center gap-4 flex-1">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">
                  {formatTime(flight.returnDepartureTime)}
                </p>
                <p className="text-xs text-slate-500">{flight.destination}</p>
              </div>

              <div className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {flight.returnDuration}
                </p>
                <div className="w-full flex items-center gap-1">
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-400 to-blue-400" />
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                </div>
                <p className="text-xs text-slate-500">
                  {flight.returnStops === 0 ? (
                    <span className="text-green-600 font-medium">Direct</span>
                  ) : (
                    <span className="text-orange-600">
                      {flight.returnStops} escale
                      {(flight.returnStops || 0) > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>

              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">
                  {formatTime(flight.returnArrivalTime!)}
                </p>
                <p className="text-xs text-slate-500">{flight.origin}</p>
              </div>
            </div>
          </>
        )}

        {/* Prix */}
        <div className="flex flex-col items-end gap-2 min-w-[120px]">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {flight.price.toFixed(0)}
              <span className="text-sm ml-1">{flight.currency}</span>
            </p>
            <p className="text-xs text-slate-500 text-right">par personne</p>
          </div>
          {onCreateAlert && (
            <button
              onClick={onCreateAlert}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium
                         hover:underline transition-colors"
            >
              🔔 Créer une alerte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
