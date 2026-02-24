import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/google-flights";
import { consumeApiCall } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const departureDate = searchParams.get("departureDate");
  const returnDate = searchParams.get("returnDate");
  const passengers = parseInt(searchParams.get("passengers") || "1");

  if (!origin || !destination || !departureDate) {
    return NextResponse.json(
      { error: "Les champs origine, destination et date de départ sont requis" },
      { status: 400 }
    );
  }

  // Check rate limit before calling API
  const { allowed, remaining } = consumeApiCall("flights");
  if (!allowed) {
    return NextResponse.json(
      { error: "Limite mensuelle de recherches de vols atteinte (100/mois).", flights: [] },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  try {
    const result = await searchFlights(
      origin,
      destination,
      departureDate,
      returnDate || undefined,
      passengers
    );

    return NextResponse.json(
      { flights: result.flights, priceInsights: result.priceInsights },
      { headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la recherche";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
