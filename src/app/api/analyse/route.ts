import { NextRequest, NextResponse } from "next/server";
import { berekenScore } from "@/lib/scoring";
import { genereerAnalyse } from "@/lib/claude";
import { bepaalOnderzoeken, berekenKosten, genereerOpdrachtbrieven } from "@/lib/onderzoeken";
import { berekenWaardestijging } from "@/lib/waardestijging";
import type { Perceel, AnalyseResultaat } from "@/types";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const perceel: Perceel = body.perceel;

    if (!perceel?.adres || !perceel?.lat || !perceel?.lon) {
      return NextResponse.json({ error: "Ongeldig verzoek: perceel data ontbreekt" }, { status: 400 });
    }

    const { factoren, totaalScore, scoreKlasse, reedsBouwgrond, huidigeBestemming, natura2000Score, precedentPlannen } = await berekenScore(perceel);

    const onderzoeken = bepaalOnderzoeken(perceel, natura2000Score);
    const kostenRaming = berekenKosten(perceel, onderzoeken);
    const opdrachtbrieven = genereerOpdrachtbrieven(perceel, onderzoeken);
    const waardestijging = await berekenWaardestijging(perceel, kostenRaming);

    const { rapport, stappenplan, emailTemplates } = await genereerAnalyse({
      perceel,
      totaalScore,
      scoreKlasse,
      factoren,
      reedsBouwgrond,
    });

    const resultaat: AnalyseResultaat = {
      perceel,
      scoreKlasse,
      totaalScore,
      factoren,
      rapport,
      stappenplan,
      emailTemplates,
      gegenereedOp: new Date().toISOString(),
      analyseId: randomUUID(),
      reedsBouwgrond,
      huidigeBestemming,
      onderzoeken,
      kostenRaming,
      opdrachtbrieven,
      waardestijging,
      precedentPlannen,
    };

    return NextResponse.json(resultaat);
  } catch (err) {
    console.error("Analyse fout:", err);
    return NextResponse.json({ error: "Analyse mislukt, probeer opnieuw" }, { status: 500 });
  }
}
