import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/google-flights";

// Airport search uses a local dataset — no API calls, no rate limiting needed.

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword");

  if (!keyword || keyword.length < 2) {
    return NextResponse.json({ airports: [] });
  }

  try {
    const airports = searchAirports(keyword);
    return NextResponse.json({ airports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la recherche d'aéroports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
