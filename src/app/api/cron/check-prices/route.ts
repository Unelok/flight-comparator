import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { searchFlights } from "@/lib/google-flights";
import { consumeApiCall } from "@/lib/rate-limiter";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Vérification du secret pour sécuriser l'endpoint
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const activeAlerts = await prisma.alert.findMany({
      where: { active: true },
    });

    const results = [];

    for (const alert of activeAlerts) {
      try {
        // Check rate limit before each Google Flights call
        const { allowed } = consumeApiCall("flights");
        if (!allowed) {
          results.push({ alertId: alert.id, status: "skipped", reason: "rate-limited" });
          continue;
        }

        const { flights } = await searchFlights(
          alert.origin,
          alert.destination,
          alert.departureDate,
          alert.returnDate || undefined,
          1,
          alert.currency
        );

        if (flights.length === 0) continue;

        const cheapest = flights.reduce((min, f) =>
          f.price < min.price ? f : min
        );

        // Enregistrer le prix dans l'historique
        await prisma.priceRecord.create({
          data: {
            alertId: alert.id,
            price: cheapest.price,
            currency: cheapest.currency,
            airline: cheapest.airlineName,
          },
        });

        // Mettre à jour le dernier prix
        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastPrice: cheapest.price },
        });

        // Si le prix est sous le seuil, envoyer un email
        if (cheapest.price <= alert.maxPrice) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: alert.email,
            subject: `✈️ Alerte prix ! ${alert.origin} → ${alert.destination} à ${cheapest.price}${cheapest.currency}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1e40af;">✈️ Bonne nouvelle !</h1>
                <p style="font-size: 18px;">Le prix du vol <strong>${alert.origin} → ${alert.destination}</strong> est passé sous votre seuil !</p>
                
                <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1e40af;">
                    ${cheapest.price} ${cheapest.currency}
                  </p>
                  <p style="margin: 5px 0 0; color: #64748b;">Votre seuil : ${alert.maxPrice} ${alert.currency}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Compagnie</td>
                    <td style="padding: 8px 0; font-weight: bold;">${cheapest.airlineName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Date de départ</td>
                    <td style="padding: 8px 0; font-weight: bold;">${alert.departureDate}</td>
                  </tr>
                  ${alert.returnDate ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Date de retour</td>
                    <td style="padding: 8px 0; font-weight: bold;">${alert.returnDate}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Durée</td>
                    <td style="padding: 8px 0; font-weight: bold;">${cheapest.duration}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Escales</td>
                    <td style="padding: 8px 0; font-weight: bold;">${cheapest.stops === 0 ? "Direct" : `${cheapest.stops} escale(s)`}</td>
                  </tr>
                </table>

                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                  Vous recevez cet email car vous avez créé une alerte prix sur Flight Comparator.
                </p>
              </div>
            `,
          });

          results.push({
            alertId: alert.id,
            status: "email_sent",
            price: cheapest.price,
          });
        } else {
          results.push({
            alertId: alert.id,
            status: "price_recorded",
            price: cheapest.price,
            threshold: alert.maxPrice,
          });
        }
      } catch (alertError) {
        const message = alertError instanceof Error ? alertError.message : "Unknown error";
        results.push({
          alertId: alert.id,
          status: "error",
          error: message,
        });
      }
    }

    return NextResponse.json({
      processed: activeAlerts.length,
      results,
    });
  } catch (error) {
    console.error("Cron check error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification des prix" },
      { status: 500 }
    );
  }
}
