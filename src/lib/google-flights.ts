import { getJson } from "serpapi";

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  airline: string;
  airlineName: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  returnDuration?: string;
  returnStops?: number;
  origin: string;
  destination: string;
  bookingUrl?: string;
}

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

interface SerpApiResponse {
  best_flights?: SerpApiFlight[];
  other_flights?: SerpApiFlight[];
  search_metadata?: { google_flights_url?: string };
  error?: string;
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
): Promise<FlightOffer[]> {
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

    if (response.error) {
      throw new Error(response.error);
    }

    const bestFlights = response.best_flights || [];
    const otherFlights = response.other_flights || [];
    const allFlights = [...bestFlights, ...otherFlights];

    const offers = allFlights
      .slice(0, max)
      .map((flight, index) => mapFlightOffer(flight, index, currencyCode));

    return offers;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Flights API error:", message);
    throw new Error(message || "Erreur lors de la recherche de vols");
  }
}

// Airport search using SerpApi Google Flights autocomplete
export async function searchAirports(keyword: string) {
  try {
    // SerpApi doesn't have a dedicated airport search endpoint,
    // so we use the Google Flights autocomplete via a simple fetch
    const apiKey = process.env.SERPAPI_API_KEY || "";
    const url = `https://serpapi.com/search.json?engine=google_flights&type=2&outbound_date=2026-12-01&departure_id=${encodeURIComponent(keyword.toUpperCase())}&arrival_id=CDG&api_key=${apiKey}`;

    // Alternative: use a static list or a free airport API
    // For now, we use a lightweight approach with the airports API
    const response = await fetch(
      `https://serpapi.com/locations.json?q=${encodeURIComponent(keyword)}&limit=10`
    );

    if (!response.ok) {
      throw new Error(`Airport search failed: ${response.statusText}`);
    }

    const data = (await response.json()) as Array<{
      id: string;
      name: string;
      google_id?: number;
      gps?: [number, number];
      country_code?: string;
    }>;

    // Filter to airport-like results and map to our format
    return data
      .filter(
        (loc) =>
          loc.name &&
          (loc.name.toLowerCase().includes("airport") ||
            loc.name.toLowerCase().includes("aéroport") ||
            loc.id?.length === 3)
      )
      .map((loc) => {
        const parts = loc.name.split(",").map((p) => p.trim());
        return {
          code: loc.id?.length === 3 ? loc.id.toUpperCase() : loc.id || "",
          name: parts[0] || loc.name,
          city: parts[1] || parts[0] || loc.name,
          country: parts[parts.length - 1] || loc.country_code || "",
        };
      });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Airport search error:", message);
    return [];
  }
}
