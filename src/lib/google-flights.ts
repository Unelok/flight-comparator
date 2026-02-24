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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Flights API error:", message);
    throw new Error(message || "Erreur lors de la recherche de vols");
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
