"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { Airport } from "@/types";

interface AirportSearchProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

export default function AirportSearch({
  label,
  value,
  onChange,
  placeholder = "Code IATA ou ville",
}: AirportSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAirports = async (keyword: string) => {
    if (keyword.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/airports?keyword=${encodeURIComponent(keyword)}`);
      if (res.status === 429) {
        setRateLimited(true);
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.airports || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAirports(val), 500);
  };

  const handleSelect = (airport: Airport) => {
    setQuery(`${airport.code} - ${airport.city}`);
    onChange(airport.code);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     text-slate-900 placeholder:text-slate-400 transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {rateLimited && (
        <div className="absolute z-50 w-full mt-1 bg-red-50 border border-red-200 rounded-xl shadow-lg p-4 text-center">
          <p className="text-red-600 text-sm font-medium">Limite API atteinte (30/jour)</p>
          <p className="text-red-400 text-xs mt-1">Réessayez demain</p>
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {results.map((airport, idx) => (
            <button
              key={`${airport.code}-${idx}`}
              onClick={() => handleSelect(airport)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3
                         first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded">
                {airport.code}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {airport.city}
                </p>
                <p className="text-xs text-slate-500">{airport.country}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
