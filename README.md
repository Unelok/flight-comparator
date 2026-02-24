# Flight Comparator

Compare real-time flight prices and set up price alerts with email notifications.

## Features

- **Real-time flight search** — powered by Google Flights (via SerpApi)
- **Price alerts** — get notified by email when prices drop below your threshold
- **Price history** — track fare trends over time
- **Airport autocomplete** — search airports by name or IATA code

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite via Prisma ORM
- **APIs**: Google Flights via SerpApi (flights), Resend (email)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 20+
- A [SerpApi account](https://serpapi.com/) (API key for Google Flights)
- A [Resend account](https://resend.com/) (for email alerts)

### Installation

```bash
npm install
cp .env.example .env   # fill in your credentials
npx prisma migrate dev  # set up the database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See [.env.example](.env.example) for required variables.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home / search page
│   ├── results/page.tsx      # Flight results
│   ├── alerts/page.tsx       # Manage price alerts
│   └── api/
│       ├── airports/         # Airport search endpoint
│       ├── alerts/           # CRUD for price alerts
│       ├── flights/search/   # Flight search endpoint
│       └── cron/check-prices # Cron job for price monitoring
├── components/               # React components
├── lib/                      # Google Flights client, Prisma client
└── types/                    # Shared TypeScript types
```

## Price Check Cron

The `/api/cron/check-prices` endpoint checks prices for all active alerts. Secure it with a `CRON_SECRET` bearer token and schedule it via Vercel Cron or an external scheduler.
