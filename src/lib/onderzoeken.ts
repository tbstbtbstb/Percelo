import type { Perceel, OnderzoekItem, KostenPost, KostenRaming, OpdrachtBrief } from "@/types";

// ─── Tariefdata (gedeeld door bepaalOnderzoeken + berekenKosten) ─────────────

const GEMEENTE_LEGES: Record<string, { min: number; max: number }> = {
  Amsterdam: { min: 4500, max: 7000 },
  Rotterdam: { min: 3500, max: 5500 },
  Utrecht: { min: 3800, max: 5800 },
  "Den Haag": { min: 4000, max: 6000 },
  Eindhoven: { min: 2500, max: 4500 },
  Tilburg: { min: 2200, max: 4000 },
  Groningen: { min: 2000, max: 3800 },
  Nijmegen: { min: 2400, max: 4200 },
  Haarlem: { min: 3500, max: 5500 },
  Arnhem: { min: 2200, max: 3800 },
  Amersfoort: { min: 2800, max: 4800 },
  Apeldoorn: { min: 2000, max: 3500 },
  Zwolle: { min: 2000, max: 3500 },
  Leiden: { min: 3500, max: 5500 },
  Dordrecht: { min: 2200, max: 3800 },
  Haarlemmermeer: { min: 3000, max: 5000 },
  Almere: { min: 2500, max: 4000 },
  Breda: { min: 2200, max: 4000 },
  "Den Bosch": { min: 2300, max: 4200 },
  "s-Hertogenbosch": { min: 2300, max: 4200 },
  Maastricht: { min: 2200, max: 3800 },
  Enschede: { min: 1800, max: 3200 },
  Deventer: { min: 1800, max: 3000 },
  Delft: { min: 3200, max: 5200 },
  Westland: { min: 2800, max: 4500 },
  "Alphen aan den Rijn": { min: 2200, max: 3800 },
  Alphen: { min: 2200, max: 3800 },
  Gouda: { min: 2400, max: 4000 },
  Zoetermeer: { min: 3000, max: 5000 },
  Leeuwarden: { min: 1800, max: 3000 },
  Middelburg: { min: 1800, max: 3000 },
  Venlo: { min: 2000, max: 3500 },
  Roosendaal: { min: 1900, max: 3200 },
  "De Ronde Venen": { min: 2000, max: 3500 },
  Woerden: { min: 2200, max: 3800 },
  "Stichtse Vecht": { min: 2200, max: 4000 },
  Kaag: { min: 2000, max: 3500 },
  Katwijk: { min: 2400, max: 4000 },
  Súdwest: { min: 1600, max: 2800 },
};

const PROVINCIE_LEGES: Record<string, { min: number; max: number }> = {
  "Noord-Holland": { min: 3000, max: 5500 },
  "Zuid-Holland": { min: 2800, max: 5000 },
  Utrecht: { min: 2500, max: 4500 },
  Flevoland: { min: 2000, max: 3500 },
  Overijssel: { min: 1800, max: 3200 },
  Gelderland: { min: 2000, max: 3800 },
  "Noord-Brabant": { min: 2000, max: 3800 },
  Limburg: { min: 1800, max: 3200 },
  Drenthe: { min: 1600, max: 2800 },
  Friesland: { min: 1600, max: 2800 },
  Groningen: { min: 1700, max: 3000 },
  Zeeland: { min: 1600, max: 2800 },
};

const GROTE_STEDEN = new Set([
  "Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg",
  "Groningen", "Almere", "Breda", "Nijmegen", "Haarlem", "Arnhem", "Zaanstad",
  "Amersfoort", "Apeldoorn", "Enschede", "s-Hertogenbosch", "Zwolle", "Leiden",
  "Dordrecht", "Haarlemmermeer", "Zoetermeer", "Maastricht", "Emmen",
]);

const RANDSTAD_PROVINCIES = new Set(["Noord-Holland", "Zuid-Holland", "Utrecht", "Flevoland"]);

const HOGE_ANTERIEUR_PROVINCIES = new Set([
  "Noord-Holland", "Utrecht", "Gelderland", "Noord-Brabant", "Overijssel",
]);

// ─── Perceelgrootte scaling ───────────────────────────────────────────────────

type SizeKlasse = "klein" | "midden" | "groot";

function getSizeKlasse(m2: number): SizeKlasse {
  if (m2 < 2000)  return "klein";
  if (m2 <= 10000) return "midden";
  return "groot";
}

// Marktprijzen 2024–2025, gebaseerd op RO-branche benchmarks en SIKB-tarieven
const TARIEVEN: Record<string, Record<SizeKlasse, { min: number; max: number; tijd: string }>> = {
  bodem: {
    klein:  { min: 900,  max: 1800, tijd: "1–2 weken" },
    midden: { min: 1800, max: 3200, tijd: "2–4 weken" },
    groot:  { min: 3200, max: 7000, tijd: "3–6 weken" },
  },
  akoestisch: {
    klein:  { min: 1200, max: 2000, tijd: "1–2 weken" },
    midden: { min: 1500, max: 2500, tijd: "2–3 weken" },
    groot:  { min: 2200, max: 4000, tijd: "2–4 weken" },
  },
  ecologie: {
    klein:  { min: 600,  max: 1100, tijd: "1–2 weken" },
    midden: { min: 900,  max: 1600, tijd: "2–4 weken" },
    groot:  { min: 1600, max: 3200, tijd: "3–6 weken" },
  },
  water: {
    klein:  { min: 400,  max: 1000, tijd: "2–4 weken" },
    midden: { min: 600,  max: 1500, tijd: "4–8 weken" },
    groot:  { min: 1000, max: 2500, tijd: "4–10 weken" },
  },
  landschap: {
    klein:  { min: 1500, max: 3000, tijd: "2–3 weken" },
    midden: { min: 2000, max: 5000, tijd: "2–4 weken" },
    groot:  { min: 4000, max: 9000, tijd: "3–6 weken" },
  },
  archeologie: {
    klein:  { min: 800,  max: 2000, tijd: "2–4 weken" },
    midden: { min: 1500, max: 4000, tijd: "3–6 weken" },
    groot:  { min: 3500, max: 9000, tijd: "6–12 weken" },
  },
  adviseur: {
    klein:  { min: 3500, max: 9000,  tijd: "" },
    midden: { min: 4500, max: 13000, tijd: "" },
    groot:  { min: 7000, max: 22000, tijd: "" },
  },
};

