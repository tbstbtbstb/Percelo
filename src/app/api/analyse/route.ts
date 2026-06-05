import { NextRequest, NextResponse } from "next/server";
import { berekenScore } from "@/lib/scoring";
import { genereerAnalyse } from "@/lib/claude";
import { bepaalOnderzoeken, berekenKosten, genereerOpdrachtbrieven } from "@/lib/onderzoeken";
import { berekenWaardestijging } from "@/lib/waardestijging";
import type { Perceel, AnalyseResultaat, AdviesKaartData, ScoreFactor, Stap } from "@/types";
import { randomUUID } from "crypto";

export const maxDuration = 60;

function maakFallbackAdvies(totaalScore: number, factoren: ScoreFactor[]): {
  adviesKaart: AdviesKaartData; stappenplan: Stap[]
} {
  const advies = totaalScore >= 65 ? "go" : totaalScore >= 45 ? "twijfel" : "no-go";
  const slechtsteFactor = [...factoren].sort((a, b) => a.score - b.score)[0];
  return {
    adviesKaart: {
      advies,
      kernzin: advies === "go"
        ? "De locatiedata wijst op een reële kans — start met een principeverzoek bij de gemeente."
        : advies === "twijfel"
        ? "Er zijn kansen maar ook knelpunten — een principeverzoek geeft uitsluitsel over de haalbaarheid."
        : "Meerdere factoren vormen een hoge drempel — laat een omgevingsadviseur de haalbaarheid toetsen.",
      kritiekeFactor: {
        titel: slechtsteFactor?.naam ?? "Zie scorefactoren",
        uitleg: slechtsteFactor?.toelichting ?? "Raadpleeg de scorefactoren voor een gedetailleerde toelichting.",
      },
      gemeenteStrategie: {
        titel: "Start met een informeel vooroverleg",
        uitleg: "Neem contact op met de gemeente om de haalbaarheid informeel te bespreken vóór u een formele aanvraag indient.",
      },
      verborgenRisico: {
        titel: "AI-toelichting tijdelijk niet beschikbaar",
        uitleg: "Het uitgebreide AI-advies kon niet worden gegenereerd vanwege een servicelimiet. De scoreberekening is volledig gebaseerd op actuele brondata.",
        mitigatie: "Probeer de analyse over een uur opnieuw voor het volledige AI-advies.",
      },
      dataGaps: [],
    },
    stappenplan: [
      { nummer: 1, titel: "Informeel vooroverleg gemeente", beschrijving: "Bespreek het initiatief informeel met de gemeente voordat u formele stappen zet.", doorlooptijd: "1-2 weken", risico: "laag", vereist: true },
      { nummer: 2, titel: "Principeverzoek indienen", beschrijving: "Dien een principeverzoek in bij de gemeente om een officieel standpunt te verkrijgen.", doorlooptijd: "4-8 weken", risico: "gemiddeld", vereist: true },
      { nummer: 3, titel: "Ruimtelijke onderbouwing opstellen", beschrijving: "Laat een omgevingsadviseur een ruimtelijke onderbouwing opstellen op basis van gemeentelijk en provinciaal beleid.", doorlooptijd: "4-6 weken", risico: "gemiddeld", vereist: true },
      { nummer: 4, titel: "Verplichte onderzoeken uitvoeren", beschrijving: "Voer alle verplichte onderzoeken uit (zie kostenraming) en verwerk de resultaten in de aanvraag.", doorlooptijd: "8-16 weken", risico: "gemiddeld", vereist: true },
      { nummer: 5, titel: "Formele aanvraag omgevingsvergunning", beschrijving: "Dien de volledige aanvraag in bij de gemeente na een positief principebesluit.", doorlooptijd: "26 weken (uitgebreide procedure)", risico: "hoog", vereist: true },
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const perceel: Perceel = body.perceel;

    if (!perceel?.adres || !perceel?.lat || !perceel?.lon) {
      return NextResponse.json({ error: "Ongeldig verzoek: perceel data ontbreekt" }, { status: 400 });
    }

    const { factoren, totaalScore, scoreKlasse, reedsBouwgrond, huidigeBestemming, natura2000Score, precedentPlannen, hardBlockers } = await berekenScore(perceel);

    const onderzoeken = bepaalOnderzoeken(perceel, natura2000Score);
    const kostenRaming = berekenKosten(perceel, onderzoeken);
    const opdrachtbrieven = genereerOpdrachtbrieven(perceel, onderzoeken);
    const waardestijging = await berekenWaardestijging(perceel, kostenRaming);

    let adviesKaart: AdviesKaartData | undefined;
    let stappenplan: Stap[];
    try {
      const ai = await genereerAnalyse({ perceel, totaalScore, scoreKlasse, factoren, reedsBouwgrond, onderzoeken, precedentPlannen });
      adviesKaart = ai.adviesKaart;
      stappenplan = ai.stappenplan;
    } catch (aiErr) {
      console.error("Analyse AI mislukt, gebruik fallback:", aiErr instanceof Error ? aiErr.message : aiErr);
      const fallback = maakFallbackAdvies(totaalScore, factoren);
      adviesKaart = fallback.adviesKaart;
      stappenplan = fallback.stappenplan;
    }

    const resultaat: AnalyseResultaat = {
      perceel,
      scoreKlasse,
      totaalScore,
      factoren,
      adviesKaart,
      stappenplan,
      emailTemplates: [],
      gegenereedOp: new Date().toISOString(),
      analyseId: randomUUID(),
      reedsBouwgrond,
      huidigeBestemming,
      onderzoeken,
      kostenRaming,
      opdrachtbrieven,
      waardestijging,
      precedentPlannen,
      hardBlockers,
    };

    return NextResponse.json(resultaat);
  } catch (err) {
    console.error("Analyse fout:", err);
    const bericht = err instanceof Error ? err.message : "";
    if (bericht.includes("429") || bericht.toLowerCase().includes("rate limit")) {
      return NextResponse.json(
        { error: "De AI-service heeft het dagelijkse token-limiet bereikt. Probeer het over een uur opnieuw." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Analyse mislukt, probeer opnieuw" }, { status: 500 });
  }
}
