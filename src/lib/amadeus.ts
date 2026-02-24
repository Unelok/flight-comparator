import Amadeus from "amadeus";

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID || "",
  clientSecret: process.env.AMADEUS_CLIENT_SECRET || "",
});

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

function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = match[1] ? `${match[1]}h` : "";
  const minutes = match[2] ? `${match[2]}m` : "";
  return `${hours}${minutes}`.trim();
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
      originLocationCode: origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate,
      adults,
      currencyCode,
      max,
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    const response = await amadeus.shopping.flightOffersSearch.get(params);
    const data = response.data;
    const dictionaries = response.result?.dictionaries;

    return data.map((offer: Record<string, unknown>, index: number) => {
      const offerData = offer as {
        itineraries: Array<{
          duration: string;
          segments: Array<{
            carrierCode: string;
            departure: { at: string; iataCode: string };
            arrival: { at: string; iataCode: string };
          }>;
        }>;
        price: { total: string; currency: string };
      };
      const outbound = offerData.itineraries[0];
      const inbound = offerData.itineraries[1];
      const firstSegment = outbound.segments[0];
      const lastSegment = outbound.segments[outbound.segments.length - 1];
      const airlineCode = firstSegment.carrierCode;
      const airlineName =
        dictionaries?.carriers?.[airlineCode] || airlineCode;

      const result: FlightOffer = {
        id: `offer-${index}`,
        price: parseFloat(offerData.price.total),
        currency: offerData.price.currency,
        airline: airlineCode,
        airlineName,
        departureTime: firstSegment.departure.at,
        arrivalTime: lastSegment.arrival.at,
        duration: parseDuration(outbound.duration),
        stops: outbound.segments.length - 1,
        origin: firstSegment.departure.iataCode,
        destination: lastSegment.arrival.iataCode,
      };

      if (inbound) {
        const returnFirstSegment = inbound.segments[0];
        const returnLastSegment =
          inbound.segments[inbound.segments.length - 1];
        result.returnDepartureTime = returnFirstSegment.departure.at;
        result.returnArrivalTime = returnLastSegment.arrival.at;
        result.returnDuration = parseDuration(inbound.duration);
        result.returnStops = inbound.segments.length - 1;
      }

      return result;
    });
  } catch (error: unknown) {
    const amadeusError = error as { response?: { result?: { errors?: Array<{ detail: string }> } }; message?: string };
    console.error(
      "Amadeus API error:",
      amadeusError?.response?.result?.errors || amadeusError?.message
    );
    throw new Error(
      amadeusError?.response?.result?.errors?.[0]?.detail ||
        "Erreur lors de la recherche de vols"
    );
  }
}

// Recherche d'aéroports par mot-clé
export async function searchAirports(keyword: string) {
  try {
    const response = await amadeus.referenceData.locations.get({
      subType: "AIRPORT,CITY",
      keyword: keyword.toUpperCase(),
      "page[limit]": 10,
    });

    return response.data.map((location: Record<string, unknown>) => {
      const loc = location as {
        iataCode: string;
        name: string;
        address?: { cityName?: string; countryName?: string };
      };
      return {
        code: loc.iataCode,
        name: loc.name,
        city: loc.address?.cityName || loc.name,
        country: loc.address?.countryName || "",
      };
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Airport search error:", message);
    return [];
  }
}
