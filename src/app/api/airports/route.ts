import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/google-flights";
import { consumeApiCall } from "@/lib/rate-limiter";

// In-memory cache: keyword → { airports, timestamp }
const cache = new Map<string, { airports: unknown[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword");

  if (!keyword || keyword.length < 3) {
    return NextResponse.json({ airports: [] });
  }

  const cacheKey = keyword.toUpperCase().trim();

  // Check cache first (no API call needed)
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ airports: cached.airports });
  }

  // Check rate limit before calling API
  const { allowed, remaining } = consumeApiCall("airports");
  if (!allowed) {
    return NextResponse.json(
      { error: "Limite mensuelle d'appels API aéroports atteinte (100/mois)", airports: [] },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  try {
    const airports = await searchAirports(keyword);
    cache.set(cacheKey, { airports, timestamp: Date.now() });
    return NextResponse.json(
      { airports },
      { headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la recherche d'aéroports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
