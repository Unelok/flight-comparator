export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  airline: string;
  airlineName: string;
  departureTime: string;
  arrivalTime: string;
  /** Total outbound duration in minutes — use for numeric sorting */
  durationMinutes: number;
  /** Human-readable duration string, e.g. "2h30m" */
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
