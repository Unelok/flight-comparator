import fs from "fs";
import path from "path";

/** Monthly free-tier limits from Amadeus (test & production) */
const MONTHLY_LIMITS = {
  flights: 2000,  // Flight Offers Search
  airports: 7000, // Airport & City Search
} as const;

export type ApiCategory = keyof typeof MONTHLY_LIMITS;

const COUNTER_FILE = path.join(process.cwd(), ".api-usage.json");

interface UsageData {
  month: string; // "YYYY-MM"
  flights: number;
  airports: number;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function readUsage(): UsageData {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, "utf-8");
    const data: UsageData = JSON.parse(raw);
    // Reset if it's a new month
    if (data.month !== currentMonth()) {
      return { month: currentMonth(), flights: 0, airports: 0 };
    }
    return data;
  } catch {
    return { month: currentMonth(), flights: 0, airports: 0 };
  }
}

function writeUsage(data: UsageData): void {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
}

/**
 * Check if an API call is allowed for a given category, and if so, increment the counter.
 * Returns { allowed, remaining } — remaining is AFTER the call if allowed.
 */
export function consumeApiCall(category: ApiCategory): { allowed: boolean; remaining: number } {
  const usage = readUsage();
  const limit = MONTHLY_LIMITS[category];

  if (usage[category] >= limit) {
    return { allowed: false, remaining: 0 };
  }

  usage[category] += 1;
  writeUsage(usage);

  return { allowed: true, remaining: limit - usage[category] };
}

export interface CategoryUsage {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Get current usage stats without consuming a call.
 */
export function getApiUsage(): { flights: CategoryUsage; airports: CategoryUsage } {
  const usage = readUsage();
  return {
    flights: {
      used: usage.flights,
      limit: MONTHLY_LIMITS.flights,
      remaining: Math.max(0, MONTHLY_LIMITS.flights - usage.flights),
    },
    airports: {
      used: usage.airports,
      limit: MONTHLY_LIMITS.airports,
      remaining: Math.max(0, MONTHLY_LIMITS.airports - usage.airports),
    },
  };
}
