import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

function groqClient(key: string) {
  return new OpenAI({ apiKey: key, baseURL: "https://api.groq.com/openai/v1" });
}

export async function POST(req: NextRequest) {
  if (GROQ_KEYS.length === 0) {
    return NextResponse.json({ error: "Geen Groq API keys geconfigureerd" }, { status: 500 });
  }

  const { perceel, eigenaar } = await req.json();

  const prompt = `Schrijf een zakelijke acquisitie-e-mail (Nederlands) van een projectontwikkelaar aan de eigenaar van een agrarisch perceel.

Eigenaarsgegevens:
- Naam: ${eigenaar.naam}
- Type: ${eigenaar.type}
- Adres: ${eigenaar.correspondentieadres}

Perceelgegevens:
- Locatie: ${perceel.gemeente}, ${perceel.provincie}
- Perceelnummer: ${perceel.perceelId}
- Oppervlakte: ${perceel.oppervlakteM2} m²
- Bestemming: ${perceel.bestemming}

Toon:
- Professioneel maar persoonlijk
- Geen aankoopdruk — uitnodiging voor een vrijblijvend gesprek
- Noem de locatie specifiek
- Maximaal 150 woorden
- Geen aanhef "Geachte heer/mevrouw" maar de naam gebruiken als bekend
- Eindig met een concrete call-to-action (bellen of mailen)

Geef alleen de e-mailtekst terug, geen onderwerp of uitleg.`;

  for (const key of GROQ_KEYS) {
    try {
      const res = await groqClient(key).chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
      });
      const email = res.choices[0]?.message?.content?.trim() ?? "";
      return NextResponse.json({ email });
    } catch (e) {
      const bericht = e instanceof Error ? e.message : String(e);
      if (bericht.includes("429") && GROQ_KEYS.indexOf(key) < GROQ_KEYS.length - 1) continue;
      return NextResponse.json({ error: "E-mail generatie mislukt" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Alle Groq API keys hebben hun limiet bereikt" }, { status: 429 });
}
