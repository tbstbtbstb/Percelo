import OpenAI from "openai";
import type { ScoreFactor, ScoreKlasse, Stap, EmailTemplate, Perceel, AdviesKaartData, OnderzoekItem, PrecedentPlan } from "@/types";

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

function groqClient(apiKey: string) {
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
}

interface AnalyseInput {
  perceel: Perceel;
  totaalScore: number;
  scoreKlasse: ScoreKlasse;
  factoren: ScoreFactor[];
  reedsBouwgrond?: boolean;
  onderzoeken?: OnderzoekItem[];
  precedentPlannen?: PrecedentPlan[];
}

function bouwContext(input: AnalyseInput) {
  const factorenTekst = input.factoren
    .map((f) => `- ${f.naam} (gewicht ${f.gewicht}/5): score ${f.score}/100 — ${f.toelichting}`)
    .join("\n");
  const verplichteTitels = (input.onderzoeken ?? [])
    .filter((o) => o.verplicht)
    .map((o) => o.naam);
  const precedentTekst = (input.precedentPlannen ?? []).length
    ? (input.precedentPlannen ?? []).map((p) => `- ${p.naam} (${p.type}${p.datum ? ", " + p.datum : ""})`).join("\n")
    : null;
  return { factorenTekst, verplichteTitels, precedentTekst };
}

async function roepGroepAan(prompt: string): Promise<string> {
  if (GROQ_KEYS.length === 0) throw new Error("Geen Groq API keys geconfigureerd");
  let lastErr: unknown;
  for (const key of GROQ_KEYS) {
    try {
      const msg = await groqClient(key).chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4096,
        messages: [
          { role: "system", content: "Je bent een expert in Nederlandse ruimtelijke ordening. Reageer altijd in valide JSON zonder markdown code blocks." },
          { role: "user", content: prompt },
        ],
      });
      const text = msg.choices[0]?.message?.content ?? null;
      if (!text) throw new Error("Lege Groq response");
      return text;
    } catch (err) {
      lastErr = err;
      const bericht = err instanceof Error ? err.message : "";
      if (bericht.includes("429") && GROQ_KEYS.indexOf(key) < GROQ_KEYS.length - 1) continue;
      throw err;
    }
  }
  throw lastErr;
}

export async function genereerAnalyse(input: AnalyseInput): Promise<{
  adviesKaart: AdviesKaartData;
  stappenplan: Stap[];
}> {
  const { factorenTekst, verplichteTitels, precedentTekst } = bouwContext(input);

  const prompt = `Je bent een ervaren RO-adviseur in Nederland met 20 jaar ervaring in bestemmingswijzigingen en omgevingsrecht.

${input.reedsBouwgrond
  ? "Dit perceel heeft REEDS een bouw- of woonbestemming. Geef advies over wat de eigenaar kan doen (bouwaanvraag, omgevingsvergunning)."
  : "Beoordeel de volgende bestemmingswijzigingsaanvraag als adviseur — niet als rapporteur."}

**Perceel:** ${input.perceel.adres}
**Gemeente:** ${input.perceel.gemeente ?? "onbekend"}
**Provincie:** ${input.perceel.provincie ?? "onbekend"}
**Totaalscore:** ${input.totaalScore}/100 (${input.scoreKlasse})

**Scorefactoren:**
${factorenTekst}
${verplichteTitels.length ? `\n**Verplichte onderzoeken voor dit perceel:**\n${verplichteTitels.map((n) => `- ${n}`).join("\n")}` : ""}
${precedentTekst ? `\n**Bekende ruimtelijke plannen in de omgeving:**\n${precedentTekst}` : ""}

Lever het volgende in JSON-formaat (geen markdown, puur JSON):
{
  "adviesKaart": {
    "advies": "go|twijfel|no-go",
    "kernzin": "Één beslissende zin die uitlegt waarom go/twijfel/no-go — niet de score samenvatten maar een oordeel geven",
    "kritiekeFactor": {
      "titel": "Naam van de meest bepalende factor voor succes of falen",
      "uitleg": "2-3 zinnen: waarom is dit de doorslaggevende factor, en wat betekent dit concreet voor dit perceel en deze gemeente?",
      "precedent": {
        "referentie": "Naam of adres van een referentieproject binnen 10km van ${input.perceel.gemeente ?? "onbekend"}",
        "omschrijving": "1-2 zinnen: wat speelde er en wat werd er besloten.",
        "uitkomst": "vergund|afgewezen|ingetrokken"
      }
    },
    "gemeenteStrategie": {
      "titel": "Kernboodschap voor het principeverzoek",
      "uitleg": "2-3 zinnen: welk argument werkt het beste bij deze gemeente, en welke invalshoek te vermijden?"
    },
    "verborgenRisico": {
      "titel": "Risico dat de score niet volledig dekt",
      "uitleg": "2-3 zinnen: wat kan dit traject torpedaren buiten de scoreberekening?",
      "mitigatie": "Één concrete actie die de initiatiefnemer nu al kan nemen."
    },
    "dataGaps": [
      { "omschrijving": "Ontbrekende informatie die de beoordeling kan veranderen", "impact": "hoog|gemiddeld|laag" }
    ]
  },
  "stappenplan": [
    { "nummer": 1, "titel": "...", "beschrijving": "...", "doorlooptijd": "4-8 weken", "risico": "laag|gemiddeld|hoog", "vereist": true }
  ]
}

Regels: go/twijfel/no-go is een oordeel, geen samenvatting van de score. Maximaal 2 dataGaps. Stappenplan 5-7 stappen.`;

  const text = await roepGroepAan(prompt);
  const parsed = JSON.parse(text);

  return {
    adviesKaart: parsed.adviesKaart,
    stappenplan: parsed.stappenplan ?? [],
  };
}