// ─── Locatieklasse ────────────────────────────────────────────────────────────

function getLocatieKlasse(perceel: Perceel) {
  const gemeente = perceel.gemeente ?? "";
  const provincie = perceel.provincie ?? "";
  const isGroteSted = GROTE_STEDEN.has(gemeente);
  const isRandstad = RANDSTAD_PROVINCIES.has(provincie);
  const isHogeAnterieur = HOGE_ANTERIEUR_PROVINCIES.has(provincie);
  const leges =
    GEMEENTE_LEGES[gemeente] ?? PROVINCIE_LEGES[provincie] ?? { min: 2000, max: 4500 };
  const legesBron = GEMEENTE_LEGES[gemeente]
    ? `Tarief voor ${gemeente} o.b.v. gepubliceerde legesverordening`
    : PROVINCIE_LEGES[provincie]
    ? `Schatting voor ${provincie} — exacte tarieven staan in de legesverordening van ${gemeente || "uw gemeente"}`
    : `Nationaal gemiddelde — raadpleeg de legesverordening van ${gemeente || "uw gemeente"}`;
  const anterieur = isGroteSted
    ? { min: 3000, max: 15000, label: "Stedelijk kostenverhaal infrastructuur" }
    : isHogeAnterieur
    ? { min: 10000, max: 40000, label: "Landschapsfonds + kostenverhaal (provinciale eis)" }
    : { min: 5000, max: 25000, label: "Anterieure overeenkomst & landschapsfonds" };
  const planschade = isGroteSted
    ? { min: 5000, max: 20000 }
    : isRandstad
    ? { min: 3500, max: 15000 }
    : { min: 2000, max: 10000 };
  return { gemeente, provincie, isGroteSted, isRandstad, isHogeAnterieur, leges, legesBron, anterieur, planschade };
}

// ─── Onderzoeken + procedures + documenten ───────────────────────────────────

