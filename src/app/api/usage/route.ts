import { NextResponse } from "next/server";
import { getApiUsage } from "@/lib/rate-limiter";

export async function GET() {
  return NextResponse.json(getApiUsage());
}