export async function genereerEmailTemplates(input: AnalyseInput): Promise<EmailTemplate[]> {
  const { factorenTekst, verplichteTitels } = bouwContext(input);

  const prompt = `Je bent een ervaren RO-adviseur in Nederland. Genereer 5 verzendklare brieven voor bestemmingswijziging.

**Perceel:** ${input.perceel.adres}
**Gemeente:** ${input.perceel.gemeente ?? "onbekend"}
**Provincie:** ${input.perceel.provincie ?? "onbekend"}
**Totaalscore:** ${input.totaalScore}/100
**Verplichte onderzoeken:** ${verplichteTitels.length ? verplichteTitels.join(", ") : "conform vereisten"}

Top scorefactoren:
${factorenTekst.split("\n").slice(0, 5).join("\n")}

Lever puur JSON (geen markdown):
[
  {
    "type": "principeverzoek",
    "onderwerp": "Principeverzoek bestemmingswijziging ${input.perceel.adres}",
    "ontvanger": "Gemeente ${input.perceel.gemeente ?? "[gemeente]"}",
    "inhoud": "Volledige verzendklare brief, minimaal 350 woorden. Structuur: aanhef → introductie perceel + initiatief → motivatie waarom dit past binnen het beleid van gemeente ${input.perceel.gemeente ?? "[gemeente]"} → ruimtelijke onderbouwing → behandeling top-2 bezwaarpunten → bijlagenlijst met verplichte onderzoeken → verzoek om principebesluit → afsluiting met [Naam], [Telefoon], [E-mail]."
  },
  {
    "type": "informatievraag-provincie",
    "onderwerp": "Informatievraag provinciaal beleid — ${input.perceel.adres}",
    "ontvanger": "Provincie ${input.perceel.provincie ?? "[provincie]"}",
    "inhoud": "Volledige brief, minimaal 250 woorden. Vragen over provinciale omgevingsvisie, ladder verstedelijking, beschermde gebieden en woningbouwprogramma's voor dit perceel."
  },
  {
    "type": "vooroverleg-omgevingsdienst",
    "onderwerp": "Verzoek vooroverleg omgevingsvergunning — ${input.perceel.adres}",
    "ontvanger": "Omgevingsdienst",
    "inhoud": "Volledige brief, minimaal 250 woorden. Verzoek vooroverleg, vragen over milieunormen, benodigde onderzoeken en bekende knelpunten."
  },
  {
    "type": "herinnering-principeverzoek",
    "onderwerp": "Herinnering: principeverzoek bestemmingswijziging ${input.perceel.adres}",
    "ontvanger": "Gemeente ${input.perceel.gemeente ?? "[gemeente]"}",
    "inhoud": "Professionele herinnering, minimaal 150 woorden, ca. 4 weken na het principeverzoek."
  },
  {
    "type": "afwijzing-aanvechten",
    "onderwerp": "Bezwaarschrift afwijzing principeverzoek — ${input.perceel.adres}",
    "ontvanger": "Gemeente ${input.perceel.gemeente ?? "[gemeente]"}",
    "inhoud": "Formeel bezwaarschrift, minimaal 300 woorden. Gronden: motiveringsgebrek, gelijkheidsbeginsel, proportionaliteitsbeginsel."
  }
]`;

  const text = await roepGroepAan(prompt);
  return JSON.parse(text) as EmailTemplate[];
}