export function bepaalOnderzoeken(
  perceel: Perceel,
  natura2000Score: number
): OnderzoekItem[] {
  const nabijNatura2000 = natura2000Score < 70;
  const kritiekNatura2000 = natura2000Score < 40;
  const { gemeente, provincie, isGroteSted, isHogeAnterieur, leges, legesBron, anterieur, planschade } =
    getLocatieKlasse(perceel);
  const size = getSizeKlasse(perceel.perceelOppervlakte ?? 2500);
  const T = TARIEVEN;

  const onderzoeken: OnderzoekItem[] = [
    // ── Procedures ───────────────────────────────────────────────────────────
    {
      naam: "Principeverzoek bij gemeente",
      categorie: "procedure",
      verplicht: true,
      toelichting:
        "Informeel verzoek aan de gemeente om in beginsel medewerking te verlenen aan uw initiatief. " +
        "Vrijwel alle gemeenten verlangen dit als eerste stap vóórdat u dure onderzoeken laat uitvoeren. " +
        "De gemeente geeft aan of ze bereid zijn mee te werken en onder welke voorwaarden — dit voorkomt onnodige kosten.",
      kostenMin: 0,
      kostenMax: 500,
      doorlooptijd: "4–12 weken (afhankelijk van gemeente)",
      risico: "laag",
      trigger: "Altijd eerste stap — doe dit vóór alle overige kosten en onderzoeken",
    },

    // ── Onderzoeken ──────────────────────────────────────────────────────────
    {
      naam: "Bodemonderzoek (NEN 5740)",
      categorie: "onderzoek",
      verplicht: true,
      toelichting:
        "Agrarische grond heeft verhoogd risico op verontreiniging door jarenlang gebruik van meststoffen en bestrijdingsmiddelen. Gemeente vereist een verkennend bodemonderzoek voor elke bestemmingswijziging.",
      kostenMin: T.bodem[size].min,
      kostenMax: T.bodem[size].max,
      doorlooptijd: T.bodem[size].tijd,
      risico: "gemiddeld",
      trigger: "Altijd verplicht bij bestemmingswijziging naar wonen",
    },
    {
      naam: "Akoestisch onderzoek (Wet geluidhinder)",
      categorie: "onderzoek",
      verplicht: true,
      toelichting:
        "Toetst of de geluidsbelasting van wegen, spoor en industrie op de nieuwe woonfunctie binnen de wettelijke normen valt. Vereist bij elke aanvraag voor woonbestemming.",
      kostenMin: T.akoestisch[size].min,
      kostenMax: T.akoestisch[size].max,
      doorlooptijd: T.akoestisch[size].tijd,
      risico: "gemiddeld",
      trigger: "Verplicht bij nieuwe woonfunctie nabij wegen of spoor",
    },
    {
      naam: "Ecologische quickscan (Wet natuurbescherming)",
      categorie: "onderzoek",
      verplicht: true,
      toelichting:
        "Inventariseert beschermde flora en fauna op en rondom het perceel. Bij aanwezigheid van beschermde soorten (vleermuizen, vogels, amfibieën) volgt een nader onderzoek dat maanden extra kost.",
      kostenMin: T.ecologie[size].min,
      kostenMax: T.ecologie[size].max,
      doorlooptijd: `${T.ecologie[size].tijd} (seizoensgebonden)`,
      risico: "gemiddeld",
      trigger: "Verplicht bij ruimtelijke ingrepen — beschermde soorten zijn een veelvoorkomend obstakel",
    },
    {
      naam: "Watertoets / Wateradvies waterschap",
      categorie: "onderzoek",
      verplicht: true,
      toelichting:
        "Het waterschap beoordeelt gevolgen voor waterafvoer, grondwaterpeil en overstromingsrisico. Nieuwbouw in het buitengebied vereist altijd een positief wateradvies.",
      kostenMin: T.water[size].min,
      kostenMax: T.water[size].max,
      doorlooptijd: T.water[size].tijd + " (advies waterschap)",
      risico: "laag",
      trigger: "Verplicht bij elke ruimtelijke ontwikkeling",
    },
    {
      naam: "Landschappelijk inpassingsplan",
      categorie: "onderzoek",
      verplicht: true,
      toelichting:
        "Toont aan hoe het nieuwe bouwperceel visueel past in het buitengebied. Vrijwel alle gemeenten eisen dit als onderdeel van de ruimtelijke onderbouwing. Omvat beplantingsplan en erfinrichting.",
      kostenMin: T.landschap[size].min,
      kostenMax: T.landschap[size].max,
      doorlooptijd: T.landschap[size].tijd,
      risico: "laag",
      trigger: "Standaard vereiste bij buitengebied-ontwikkeling",
    },
    {
      naam: "Archeologisch vooronderzoek",
      categorie: "onderzoek",
      verplicht: false,
      toelichting:
        "Vereist als het perceel in een zone met middelhoge of hoge archeologische verwachting ligt (zie gemeentelijke archeologische beleidskaart). Bij positieve vondsten volgt een opgraving die het project aanzienlijk vertraagt.",
      kostenMin: T.archeologie[size].min,
      kostenMax: T.archeologie[size].max,
      doorlooptijd: T.archeologie[size].tijd,
      risico: "gemiddeld",
      trigger: "Controleer de gemeentelijke archeologiekaart — vereist bij verwachtingswaarde 'middelhoog' of hoger",
    },
    {
      naam: "Externe veiligheidsonderzoek",
      categorie: "onderzoek",
      verplicht: false,
      toelichting:
        "Nodig als het perceel binnen het invloedsgebied van een risicobron ligt (gasleiding, LPG-station, spoorlijn met gevaarlijke stoffen). Raadpleeg risicokaart.nl.",
      kostenMin: 500,
      kostenMax: 1500,
      doorlooptijd: "1–2 weken",
      risico: "laag",
      trigger: "Controleer risicokaart.nl op nabijgelegen risicobronnen",
    },

    // ── Documenten ───────────────────────────────────────────────────────────
    {
      naam: "Ruimtelijke onderbouwing",
      categorie: "document",
      verplicht: true,
      toelichting:
        "Verplicht juridisch document dat aantoont dat de bestemmingswijziging past binnen gemeentelijk, provinciaal en nationaal beleid. " +
        "Omvat planologische analyse, toetsing aan omgevingsvisies en samenvatting van alle onderzoeksresultaten. " +
        "Wordt opgesteld door uw RO-adviseur en ingediend als bijlage bij de omgevingsplan-aanvraag.",
      kostenMin: 3000,
      kostenMax: 8000,
      doorlooptijd: "4–8 weken (na beschikbaarheid onderzoeken)",
      risico: "gemiddeld",
      trigger: "Verplicht bij elke bestemmingswijziging / omgevingsplanwijziging",
    },
    {
      naam: anterieur.label,
      categorie: "document",
      verplicht: true,
      toelichting: isGroteSted
        ? `${gemeente} rekent kostenverhaal voor infrastructuur via een anterieure overeenkomst. ` +
          "De gemeente mag de procedure niet starten voordat deze overeenkomst is getekend."
        : isHogeAnterieur
        ? `${provincie} verplicht gemeenten tot een landschappelijke tegenprestatie bij buitengebied-ontwikkeling. ` +
          "Hoogte van de bijdrage is afhankelijk van gemeentelijk beleid en het provinciaal landschapsfonds."
        : `Overeenkomst met de gemeente over kostenverhaal voor plankosten en eventuele landschappelijke bijdrage. ` +
          `Vraag vroegtijdig na bij ${gemeente || "de gemeente"} — de gemeente mag de procedure niet starten zonder getekende overeenkomst.`,
      kostenMin: anterieur.min,
      kostenMax: anterieur.max,
      doorlooptijd: "4–16 weken (onderhandeling met gemeente)",
      risico: "gemiddeld",
      trigger: "Verplicht onder Omgevingswet art. 13.11 — gemeente start procedure niet zonder getekende overeenkomst",
    },
    {
      naam: "Planschaderisico-overeenkomst",
      categorie: "document",
      verplicht: true,
      toelichting:
        "Overeenkomst waarbij u zich jegens de gemeente verplicht eventuele planschadeclaims van omwonenden te vergoeden. " +
        "Gemeenten stellen dit standaard verplicht vóórdat de procedure start, zodat planschade-uitkeringen niet ten laste van de gemeentelijke begroting komen. " +
        (isGroteSted ? `In ${gemeente} is het claimrisico hoger door het grotere aantal omwonenden.` : ""),
      kostenMin: planschade.min,
      kostenMax: planschade.max,
      doorlooptijd: "Vóór start procedure (onderdeel vooroverleg)",
      risico: isGroteSted ? "gemiddeld" : "laag",
      trigger: "Standaard vereiste van gemeenten — beschermt gemeentelijke begroting",
    },

    // ── Leges ────────────────────────────────────────────────────────────────
    {
      naam: `Gemeentelijke leges omgevingsplan${gemeente ? ` — ${gemeente}` : ""}`,
      categorie: "leges",
      verplicht: true,
      toelichting:
        legesBron +
        ". Leges zijn verschuldigd bij indiening van de formele aanvraag en zijn niet restitueerbaar bij afwijzing. " +
        "Het exacte bedrag is afhankelijk van het type omgevingsplanwijziging en de bouwkosten.",
      kostenMin: leges.min,
      kostenMax: leges.max,
      doorlooptijd: "Betaling bij indiening aanvraag",
      risico: "laag",
      trigger: "Verschuldigd bij indiening omgevingsplan-aanvraag — controleer de legesverordening",
    },

    // ── Natura2000 conditional ────────────────────────────────────────────────
    ...(nabijNatura2000
      ? [
          {
            naam: "AERIUS-berekening (stikstofdeposities)",
            categorie: "onderzoek" as const,
            verplicht: true,
            toelichting: kritiekNatura2000
              ? "Het perceel ligt binnen 5 km van een Natura2000-gebied. Na de Raad van State-uitspraak van december 2024 is intern salderen niet meer toegestaan in de voortoets. Een AERIUS-berekening is verplicht en er is een grote kans dat een volledige passende beoordeling nodig is — een potentieel kritiek obstakel."
              : "Het perceel ligt in de buurt van een Natura2000-gebied. Een AERIUS-berekening is verplicht om aan te tonen dat de stikstofdepositie van de nieuwe woonfunctie onder de drempelwaarde blijft.",
            kostenMin: kritiekNatura2000 ? 5000 : 500,
            kostenMax: kritiekNatura2000 ? 20000 : 1500,
            doorlooptijd: kritiekNatura2000 ? "3–6 maanden" : "1–2 weken",
            risico: (kritiekNatura2000 ? "kritiek" : "hoog") as OnderzoekItem["risico"],
            trigger: `Natura2000-gebied binnen ${kritiekNatura2000 ? "5" : "10"} km gedetecteerd`,
          } satisfies OnderzoekItem,
        ]
      : []),

    // ── Geur (Noord-Brabant/Limburg) ──────────────────────────────────────────
    ...(provincie === "Noord-Brabant" || provincie === "Limburg"
      ? [
          {
            naam: "Geurhinderonderzoek (Wet geurhinder en veehouderij)",
            categorie: "onderzoek" as const,
            verplicht: false,
            toelichting:
              "In Noord-Brabant en Limburg zijn concentraties intensieve veehouderij hoog. Als er een veehouderij binnen de wettelijke afstandsnorm ligt, is een geuronderzoek verplicht en kan woningbouw worden geblokkeerd.",
            kostenMin: 800,
            kostenMax: 2000,
            doorlooptijd: "2–3 weken",
            risico: "hoog" as const,
            trigger: "Verhoogd risico in Noord-Brabant en Limburg door concentratie veehouderij",
          } satisfies OnderzoekItem,
        ]
      : []),
  ];

  return onderzoeken;
}

