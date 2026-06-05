import { NextRequest, NextResponse } from "next/server";
import { genereerEmailTemplates } from "@/lib/claude";
import type { Perceel, ScoreFactor, ScoreKlasse, OnderzoekItem, PrecedentPlan } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { perceel, totaalScore, scoreKlasse, factoren, onderzoeken, precedentPlannen }: {
      perceel: Perceel;
      totaalScore: number;
      scoreKlasse: ScoreKlasse;
      factoren: ScoreFactor[];
      onderzoeken: OnderzoekItem[];
      precedentPlannen: PrecedentPlan[];
    } = body;

    if (!perceel?.adres) {
      return NextResponse.json({ error: "Perceel ontbreekt" }, { status: 400 });
    }

    const emailTemplates = await genereerEmailTemplates({
      perceel, totaalScore, scoreKlasse, factoren, onderzoeken, precedentPlannen,
    });

    return NextResponse.json({ emailTemplates });
  } catch (err) {
    console.error("Email genereer fout:", err);
    const bericht = err instanceof Error ? err.message : "";
    if (bericht.includes("429") || bericht.toLowerCase().includes("rate limit")) {
      return NextResponse.json(
        { error: "De AI-service heeft het dagelijkse limiet bereikt. Probeer het over een uur opnieuw." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "E-mails genereren mislukt, probeer opnieuw" }, { status: 500 });
  }
}
