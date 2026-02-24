import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Créer une alerte
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, origin, destination, departureDate, returnDate, maxPrice, currency } = body;

    if (!email || !origin || !destination || !departureDate || !maxPrice) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(maxPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: "Le prix maximum doit être un nombre positif" },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        email,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate,
        returnDate: returnDate || null,
        maxPrice: parsedPrice,
        currency: currency || "EUR",
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'alerte" },
      { status: 500 }
    );
  }
}

// Lister les alertes (par email)
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email requis" },
      { status: 400 }
    );
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: { email, active: true },
      include: {
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Get alerts error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des alertes" },
      { status: 500 }
    );
  }
}

// Supprimer une alerte
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID requis" },
      { status: 400 }
    );
  }

  try {
    await prisma.alert.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'alerte" },
      { status: 500 }
    );
  }
}
