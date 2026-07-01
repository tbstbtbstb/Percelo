import { NextResponse } from "next/server";
import { berekenScore } from "@/lib/scoring";
import type { Perceel } from "@/types";

export const maxDuration = 60;

// Beschermd met ADMIN_SECRET env var
// Gebruik: POST /api/score-percelen met body { secret, percelen: Perceel[] }
// Scoort max 5 percelen per aanroep (i.v.m. Vercel timeout)

export async function POST(req: Request) {
  const { secret, percelen } = await req.json() as { secret: string; percelen: Perceel[] };

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = (percelen ?? []).slice(0, 5);
  const resultaten = [];

  for (const perceel of batch) {
    try {
      const score = await berekenScore(perceel);
      resultaten.push({
        ok: true,
        perceel,
        totaalScore: score.totaalScore,
        scoreKlasse: score.scoreKlasse,
        huidigeBestemming: score.huidigeBestemming,
        reedsBouwgrond: score.reedsBouwgrond,
        hardBlockers: score.hardBlockers,
      });
    } catch (e) {
      resultaten.push({ ok: false, perceel, error: String(e) });
    }
  }

  return NextResponse.json(resultaten);
}