// ─── Kostencalculator ─────────────────────────────────────────────────────────

export function berekenKosten(
  perceel: Perceel,
  onderzoeken: OnderzoekItem[]
): KostenRaming {
  const { gemeente, provincie, isGroteSted, isRandstad, isHogeAnterieur, leges, legesBron, anterieur, planschade } =
    getLocatieKlasse(perceel);
  const size = getSizeKlasse(perceel.perceelOppervlakte ?? 2500);
  const locFactor = isRandstad ? 1.5 : isGroteSted ? 1.25 : 1.0;
  const adviseur = {
    min: Math.round(TARIEVEN.adviseur[size].min * locFactor),
    max: Math.round(TARIEVEN.adviseur[size].max * locFactor),
  };

  // Alleen de technische onderzoeken (niet leges/doc/procedure — die staan al als aparte posten)
  const verplichtOnderzoeken = onderzoeken.filter(
    (o) => o.verplicht && (!o.categorie || o.categorie === "onderzoek")
  );
  const onderzoekMin = verplichtOnderzoeken.reduce((s, o) => s + o.kostenMin, 0);
  const onderzoekMax = verplichtOnderzoeken.reduce((s, o) => s + o.kostenMax, 0);

  const posten: KostenPost[] = [
    {
      naam: "Verplichte onderzoeken",
      beschrijving: `${verplichtOnderzoeken.length} technische onderzoeken voor ${gemeente || "uw locatie"}`,
      bedragMin: onderzoekMin,
      bedragMax: onderzoekMax,
      categorie: "onderzoek",
    },
    {
      naam: `Gemeentelijke leges${gemeente ? ` (${gemeente})` : ""}`,
      beschrijving: legesBron,
      bedragMin: leges.min,
      bedragMax: leges.max,
      categorie: "leges",
    },
    {
      naam: "Adviseur ruimtelijke ordening",
      beschrijving: isRandstad
        ? `Planoloog in de Randstad (${provincie}) — hogere uurtarieven dan landelijk gemiddelde`
        : isGroteSted
        ? `RO-adviseur in ${gemeente} — iets hogere tarieven door complexere stedelijke context`
        : "Planoloog of RO-adviseur voor ruimtelijke onderbouwing en procesbegeleiding",
      bedragMin: adviseur.min,
      bedragMax: adviseur.max,
      categorie: "adviseur",
    },
    {
      naam: anterieur.label,
      beschrijving: isGroteSted
        ? `${gemeente} rekent kostenverhaal voor infrastructuur.`
        : isHogeAnterieur
        ? `${provincie} verplicht gemeenten tot een landschappelijke tegenprestatie bij buitengebied-ontwikkeling.`
        : `Anterieure overeenkomst voor plankosten en eventuele landschappelijke bijdrage.`,
      bedragMin: anterieur.min,
      bedragMax: anterieur.max,
      categorie: "anterieur",
    },
    {
      naam: "Planschaderisico (buffer)",
      beschrijving: isGroteSted
        ? `In ${gemeente} wonen meer omwonenden die planschade kunnen claimen.`
        : "Buffer voor eventuele planschadeclaims van omwonenden via een planschadevergoedingsovereenkomst.",
      bedragMin: planschade.min,
      bedragMax: planschade.max,
      categorie: "overig",
    },
  ];

  const totaalMin = posten.reduce((sum, p) => sum + p.bedragMin, 0);
  const totaalMax = posten.reduce((sum, p) => sum + p.bedragMax, 0);

  return { posten, totaalMin, totaalMax };
}

// ─── Opdrachtbrieven ──────────────────────────────────────────────────────────

