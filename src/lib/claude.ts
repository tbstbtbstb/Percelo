import OpenAI from "openai";
import type { ScoreFactor, ScoreKlasse, Stap, EmailTemplate, Perceel } from "@/types";

const grok = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

interface AnalyseInput {
  perceel: Perceel;
  totaalScore: number;
  scoreKlasse: ScoreKlasse;
  factoren: ScoreFactor[];
  reedsBouwgrond?: boolean;
}

export async function genereerAnalyse(input: AnalyseInput): Promise<{
  rapport: string;
  stappenplan: Stap[];
  emailTemplates: EmailTemplate[];
}> {
  const factorenTekst = input.factoren
    .map((f) => `- ${f.naam} (gewicht ${f.gewicht}/5): score ${f.score}/100 — ${f.toelichting}`)
    .join("\n");

  const prompt = `Je bent een expert in Nederlandse ruimtelijke ordening, bestemmingsplannen en omgevingsrecht.

${input.reedsBouwgrond
  ? "Dit perceel heeft REEDS een bouw- of woonbestemming. Leg duidelijk uit dat een bestemmingswijziging niet nodig is, en geef aan wat de eigenaar eventueel wél kan doen (bouwaanvraag, omgevingsvergunning, etc.)."
  : "Analyseer de volgende kansscoring voor een bestemmingswijziging van agrarische grond naar bouwgrond:"}

**Perceel:** ${input.perceel.adres}
**Gemeente:** ${input.perceel.gemeente ?? "onbekend"}
**Provincie:** ${input.perceel.provincie ?? "onbekend"}
**Totaalscore:** ${input.totaalScore}/100 (${input.scoreKlasse})

**Scorefactoren:**
${factorenTekst}

Lever het volgende in JSON-formaat (geen markdown, puur JSON):
{
  "rapport": "Uitgebreide analyse van 300-400 woorden in het Nederlands...",
  "stappenplan": [
    {
      "nummer": 1,
      "titel": "...",
      "beschrijving": "...",
      "doorlooptijd": "bijv. 4-8 weken",
      "risico": "laag|gemiddeld|hoog",
      "vereist": true
    }
  ],
  "emailTemplates": [
    {
      "type": "principeverzoek",
      "onderwerp": "...",
      "ontvanger": "Gemeente ${input.perceel.gemeente ?? "[gemeente]"}",
      "inhoud": "Volledige e-mailtekst klaar voor verzending..."
    },
    {
      "type": "informatievraag-provincie",
      "onderwerp": "...",
      "ontvanger": "Provincie ${input.perceel.provincie ?? "[provincie]"}",
      "inhoud": "Volledige e-mailtekst..."
    },
    {
      "type": "vooroverleg-omgevingsdienst",
      "onderwerp": "...",
      "ontvanger": "Omgevingsdienst",
      "inhoud": "Volledige e-mailtekst..."
    }
  ]
}

Het rapport moet:
- De score onderbouwen met juridische en ruimtelijke argumenten
- Risico's en kansen specifiek benoemen voor deze locatie
- Praktische aanbevelingen geven
- Verwijzen naar relevante wet- en regelgeving (Wro, Omgevingswet, NOVI)

Het stappenplan moet 5-7 concrete stappen bevatten voor de procedure.
De e-mails moeten professioneel en juridisch correct zijn, klaar voor directe verzending.`;

  const message = await grok.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: "Je bent een expert in Nederlandse ruimtelijke ordening. Reageer altijd in valide JSON zonder markdown code blocks.",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = message.choices[0]?.message?.content;
  if (!text) throw new Error("Geen response van Grok");

  const parsed = JSON.parse(text);

  return {
    rapport: parsed.rapport,
    stappenplan: parsed.stappenplan ?? [],
    emailTemplates: parsed.emailTemplates ?? [],
  };
}
