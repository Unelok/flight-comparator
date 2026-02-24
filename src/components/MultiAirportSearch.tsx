"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X } from "lucide-react";
import { Airport } from "@/types";

interface MultiAirportSearchProps {
  label: string;
  values: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
}

export default function MultiAirportSearch({
  label,
  values,
  onChange,
  placeholder = "Code IATA ou ville",
}: MultiAirportSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [selected, setSelected] = useState<Airport[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Sync selected state with external values on mount
  useEffect(() => {
    if (values.length > 0 && selected.length === 0) {
      setSelected(values.map((code) => ({ code, name: code, city: code, country: "" })));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const airports: Airport[] = data.airports || [];
      // Filter out already-selected airports
      const selectedCodes = new Set(selected.map((a) => a.code));
      setResults(airports.filter((a) => !selectedCodes.has(a.code)));
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
    const updated = [...selected, airport];
    setSelected(updated);
    onChange(updated.map((a) => a.code));
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (code: string) => {
    const updated = selected.filter((a) => a.code !== code);
    setSelected(updated);
    onChange(updated.map((a) => a.code));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      handleRemove(selected[selected.length - 1].code);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[48px] px-3 py-2 border border-slate-200 rounded-xl bg-white
                   focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />

        {selected.map((airport) => (
          <span
            key={airport.code}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm font-medium
                       px-2.5 py-1 rounded-lg border border-blue-200"
          >
            {airport.code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(airport.code);
              }}
              className="hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : "Ajouter..."}
          className="flex-1 min-w-[80px] py-1 bg-transparent outline-none
                     text-slate-900 placeholder:text-slate-400 text-sm"
        />

        {loading && (
          <div className="shrink-0">
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
              type="button"
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
