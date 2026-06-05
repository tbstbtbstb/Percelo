import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export interface AnalyseSamenvatting {
  analyseId: string;
  adres: string;
  gemeente: string;
  totaalScore: number;
  scoreKlasse: string;
  gegenereedOp: string;
  reedsBouwgrond: boolean;
}

// GET — lees opgeslagen analyses van de ingelogde gebruiker
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const analyses = (user.privateMetadata?.analyses as AnalyseSamenvatting[]) ?? [];

  return NextResponse.json(analyses);
}

// POST — sla een nieuwe analyse op (max 20 bewaard)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const samenvatting: AnalyseSamenvatting = await req.json();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const bestaand = (user.privateMetadata?.analyses as AnalyseSamenvatting[]) ?? [];

  // Voorkom duplicaten op analyseId, nieuwste bovenaan, max 20
  const bijgewerkt = [samenvatting, ...bestaand.filter((a) => a.analyseId !== samenvatting.analyseId)].slice(0, 20);

  await client.users.updateUser(userId, {
    privateMetadata: { ...user.privateMetadata, analyses: bijgewerkt },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — verwijder één analyse
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { analyseId } = await req.json();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const bestaand = (user.privateMetadata?.analyses as AnalyseSamenvatting[]) ?? [];
  const bijgewerkt = bestaand.filter((a) => a.analyseId !== analyseId);

  await client.users.updateUser(userId, {
    privateMetadata: { ...user.privateMetadata, analyses: bijgewerkt },
  });

  return NextResponse.json({ ok: true });
}
