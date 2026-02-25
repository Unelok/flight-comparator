import { getJson } from "serpapi";
import type { FlightOffer } from "@/types";
export type { FlightOffer } from "@/types";

interface SerpApiFlight {
  flights: Array<{
    airline: string;
    airline_logo: string;
    departure_airport: { name: string; id: string; time: string };
    arrival_airport: { name: string; id: string; time: string };
    duration: number; // in minutes
    travel_class: string;
  }>;
  total_duration: number;
  price: number;
  type: string;
  booking_token?: string;
  /** Token used to fetch return legs for this outbound (round-trip step 2) */
  departure_token?: string;
}

export interface PriceInsights {
  lowestPrice: number;
  priceLevel: string;
  typicalPriceRange: [number, number];
  priceHistory: Array<{ date: string; price: number }>;
}

interface SerpApiResponse {
  best_flights?: SerpApiFlight[];
  other_flights?: SerpApiFlight[];
  search_metadata?: { google_flights_url?: string };
  price_insights?: {
    lowest_price: number;
    price_level: string;
    typical_price_range: [number, number];
    price_history: Array<[number, number]>;
  };
  error?: string;
}

export interface SearchFlightsResult {
  flights: FlightOffer[];
  priceInsights?: PriceInsights;
}

/** Extract a human-readable message from anything thrown (Error, plain object, string…) */
function extractError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.length > 0) {
    // serpapi rejects non-200 responses with the raw body string — try to parse it
    try {
      const parsed: unknown = JSON.parse(error);
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.error === "string" && obj.error) return obj.error;
        if (typeof obj.message === "string" && obj.message) return obj.message;
      }
    } catch { /* not JSON — return as-is */ }
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error === "string" && obj.error) return obj.error;
    if (typeof obj.statusMessage === "string" && obj.statusMessage)
      return obj.statusMessage;
    try { return JSON.stringify(obj); } catch { /* ignore */ }
  }
  return "Erreur inconnue";
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? `${m}m` : ""}`;
}

function formatDateTime(dateStr: string, timeStr: string): string {
  // SerpApi returns time like "2026-03-15 at 10:30 AM" or actual ISO-like formats
  // We normalise to ISO 8601
  if (timeStr.includes("T")) return timeStr;
  // timeStr from SerpApi: "2026-02-28 14:30"
  return timeStr.replace(" ", "T");
}

function mapFlightOffer(
  flight: SerpApiFlight,
  index: number,
  currency: string,
  returnFlight?: SerpApiFlight
): FlightOffer {
  const outboundSegments = flight.flights;
  const firstLeg = outboundSegments[0];
  const lastLeg = outboundSegments[outboundSegments.length - 1];

  const result: FlightOffer = {
    id: `offer-${index}`,
    price: flight.price,
    currency,
    airline: firstLeg.airline,
    airlineName: firstLeg.airline,
    departureTime: formatDateTime(
      firstLeg.departure_airport.time,
      firstLeg.departure_airport.time
    ),
    arrivalTime: formatDateTime(
      lastLeg.arrival_airport.time,
      lastLeg.arrival_airport.time
    ),
    duration: formatDuration(flight.total_duration),
    durationMinutes: flight.total_duration,
    stops: outboundSegments.length - 1,
    origin: firstLeg.departure_airport.id,
    destination: lastLeg.arrival_airport.id,
  };

  if (returnFlight) {
    const returnSegments = returnFlight.flights;
    const returnFirst = returnSegments[0];
    const returnLast = returnSegments[returnSegments.length - 1];
    result.returnDepartureTime = formatDateTime(
      returnFirst.departure_airport.time,
      returnFirst.departure_airport.time
    );
    result.returnArrivalTime = formatDateTime(
      returnLast.arrival_airport.time,
      returnLast.arrival_airport.time
    );
    result.returnDuration = formatDuration(returnFlight.total_duration);
    result.returnStops = returnSegments.length - 1;
  }

  if (flight.departure_token) {
    result.departureToken = flight.departure_token;
  } else if (process.env.NODE_ENV === "development") {
    console.log("[mapFlightOffer] no departure_token on flight", index, "keys:", Object.keys(flight));
  }

  return result;
}

export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1,
  currencyCode: string = "EUR",
  max: number = 20
): Promise<SearchFlightsResult> {
  try {
    const params: Record<string, string | number> = {
      engine: "google_flights",
      departure_id: origin.toUpperCase(),
      arrival_id: destination.toUpperCase(),
      outbound_date: departureDate,
      adults,
      currency: currencyCode,
      hl: "fr",
      gl: "fr",
      api_key: process.env.SERPAPI_API_KEY || "",
    };

    if (returnDate) {
      params.return_date = returnDate;
      params.type = 1; // round trip
    } else {
      params.type = 2; // one way
    }

    const response = (await getJson(params)) as SerpApiResponse;

    // "Google Flights hasn't returned any results" is not a real error,
    // it just means there are no flights for this route/date.
    if (response.error) {
      const noResults =
        response.error.toLowerCase().includes("hasn't returned any results") ||
        response.error.toLowerCase().includes("no results");
      if (noResults) {
        return { flights: [], priceInsights: undefined };
      }
      throw new Error(response.error);
    }

    const bestFlights = response.best_flights || [];
    const otherFlights = response.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    if (process.env.NODE_ENV === "development") {
      const withToken = allFlights.filter((f) => f.departure_token).length;
      console.log(`[searchFlights] best=${bestFlights.length} other=${otherFlights.length} withDepartureToken=${withToken}/${allFlights.length} returnDate=${returnDate || "none"}`);
    }

    const flights = allFlights
      .slice(0, max)
      .map((flight, index) => mapFlightOffer(flight, index, currencyCode));

    let priceInsights: PriceInsights | undefined;
    if (response.price_insights) {
      const pi = response.price_insights;
      priceInsights = {
        lowestPrice: pi.lowest_price,
        priceLevel: pi.price_level,
        typicalPriceRange: pi.typical_price_range,
        priceHistory: (pi.price_history || []).map(([ts, price]) => ({
          date: new Date(ts * 1000).toISOString().split("T")[0],
          price,
        })),
      };
    }

    return { flights, priceInsights };
  } catch (error: unknown) {
    const message = extractError(error);
    console.error("Google Flights API error:", message);
    throw new Error(message || "Erreur lors de la recherche de vols");
  }
}

/**
 * Step-2 of a round-trip search: fetch return-leg options for a previously
 * selected outbound flight using the SerpApi departure_token.
 */
export async function searchReturnFlights(
  departureToken: string,
  adults: number = 1,
  currencyCode: string = "EUR",
  max: number = 20
): Promise<SearchFlightsResult> {
  try {
    const params: Record<string, string | number> = {
      engine: "google_flights",
      departure_token: departureToken,
      adults,
      currency: currencyCode,
      hl: "fr",
      gl: "fr",
      api_key: process.env.SERPAPI_API_KEY || "",
    };

    const response = (await getJson(params)) as SerpApiResponse;

    if (response.error) {
      const noResults =
        response.error.toLowerCase().includes("hasn't returned any results") ||
        response.error.toLowerCase().includes("no results");
      if (noResults) return { flights: [] };
      throw new Error(response.error);
    }

    const bestFlights = response.best_flights || [];
    const otherFlights = response.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    if (process.env.NODE_ENV === "development") {
      console.log(`[searchReturnFlights] best=${bestFlights.length} other=${otherFlights.length} keys=${Object.keys(response).join(", ")}`);
    }

    const flights = allFlights
      .slice(0, max)
      .map((flight, index) => mapFlightOffer(flight, index, currencyCode));

    return { flights };
  } catch (error: unknown) {
    const message = extractError(error);
    console.error("[searchReturnFlights] error:", message, "raw:", JSON.stringify(error));
    throw new Error(message || "Erreur lors de la recherche des vols retour");
    throw new Error(message || "Erreur lors de la recherche des vols retour");
  }
}

// Airport search using local dataset (no API calls consumed)
import airportData from "@/data/airports.json";

interface AirportEntry {
  iata: string;
  name: string;
  city: string;
  country: string;
}

const airportDb = (airportData as AirportEntry[]).filter(
  (a) => a.iata && a.iata !== "\\N"
);

export function searchAirports(keyword: string) {
  const q = keyword.toLowerCase().trim();
  if (q.length < 2) return [];

  return airportDb
    .filter(
      (a) =>
        a.iata.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q)
    )
    .slice(0, 10)
    .map((a) => ({
      code: a.iata,
      name: a.name,
      city: a.city,
      country: a.country,
    }));
}