const VANDAAG = () =>
  new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export function genereerOpdrachtbrieven(
  perceel: Perceel,
  onderzoeken: OnderzoekItem[]
): OpdrachtBrief[] {
  const adres = perceel.adres;
  const gemeente = perceel.gemeente ?? "[gemeente]";
  const provincie = perceel.provincie ?? "[provincie]";
  const waterschap = perceel.waterschap ?? "[waterschap]";
  const datum = VANDAAG();
  const doel = `bestemmingswijziging van agrarische bestemming naar woonbestemming op het perceel ${adres}, gemeente ${gemeente}`;
  const locRegel = `Adres:       ${adres}\nGemeente:    ${gemeente}\nProvincie:   ${provincie}\nCoördinaten: ${perceel.lat.toFixed(5)}°N, ${perceel.lon.toFixed(5)}°E`;

  const brieven: OpdrachtBrief[] = [];

  for (const onderzoek of onderzoeken) {

    // ── Principeverzoek ────────────────────────────────────────────────────
    if (onderzoek.naam.startsWith("Principeverzoek")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "gemeente",
        onderwerp: `Principeverzoek bestemmingswijziging / omgevingsplanwijziging — ${adres}`,
        inhoud: `${datum}

Aan: Gemeente ${gemeente}
Afdeling: Ruimtelijke Ordening / Omgevingsloket

Betreft: Principeverzoek wijziging omgevingsplan — ${adres}

Geacht college van burgemeester en wethouders,

Hierbij dienen wij een principeverzoek in voor een voorgenomen bestemmingswijziging op onderstaande locatie.

LOCATIEGEGEVENS
${locRegel}

INITIATIEF
Wij overwegen de agrarische grond op bovengenoemde locatie te laten omzetten naar een woonbestemming, met als doel de realisatie van [aantal] woning(en). Het perceel heeft momenteel een agrarische bestemming en is niet in gebruik als actief agrarisch bedrijf.

MOTIVATIE
Wij menen dat het initiatief kansrijk is om de volgende redenen:
• Het perceel grenst aan / ligt nabij bestaand bebouwd gebied
• De omgeving heeft een gemengd karakter met reeds aanwezige woonfuncties
• Het initiatief past naar onze inschatting binnen de gemeentelijke omgevingsvisie
• [Voeg eventuele aanvullende argumenten toe]

VERZOEK
Wij verzoeken u ons te informeren over:
1. Of de gemeente in beginsel bereid is medewerking te verlenen aan dit initiatief
2. Welke voorwaarden en beleidsuitgangspunten van toepassing zijn
3. Welke onderzoeken en documenten vereist zijn voor de formele aanvraag
4. Of een intakegesprek / vooroverleg mogelijk is

Wij zijn bereid een toelichting te geven en staan open voor een kennismakingsgesprek op uw kantoor.

Met vriendelijke groet,

[Naam initiatiefnemer]
[Adres initiatiefnemer]
[Telefoon / e-mail]`,
      });
    }

    // ── Ruimtelijke onderbouwing ───────────────────────────────────────────
    if (onderzoek.naam.startsWith("Ruimtelijke onderbouwing")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "adviseur",
        onderwerp: `Opdracht ruimtelijke onderbouwing omgevingsplanwijziging — ${adres}`,
        inhoud: `${datum}

Geacht RO-adviesbureau,

Hierbij verstrekken wij u de opdracht voor het opstellen van een ruimtelijke onderbouwing ten behoeve van een omgevingsplanwijziging op onderstaande locatie.

LOCATIEGEGEVENS
${locRegel}

DOEL
Het document dient de juridisch-planologische basis te vormen voor een ${doel}. De ruimtelijke onderbouwing wordt ingediend als verplicht bijlagedocument bij de formele aanvraag omgevingsplanwijziging bij de gemeente ${gemeente}.

VEREISTE INHOUD
De ruimtelijke onderbouwing dient minimaal te bevatten:

1. Beschrijving initiatief
   • Huidige situatie (bestemmingsplan, feitelijk gebruik, eigendomssituatie)
   • Gewenste situatie (bouwvolume, woningtype, ontsluiting, parkeren)

2. Beleidskader
   • Nationaal beleid: NOVI, Besluit kwaliteit leefomgeving (Bkl)
   • Ladder voor duurzame verstedelijking (art. 5.129g Bkl) — toetsing verplicht
   • Provinciaal beleid: omgevingsvisie ${provincie}, omgevingsverordening ${provincie}
   • Gemeentelijk beleid: omgevingsvisie ${gemeente}, buitengebiedbeleid

3. Omgevingsaspecten (te koppelen aan de onderzoeksresultaten)
   • Bodem, geluid, ecologie, water, archeologie, externe veiligheid, geur (indien van toepassing)
   • Stikstof / Natura2000 (indien van toepassing)

4. Uitvoerbaarheid
   • Maatschappelijke uitvoerbaarheid (zienswijzen, overleg)
   • Economische uitvoerbaarheid (anterieure overeenkomst)

5. Conclusie
   • Motivering dat het plan voldoet aan een goede ruimtelijke ordening

AFSTEMMING
Wij verzoeken u het document af te stemmen op de uitkomsten van de parallel uit te voeren onderzoeken. Na oplevering van alle onderzoeksrapporten dient de ruimtelijke onderbouwing te worden geactualiseerd.

Gelieve een offerte inclusief indicatieve doorlooptijd en benodigde aanleverpunten te verstrekken.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    // ── Anterieure overeenkomst ────────────────────────────────────────────
    if (onderzoek.naam.toLowerCase().includes("anterieure") || onderzoek.naam.toLowerCase().includes("kostenverhaal") || onderzoek.naam.toLowerCase().includes("landschapsfonds")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "gemeente",
        onderwerp: `Verzoek anterieure overeenkomst kostenverhaal — ${adres}`,
        inhoud: `${datum}

Aan: Gemeente ${gemeente}
Afdeling: Ruimtelijke Ordening / Grondzaken

Betreft: Verzoek tot opstellen anterieure overeenkomst — ${adres}

Geacht college van burgemeester en wethouders,

In het kader van de voorgenomen ${doel} verzoeken wij u een anterieure overeenkomst op te stellen conform de Omgevingswet.

LOCATIEGEGEVENS
${locRegel}

WETTELIJKE GRONDSLAG
Op grond van afdeling 13.6 van de Omgevingswet (kostenverhaal bij organische gebiedsontwikkeling) bent u als gemeente verplicht de kosten van de grondexploitatie te verhalen op de initiatiefnemer, tenzij anderszins geregeld. Een anterieure overeenkomst (gesloten vóór de vaststelling van het omgevingsplan) is de geijkte route om dit kostenverhaal privaatrechtelijk te regelen.

VERZOEK
Wij verzoeken u:
1. Een concept anterieure overeenkomst op te stellen met daarin:
   • De te verhalen plankosten (ambtelijke uren, adviseurkosten gemeente)
   • Bijdrage aan bovenwijkse voorzieningen (indien van toepassing)
   • Bijdrage provinciaal landschapsfonds (indien vereist door ${provincie})
   • Fasering en betalingsmoment(en)
2. Een overzicht van de door de gemeente geraamde kosten
3. Een indicatie van de gewenste tijdlijn voor ondertekening

Wij begrijpen dat de gemeente de omgevingsplanprocedure niet start voordat de anterieure overeenkomst is getekend of het kostenverhaal anderszins is verzekerd.

Wij staan open voor overleg over de inhoud en hoogte van het kostenverhaal.

Met vriendelijke groet,

[Naam initiatiefnemer]
[Adres initiatiefnemer]
[Telefoon / e-mail]`,
      });
    }

    // ── Planschaderisico-overeenkomst ──────────────────────────────────────
    if (onderzoek.naam.startsWith("Planschaderisico")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "gemeente",
        onderwerp: `Verzoek planschadeovereenkomst — ${adres}`,
        inhoud: `${datum}

Aan: Gemeente ${gemeente}
Afdeling: Ruimtelijke Ordening / Juridische Zaken

Betreft: Verzoek tot opstellen planschadeovereenkomst — ${adres}

Geacht college van burgemeester en wethouders,

In het kader van de voorgenomen ${doel} verzoeken wij u een planschadeovereenkomst (ook wel: verzoek om planschade-tegemoetkoming risicoovereenkomst) op te stellen.

LOCATIEGEGEVENS
${locRegel}

ACHTERGROND
Bij de vaststelling van een omgevingsplanwijziging kunnen omwonenden die nadeel ondervinden van het plan een verzoek om planschadetegemoetkoming indienen bij de gemeente (art. 15.1 Omgevingswet). Gemeenten plegen de kosten van eventuele planschadevergoedingen contractueel te verhalen op de initiatiefnemer vóórdat de procedure wordt gestart.

VERZOEK
Wij verzoeken u ons het standaard planschadeverhaalformulier / de overeenkomst toe te sturen zodat wij deze kunnen bestuderen en ondertekenen. Wij zijn bereid:
• De planschadeovereenkomst te ondertekenen vóór start van de procedure
• Indien gewenst een planschadebeoordeling door een onafhankelijk adviseur te laten uitvoeren

Indien de gemeente gebruik maakt van een eigen taxateur voor de planschadebeoordeling, verzoeken wij u ons ook de werkwijze en de te hanteren drempelwaarden mee te delen.

Met vriendelijke groet,

[Naam initiatiefnemer]
[Adres initiatiefnemer]
[Telefoon / e-mail]`,
      });
    }

    // ── Bodemonderzoek ─────────────────────────────────────────────────────
    if (onderzoek.naam.startsWith("Bodemonderzoek")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "bureau",
        onderwerp: `Opdracht verkennend bodemonderzoek — ${adres}`,
        inhoud: `${datum}

Geacht bodemonderzoeksbureau,

Hierbij verstrekken wij u de opdracht voor het uitvoeren van een verkennend bodemonderzoek conform NEN 5740 (Strategie voor het uitvoeren van verkennend bodemonderzoek) op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

DOEL VAN HET ONDERZOEK
Het onderzoek wordt uitgevoerd ten behoeve van een ${doel}. De gemeente ${gemeente} vereist een verkennend bodemonderzoek als onderdeel van de ruimtelijke onderbouwing conform de Omgevingswet.

OPDRACHTVERSTREKKING
Wij verzoeken u het onderzoek uit te voeren conform:
• NEN 5740:2009+A1:2016 — Strategie voor het uitvoeren van verkennend bodemonderzoek
• NEN 5725:2017 — Strategie voor het uitvoeren van vooronderzoek bij verkennend en nader bodemonderzoek
• Indien asbestverdacht: NEN 5707 en NEN 5897

Het rapport dient te voldoen aan de eisen van het bevoegd gezag (gemeente ${gemeente}) en te worden opgesteld door een BRL 2000/SIKB-gecertificeerde organisatie.

Graag ontvangen wij vooraf een offerte met indicatieve doorlooptijd.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    if (onderzoek.naam.startsWith("Akoestisch")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "bureau",
        onderwerp: `Opdracht akoestisch onderzoek wegverkeerslawaai — ${adres}`,
        inhoud: `${datum}

Geacht akoestisch adviesbureau,

Hierbij verstrekken wij u de opdracht voor een akoestisch onderzoek naar wegverkeerslawaai op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

DOEL VAN HET ONDERZOEK
Het onderzoek wordt uitgevoerd ten behoeve van een ${doel}. De gemeente vereist aangetoond te worden dat de geluidsbelasting op de gevels van de nieuwe woonfunctie voldoet aan de normen van de Omgevingswet (opvolger Wet geluidhinder).

OPDRACHTVERSTREKKING
Wij verzoeken u het onderzoek uit te voeren conform:
• Omgevingswet / Omgevingsbesluit (geluidnormen voor geluidgevoelige gebouwen)
• Reken- en meetvoorschrift geluid 2012 (nog van toepassing gedurende overgangsrecht)
• Toetsing aan de voorkeursgrenswaarde van 48 dB (Lden) voor wegverkeerslawaai

Het rapport dient te worden opgesteld door een gecertificeerd akoestisch adviseur en dient geschikt te zijn voor indiening als bijlage bij de ruimtelijke onderbouwing.

Gelieve een offerte inclusief benodigde verkeersgegevens en doorlooptijd te verstrekken.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    if (onderzoek.naam.startsWith("Ecologische")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "bureau",
        onderwerp: `Opdracht ecologische quickscan — ${adres}`,
        inhoud: `${datum}

Geacht ecologisch adviesbureau,

Hierbij verstrekken wij u de opdracht voor een ecologische quickscan (voortoets Wet natuurbescherming) op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

DOEL VAN HET ONDERZOEK
Het onderzoek wordt uitgevoerd ten behoeve van een ${doel}. De quickscan dient inzicht te geven in de aanwezigheid van beschermde soorten en habitats conform de Wet natuurbescherming (Wnb).

OPDRACHTVERSTREKKING
Wij verzoeken u de quickscan uit te voeren conform:
• Wet natuurbescherming (soortenbescherming en gebiedsbescherming)
• Vleermuizenprotocol 2021 (indien van toepassing)
• Broedvogelprotocol (onderzoek buiten broedseizoen of aanvullend onderzoek)
• Quickscan conform het Kennisdocument quickscan flora en fauna

Let op: het onderzoek dient bij voorkeur plaats te vinden buiten het broedseizoen (15 maart – 15 juli) of met aanvullend avondonderzoek voor vleermuizen.

Bij aanwezigheid van beschermde soorten verzoeken wij u direct een offerte voor nader onderzoek mee te sturen.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    if (onderzoek.naam.startsWith("Watertoets")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "waterschap",
        onderwerp: `Watertoets aanvraag — ${adres}, gemeente ${gemeente}`,
        inhoud: `${datum}

Aan: ${waterschap}
Afdeling: Vergunningen en omgevingsbeleid

Betreft: Watertoets ten behoeve van bestemmingswijziging / omgevingsplan — ${adres}

Geacht ${waterschap},

In het kader van de Omgevingswet verzoeken wij u een wateradvies uit te brengen voor de voorgenomen ruimtelijke ontwikkeling op onderstaande locatie.

LOCATIEGEGEVENS
${locRegel}

VOORGENOMEN ONTWIKKELING
${doel.charAt(0).toUpperCase() + doel.slice(1)}. De huidige bestemming betreft agrarisch gebruik. De beoogde situatie omvat de realisatie van één of meerdere woningen met bijbehorende verharding.

VERZOEK
Wij verzoeken u te adviseren over:
1. De gevolgen van de ontwikkeling voor de waterhuishouding (afvoer, infiltratie, grondwater)
2. De benodigde compenserende maatregelen voor toename verharding
3. Eventuele waterschapskeur-vergunningplicht
4. Uw standpunt over de watertoets conform de Omgevingswet

Wij zijn bereid aanvullende informatie te verstrekken of een vooroverleg in te plannen.

Met vriendelijke groet,

[Naam initiatiefnemer]
[Adres initiatiefnemer]
[Telefoon / e-mail]`,
      });
    }

    if (onderzoek.naam.startsWith("AERIUS")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "adviseur",
        onderwerp: `Opdracht AERIUS-berekening stikstofdepositie — ${adres}`,
        inhoud: `${datum}

Geacht milieuadviesbureau,

Hierbij verstrekken wij u de opdracht voor een AERIUS-berekening van de stikstofdepositie op Natura 2000-gebieden ten gevolge van de voorgenomen ontwikkeling op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

DOEL VAN DE BEREKENING
Het perceel ligt in de nabijheid van een of meerdere Natura 2000-gebieden. Ten behoeve van een ${doel} dient aangetoond te worden dat de stikstofdepositie als gevolg van de gebruiksfase van de woning(en) de kritische depositiewaarde van de relevante habitattypen niet overschrijdt.

Belangrijk: conform de Raad van State-uitspraak van 18 december 2024 (intern salderen) dient de berekening te worden uitgevoerd zonder intern salderen in de voortoets. Indien de depositie > 0,005 mol/ha/jaar bedraagt, is een volledige passende beoordeling vereist.

OPDRACHTVERSTREKKING
Wij verzoeken u de berekening uit te voeren met:
• AERIUS Calculator 2024 (actuele versie)
• Emissieprofiel: woonfunctie (woning + verkeersbewegingen woon-werkverkeer)
• Toetsing aan kritische depositiewaarden per habitattype per relevant Natura 2000-gebied
• Rapportage geschikt voor indiening bij bevoegd gezag

Graag ontvangen wij een offerte met indicatieve doorlooptijd.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    if (onderzoek.naam.startsWith("Landschappelijk")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "bureau",
        onderwerp: `Opdracht landschappelijk inpassingsplan — ${adres}`,
        inhoud: `${datum}

Geacht landschapsarchitectenbureau,

Hierbij verstrekken wij u de opdracht voor het opstellen van een landschappelijk inpassingsplan voor onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

DOEL
Ten behoeve van een ${doel} vereist de gemeente ${gemeente} een landschappelijk inpassingsplan als onderdeel van de ruimtelijke onderbouwing. Het plan dient aan te tonen dat de nieuwe bebouwing landschappelijk verantwoord wordt ingepast in de omgeving.

GEWENSTE INHOUD
Het inpassingsplan dient minimaal te bevatten:
• Analyse van het bestaande landschap (landschapstype, karakteristieken, zichtlijnen)
• Situering en massa van de beoogde bebouwing
• Beplantingsplan met inheemse soorten passend bij het landschapstype
• Erfinrichting conform de gemeentelijke beleidsregels buitengebied
• Beeldkwaliteitseisen conform het gemeentelijk beleid
• Visualisaties voor en na inpassing

Het plan dient te voldoen aan de eisen van de gemeente ${gemeente} en te worden opgesteld door een BNA-architect of gecertificeerd landschapsarchitect.

Graag ontvangen wij een offerte inclusief voorbeelden van vergelijkbare opdrachten.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    // ── Archeologisch vooronderzoek ───────────────────────────────────────
    if (onderzoek.naam.startsWith("Archeologisch")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "bureau",
        onderwerp: `Opdracht archeologisch vooronderzoek — ${adres}`,
        inhoud: `${datum}

Geacht archeologisch onderzoeksbureau,

Hierbij verstrekken wij u de opdracht voor het uitvoeren van een archeologisch vooronderzoek op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

AANLEIDING
Het perceel ligt in een zone met een middelhoge of hoge archeologische verwachtingswaarde conform de gemeentelijke archeologische beleidskaart van ${gemeente}. Ten behoeve van een ${doel} vereist de gemeente een archeologisch vooronderzoek als onderdeel van de ruimtelijke onderbouwing (Erfgoedwet, art. 5.10).

OPDRACHTVERSTREKKING
Wij verzoeken u het onderzoek uit te voeren conform:
• KNA (Kwaliteitsnorm Nederlandse Archeologie), Leidraad Inventariserend Veldonderzoek (IVO)
• Bureauonderzoek (BO) als eerste fase — beschrijving van de verwachte archeologische resten op basis van bekende bronnen
• Inventariserend Veldonderzoek verkennende fase (IVO-O) indien bureauonderzoek daartoe aanleiding geeft — karterend booronderzoek (grid conform KNA-protocol)
• Bij aanwijzingen voor vindplaatsen: IVO proefsleuven (aparte fase, offerte opvragen)

Het rapport dient:
• Te zijn opgesteld door een opgravingsvergunninghouder (art. 5.1 Erfgoedwet)
• Te worden ingediend bij de bevoegde overheid (gemeente ${gemeente} c.q. RCE) voor archeologische beoordeling
• Geschikt te zijn als bijlage bij de aanvraag omgevingsplanwijziging

Graag ontvangen wij vooraf een offerte met doorlooptijd en een opgave van de BRL SIKB 4000-certificering.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    // ── Externe veiligheidsonderzoek ──────────────────────────────────────
    if (onderzoek.naam.startsWith("Externe veiligheid")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "adviseur",
        onderwerp: `Opdracht externe veiligheidsonderzoek — ${adres}`,
        inhoud: `${datum}

Geacht milieuadviesbureau,

Hierbij verstrekken wij u de opdracht voor een externe veiligheidsonderzoek ten behoeve van de voorgenomen omgevingsplanwijziging op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

AANLEIDING
Op of nabij het perceel zijn mogelijke risicobronnen geïdentificeerd (raadpleeg risicokaart.nl voor de actuele situatie). Ten behoeve van een ${doel} dient te worden aangetoond dat de externe veiligheidsrisico's voor de toekomstige bewoners binnen de wettelijke normen vallen.

MOGELIJK RELEVANTE RISICOBRONNEN
Controleer en bevestig welke van de onderstaande bronnen van toepassing zijn:
• Hogedruk aardgasleidingen (Bevb — Besluit externe veiligheid buisleidingen)
• LPG-tankstations (Bevi — Besluit externe veiligheid inrichtingen)
• Spoorlijnen met vervoer gevaarlijke stoffen (Bevt — Besluit externe veiligheid transportroutes)
• Provinciale wegen met structureel transport gevaarlijke stoffen
• Overige Bevi-inrichtingen in de omgeving

OPDRACHTVERSTREKKING
Wij verzoeken u het onderzoek uit te voeren conform:
• Bevi (Besluit externe veiligheid inrichtingen, Stb. 2004)
• Bevt (Besluit externe veiligheid transportroutes, Stb. 2015)
• Bevb (Besluit externe veiligheid buisleidingen, Stb. 2011)
• Handreiking Verantwoordingsplicht groepsrisico (RIVM, actuele versie)

Het rapport dient te omvatten:
1. Inventarisatie van aanwezige risicobronnen binnen de relevante invloedsgebieden
2. Berekening plaatsgebonden risico (PR 10⁻⁶/jaar contour) en toetsing aan de grenswaarde
3. Berekening en verantwoording groepsrisico (GR) conform art. 7 Bevi / art. 7 Bevt
4. Advies over mogelijke bronmaatregelen of ruimtelijke maatregelen indien normen worden overschreden

Rapportage dient geschikt te zijn voor indiening als bijlage bij de aanvraag omgevingsplanwijziging.

Graag ontvangen wij een offerte met indicatieve doorlooptijd.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }

    // ── Geurhinderonderzoek ────────────────────────────────────────────────
    if (onderzoek.naam.startsWith("Geurhinderonderzoek")) {
      brieven.push({
        onderzoekNaam: onderzoek.naam,
        ontvangerType: "bureau",
        onderwerp: `Opdracht geurhinderonderzoek veehouderij — ${adres}`,
        inhoud: `${datum}

Geacht geur- en milieuadviesbureau,

Hierbij verstrekken wij u de opdracht voor een geurhinderonderzoek ten behoeve van de voorgenomen omgevingsplanwijziging op onderstaand perceel.

LOCATIEGEGEVENS
${locRegel}

AANLEIDING
Het perceel ligt in ${provincie}, een provincie met een hoge concentratie intensieve veehouderij. Ten behoeve van een ${doel} dient aangetoond te worden dat de geurbelasting van nabijgelegen veehouderijen op de toekomstige woonlocatie voldoet aan de normen van de Wet geurhinder en veehouderij (Wgv) c.q. de opvolger onder de Omgevingswet.

OPDRACHTVERSTREKKING
Wij verzoeken u het onderzoek uit te voeren conform:
• Wet geurhinder en veehouderij (Wgv) / Activiteitenbesluit milieubeheer
• Handreiking bij de Wet geurhinder en veehouderij (Infomil, actuele versie)
• V-Stacks Vergunning of vergelijkbaar rekenmodel (voor berekening geurconcentraties)

Het onderzoek dient te omvatten:
1. Inventarisatie van alle veehouderijen binnen de relevante afstandsnormen (conform gemeentelijke geurverordening ${gemeente})
2. Berekening van de cumulatieve geurbelasting op het beoogde woonperceel (ouE/m³ als 98-percentiel)
3. Toetsing aan de toepasselijke norm (concentratiegebied / buitengebied)
4. Advies over maatregelen indien de norm wordt overschreden (afstand, stalaanpassing, locatiekeuze)

Rapportage dient geschikt te zijn voor indiening als bijlage bij de ruimtelijke onderbouwing bij de gemeente ${gemeente}.

Graag ontvangen wij een offerte met indicatieve doorlooptijd en opgave van het te gebruiken rekenmodel.

Met vriendelijke groet,

[Naam opdrachtgever]
[Adres opdrachtgever]
[Telefoon / e-mail]`,
      });
    }
  }

  return brieven;
}
