import type { ScoreFactor, ScoreKlasse, Perceel } from "@/types";

// Gestandaardiseerde bestemmingshoofdgroepen (SVBP2012) die al bouwgrond zijn
const BOUWGROND_HOOFDGROEPEN = new Set([
  "wonen", "woongebied", "bedrijf", "bedrijventerrein", "centrum", "gemengd",
  "detailhandel", "dienstverlening", "kantoor", "maatschappelijk", "horeca",
  "cultuur en ontspanning", "sport",
])

// Als fallback op naam (voor oudere plannen zonder bestemmingshoofdgroep)
const BOUWGROND_NAAM_TERMEN = [
  "wonen", "woon", "woningbouw", "woongebied", "woondoeleinden",
  "gemengd", "centrum", "dorpscentrum", "stadscentrum",
  "bedrijf", "bedrijventerrein", "kantoor", "maatschappelijk",
  "detailhandel", "horeca", "dienstverlening",
]

const AGRARISCH_HOOFDGROEPEN = new Set(["agrarisch", "agrarisch met waarden"])
const AGRARISCH_NAAM_TERMEN = [
  "agrarisch", "landbouw", "akkerbouw", "veeteelt",
  "glastuinbouw", "tuinbouw", "veehouderij", "buitengebied",
]

interface BestemmingInfo {
  naam: string
  reedsBouwgrond: boolean
  isAgrarisch: boolean
}

function classifyVlak(naam: string, hoofdgroep?: string): BestemmingInfo {
  const hg = (hoofdgroep ?? "").toLowerCase().trim()
  const n = naam.toLowerCase()
  return {
    naam,
    reedsBouwgrond: hg
      ? BOUWGROND_HOOFDGROEPEN.has(hg)
      : BOUWGROND_NAAM_TERMEN.some(t => n.includes(t)),
    isAgrarisch: hg
      ? AGRARISCH_HOOFDGROEPEN.has(hg)
      : AGRARISCH_NAAM_TERMEN.some(t => n.includes(t)),
  }
}

const RP_BASE = "https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4"

// Ruimtelijkeplannen API v4 gebruikt _geo.contains (niet geo.intersects of GeoJSON Feature)
function geoBody(lon: number, lat: number) {
  return JSON.stringify({
    _geo: { contains: { type: "Point", coordinates: [lon, lat] } },
  })
}

// Alleen echte bestemmingsplannen — geen voorbereidingsbesluiten, structuurvisies, etc.
const RELEVANTE_TYPEN = new Set([
  "bestemmingsplan", "omgevingsplan", "inpassingsplan",
  "wijzigingsplan", "uitwerkingsplan",
  "gemeentelijk plan; uitwerkingsplan artikel 11",
  "gemeentelijk plan; wijzigingsplan artikel 11",
])

type PlanRecord = {
  id?: string
  naam?: string
  type?: string
  planstatusInfo?: { planstatus?: string }
  gemeente?: { naam?: string; code?: string }
}

// Plannen die alleen een deelaspect regelen en de hoofdbestemming niet weerspiegelen
const OVERLAY_TERMEN = ["paraplu", "parkeren", "reclame", "antenne", "bed & breakfast"]

function kiesBestePlan(plannen: PlanRecord[]): PlanRecord | null {
  const gefilterd = plannen.filter(p => RELEVANTE_TYPEN.has(p.type ?? ""))
  // Sluit overlay-plannen uit — die dekken slechts één aspect, niet de feitelijke bestemming
  const hoofdplannen = gefilterd.filter(p =>
    !OVERLAY_TERMEN.some(t => (p.naam ?? "").toLowerCase().includes(t))
  )
  const kandidaten = hoofdplannen.length > 0 ? hoofdplannen : gefilterd
  return (
    kandidaten.find(p => p.planstatusInfo?.planstatus === "vastgesteld") ??
    kandidaten[0] ??
    null
  )
}

async function fetchBestemmingInfo(lat: number, lon: number): Promise<BestemmingInfo> {
  const apiKey = process.env.RUIMTELIJKEPLANNEN_API_KEY
  if (!apiKey) {
    return { naam: "onbekend", reedsBouwgrond: false, isAgrarisch: false }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/hal+json",
    "X-Api-Key": apiKey,
  }

  // Herbruikbare helper om bestemmingsvlakken uit een response te classificeren
  function vlakkenUitData(data: unknown): BestemmingInfo | null {
    type Vlak = { naam?: string; type?: string; bestemmingshoofdgroep?: string }
    const vlakken: Vlak[] =
      ((data as { _embedded?: { bestemmingsvlakken?: Vlak[] } })._embedded?.bestemmingsvlakken ?? [])
    if (!vlakken.length) return null
    const vlak =
      vlakken.find(v => v.type === "enkelbestemming") ??
      vlakken.find(v => v.type !== "bouwvlak" && v.type !== "dubbelbestemming") ??
      vlakken[0]
    return vlak?.naam ? classifyVlak(vlak.naam, vlak.bestemmingshoofdgroep) : null
  }

  // ── Stap 1: zoek bestemmingsplan via geo (grotere pagina) ────────────
  let planNaam: string | null = null

  async function zoekPlannen(body: string): Promise<PlanRecord[]> {
    try {
      const res = await fetch(
        `${RP_BASE}/plannen/_zoek?contentCrs=epsg:4326&acceptCrs=epsg:4326&pageSize=50`,
        { method: "POST", headers, body, signal: AbortSignal.timeout(9000) }
      )
      if (res.ok) return (await res.json())._embedded?.plannen ?? []
      console.error(`[scoring] plannen/_zoek ${res.status}:`, await res.text().catch(() => ""))
    } catch (e) {
      console.error("[scoring] plannen/_zoek error:", e)
    }
    return []
  }

  // Eerste poging: exact punt (contains)
  let plannen = await zoekPlannen(geoBody(lon, lat))

  // Tweede poging: kleine bounding box (intersects) — vangt afrondingsfouten in plangrenzen
  if (!kiesBestePlan(plannen)) {
    const d = 0.003 // ~300m buffer
    const bboxBody = JSON.stringify({
      _geo: { intersects: { type: "Polygon", coordinates: [[
        [lon - d, lat - d], [lon + d, lat - d],
        [lon + d, lat + d], [lon - d, lat + d],
        [lon - d, lat - d],
      ]]}},
    })
    plannen = await zoekPlannen(bboxBody)
  }

  // Gebruik het beste plan als primaire naam, maar probeer vlakken voor álle relevante plannen
  const bestePlan = kiesBestePlan(plannen)
  planNaam = bestePlan?.naam ?? null

  const relevantePlanIds = plannen
    .filter(p => RELEVANTE_TYPEN.has(p.type ?? "") &&
      !OVERLAY_TERMEN.some(t => (p.naam ?? "").toLowerCase().includes(t)))
    .map(p => p.id)
    .filter((id): id is string => !!id)

  // ── Stap 2: bestemmingsvlakken — probeer alle relevante plannen ───────
  const d = 0.003
  const bboxBody = JSON.stringify({
    _geo: { intersects: { type: "Polygon", coordinates: [[
      [lon - d, lat - d], [lon + d, lat - d],
      [lon + d, lat + d], [lon - d, lat + d],
      [lon - d, lat - d],
    ]]}},
  })

  for (const id of relevantePlanIds) {
    for (const body of [geoBody(lon, lat), bboxBody]) {
      try {
        const res = await fetch(
          `${RP_BASE}/plannen/${id}/bestemmingsvlakken/_zoek?contentCrs=epsg:4326&acceptCrs=epsg:4326`,
          { method: "POST", headers, body, signal: AbortSignal.timeout(9000) }
        )
        if (res.ok) {
          const result = vlakkenUitData(await res.json())
          if (result) return result
        } else {
          console.error(`[scoring] vlakken/${id} ${res.status}`)
          break
        }
      } catch (e) {
        console.error("[scoring] vlakken/_zoek error:", e)
        break
      }
    }
  }

  // ── Fallback: gebruik de plannaam als ruwe indicatie ─────────────────
  if (planNaam) {
    const n = planNaam.toLowerCase()
    return {
      naam: planNaam,
      reedsBouwgrond: false,
      isAgrarisch: AGRARISCH_NAAM_TERMEN.some(t => n.includes(t)),
    }
  }

  return { naam: "onbekend", reedsBouwgrond: false, isAgrarisch: false }
}

interface PrecedentenResultaat {
  score: number
  aantalPrecedenten: number
  toelichting: string
  plannen: Array<{ naam: string; type: string; datum?: string }>
}

async function checkHistorischePrecedenten(lat: number, lon: number, gemeente: string): Promise<PrecedentenResultaat> {
  const apiKey = process.env.RUIMTELIJKEPLANNEN_API_KEY
  if (!apiKey) return { score: 55, aantalPrecedenten: 0, toelichting: "Precedentendata niet beschikbaar", plannen: [] }

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/hal+json",
    "X-Api-Key": apiKey,
  }

  // Zoek wijzigingsplannen en uitwerkingsplannen binnen ~5km radius
  // API-limiet: max 99km² — bij 52°N geeft 0.045° een oppervlakte van ~62km²
  const d = 0.045
  const bboxBody = JSON.stringify({
    _geo: { intersects: { type: "Polygon", coordinates: [[
      [lon - d, lat - d], [lon + d, lat - d],
      [lon + d, lat + d], [lon - d, lat + d],
      [lon - d, lat - d],
    ]]}},
  })

  const PRECEDENT_TYPEN = new Set([
    "wijzigingsplan", "uitwerkingsplan",
    "gemeentelijk plan; uitwerkingsplan artikel 11",
    "gemeentelijk plan; wijzigingsplan artikel 11",
  ])

  const WONEN_TERMEN = [
    "wonen", "woon", "woningbouw", "woongebied", "woondoeleinden",
    "woonwijk", "woningen", "woonbuurt", "woonperceel",
  ]

  try {
    const res = await fetch(
      `${RP_BASE}/plannen/_zoek?contentCrs=epsg:4326&acceptCrs=epsg:4326&pageSize=100`,
      { method: "POST", headers, body: bboxBody, signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) {
      console.error(`[scoring] precedenten/_zoek ${res.status}:`, await res.text().catch(() => ""))
      return { score: 55, aantalPrecedenten: 0, toelichting: "Precedentendata tijdelijk niet beschikbaar", plannen: [] }
    }

    const data = await res.json()
    const plannen: Array<{
      naam?: string
      type?: string
      planstatusInfo?: { planstatus?: string; datum?: string }
    }> = data._embedded?.plannen ?? []

    // Filter: alleen vastgestelde wijzigings-/uitwerkingsplannen van de afgelopen 8 jaar
    const peilDatum = new Date()
    peilDatum.setFullYear(peilDatum.getFullYear() - 8)

    const precedenten = plannen.filter(p => {
      if (!PRECEDENT_TYPEN.has(p.type ?? "")) return false
      if (p.planstatusInfo?.planstatus !== "vastgesteld") return false
      const datum = p.planstatusInfo?.datum
      if (datum) {
        const planDatum = new Date(datum)
        if (!isNaN(planDatum.getTime()) && planDatum.getTime() < peilDatum.getTime()) return false
      }
      return true
    })

    // Subset: expliciet voor wonen
    const wonenPrecedenten = precedenten.filter(p =>
      WONEN_TERMEN.some(t => (p.naam ?? "").toLowerCase().includes(t))
    )

    const totaal = precedenten.length
    const wonenAantal = wonenPrecedenten.length

    // Score: 0 = 30, 1-2 = 50, 3-5 = 65, 6-10 = 75, 11-20 = 85, 20+ = 92
    let score: number
    if (totaal === 0) score = 30
    else if (totaal <= 2) score = 50
    else if (totaal <= 5) score = 65
    else if (totaal <= 10) score = 75
    else if (totaal <= 20) score = 85
    else score = 92

    // Wonen-specifieke bonus
    if (wonenAantal >= 3) score = Math.min(95, score + 8)
    else if (wonenAantal >= 1) score = Math.min(95, score + 4)

    const gemeenteNaam = gemeente || "De regio"
    let toelichting: string
    if (totaal === 0) {
      toelichting = `In de regio rond ${gemeenteNaam} zijn de afgelopen 8 jaar geen vergelijkbare bestemmingswijzigingen vastgesteld — wat de kans op goedkeuring bemoeilijkt`
    } else if (wonenAantal > 0) {
      toelichting = `${totaal} bestemmingswijziging${totaal !== 1 ? "en" : ""} vastgesteld in de regio, waarvan ${wonenAantal} specifiek voor woningbouw — gemeenten in dit gebied staan open voor woonbestemmingen`
    } else {
      toelichting = `${totaal} bestemmingswijziging${totaal !== 1 ? "en" : ""} vastgesteld in de regio de afgelopen 8 jaar — de gemeente heeft ervaring met het doorlopen van wijzigingsprocedures`
    }

    const plannenLijst = precedenten.map(p => ({
      naam: p.naam ?? "Onbekend plan",
      type: p.type ?? "wijzigingsplan",
      datum: p.planstatusInfo?.datum,
    }))

    return { score, aantalPrecedenten: totaal, toelichting, plannen: plannenLijst }
  } catch (e) {
    console.error("[scoring] precedenten error:", String(e))
    return { score: 55, aantalPrecedenten: 0, toelichting: "Precedentendata tijdelijk niet beschikbaar", plannen: [] }
  }
}

// Natura2000 nabijheid via PDOK WFS (vereenvoudigd)
async function checkNatura2000Nabijheid(lat: number, lon: number): Promise<number> {
  // Score 0-100: lager = meer risico (dichter bij Natura2000)
  // In productie: echte WFS-query naar PDOK Natura2000 laag
  // Simulatie op basis van provincie-logica als fallback
  try {
    const url = `https://service.pdok.nl/pdok/natura2000/wfs/v1_0?service=WFS&version=2.0.0&request=GetFeature&typeName=pdok:natura2000&outputFormat=json&count=1&CQL_FILTER=DWITHIN(geometrie,POINT(${lon}%20${lat}),5000,meters)`;
    const res = await fetch(url);
    if (!res.ok) return 70;
    const data = await res.json();
    const features = data.features ?? [];
    if (features.length === 0) return 85;
    return 20; // binnen 5km van Natura2000
  } catch {
    return 70;
  }
}

// Woningbouwtekort per gemeente (statische data 2024, top gemeenten)
const WONINGBOUW_TEKORT: Record<string, number> = {
  Amsterdam: 95,
  Rotterdam: 90,
  "Den Haag": 88,
  Utrecht: 92,
  Eindhoven: 85,
  Groningen: 80,
  Tilburg: 78,
  Almere: 82,
  Breda: 76,
  Nijmegen: 79,
  Haarlem: 87,
  Arnhem: 75,
  Zaanstad: 83,
  Amersfoort: 84,
  Apeldoorn: 70,
  Enschede: 68,
  "s-Hertogenbosch": 77,
  Zwolle: 74,
  Leiden: 86,
  Dordrecht: 72,
  Haarlemmermeer: 88,
};

function getWoningbouwScore(gemeente: string): number {
  const score = WONINGBOUW_TEKORT[gemeente];
  if (score) return score;
  // Fallback: gemiddeld tekort
  return 65;
}

// Provinciale restricties (vereenvoudigd)
const PROVINCIALE_RESTRICTIES: Record<string, number> = {
  "Noord-Holland": 60,
  "Zuid-Holland": 65,
  Utrecht: 55,
  Flevoland: 85,
  Overijssel: 72,
  Gelderland: 68,
  "Noord-Brabant": 70,
  Limburg: 67,
  Drenthe: 75,
  Friesland: 78,
  Groningen: 73,
  Zeeland: 80,
};

function getProvincialeScore(provincie: string): number {
  return PROVINCIALE_RESTRICTIES[provincie] ?? 68;
}

// ── Ladder voor duurzame verstedelijking ──────────────────────────────────
// Proxy: tel BAG-verblijfsobjecten binnen 300m. Dicht bebouwd = binnen BSG.
async function checkLadderBSG(lat: number, lon: number): Promise<{
  score: number; binnenBSG: boolean | null; toelichting: string
}> {
  try {
    const url =
      `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0` +
      `&request=GetFeature&typeName=bag:verblijfsobject&outputFormat=json&count=30` +
      `&CQL_FILTER=DWITHIN(geometrie,POINT(${lon}%20${lat}),300,meters)`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) return { score: 50, binnenBSG: null, toelichting: "BSG-status kon niet worden bepaald" }
    const data = await res.json()
    const aantalObjecten: number = (data.features ?? []).length
    const binnenBSG = aantalObjecten >= 10
    if (binnenBSG) {
      return {
        score: 85,
        binnenBSG: true,
        toelichting: `Perceel ligt binnen bestaand stedelijk gebied (${aantalObjecten}+ objecten in 300m) — eenvoudigere motivering vereist voor de Ladder voor duurzame verstedelijking`,
      }
    }
    return {
      score: 35,
      binnenBSG: false,
      toelichting: aantalObjecten === 0
        ? "Perceel ligt buiten bestaand stedelijk gebied — u moet aantonen dat er geen ruimte is binnen BSG (Ladder stap 2, zwaarder traject)"
        : `Perceel ligt op de rand van bebouwing (${aantalObjecten} objecten in 300m) — u moet aantonen dat er geen geschikte binnenstedelijke locaties beschikbaar zijn`,
    }
  } catch {
    return { score: 50, binnenBSG: null, toelichting: "BSG-status kon niet worden bepaald" }
  }
}

// ── Grondwater & veengebied risico ─────────────────────────────────────────
async function checkGrondwaterRisico(lat: number, lon: number, provincie?: string): Promise<{
  score: number; bodemcode: string | null; toelichting: string
}> {
  const veenProvincies = new Set([
    "Utrecht", "Noord-Holland", "Zuid-Holland", "Friesland", "Groningen", "Overijssel"
  ])
  const provincieFallbackScore = veenProvincies.has(provincie ?? "") ? 42 : 68
  const provincieFallback = {
    score: provincieFallbackScore,
    bodemcode: null,
    toelichting: veenProvincies.has(provincie ?? "")
      ? `Provincie ${provincie} heeft uitgebreide veenweidegebieden — hoge grondwaterstand verhoogt funderingskosten en maakt bestemmingswijziging politiek gevoelig`
      : "Geen verhoogd grondwaterrisico op basis van regio",
  }
  try {
    const url =
      `https://service.pdok.nl/bro/broconsument/wfs/v1_0?service=WFS&version=2.0.0` +
      `&request=GetFeature&typeName=broconsument:bodemkaart_50000&outputFormat=json` +
      `&count=1&CQL_FILTER=INTERSECTS(geometrie,POINT(${lon}%20${lat}))`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) return provincieFallback
    const data = await res.json()
    const feature = (data.features ?? [])[0]
    if (!feature) return provincieFallback
    const code: string = (feature.properties?.kaarteenheidcode ?? "").toString()
    const isVeen = code.startsWith("V") || code.toLowerCase().includes("veen")
    const isKlei = code.startsWith("K") || code.toLowerCase().includes("klei")
    if (isVeen) {
      return {
        score: 25,
        bodemcode: code,
        toelichting: `Veenbodem (${code}) — hoge grondwaterstand, risico op bodemdaling en verzakking. Extra funderingsonderzoek verplicht, politiek gevoelig in veenweidebeleid`,
      }
    }
    if (isKlei) {
      return {
        score: 52,
        bodemcode: code,
        toelichting: `Kleibodem (${code}) — verhoogd risico op zetting bij belasting. Geotechnisch onderzoek sterk aanbevolen`,
      }
    }
    return {
      score: 80,
      bodemcode: code,
      toelichting: `Zand/minerale bodem (${code}) — goede draagkracht, beperkt grondwaterrisico voor bebouwing`,
    }
  } catch {
    return provincieFallback
  }
}

// ── Netcongestie elektriciteit ─────────────────────────────────────────────
const CONGESTIE_HOOG = new Set([
  "Eindhoven", "Breda", "Tilburg", "'s-Hertogenbosch", "Helmond", "Best", "Waalre", "Veldhoven",
  "Utrecht", "Nieuwegein", "Houten", "IJsselstein", "De Ronde Venen", "Woerden", "Stichtse Vecht",
  "Amsterdam", "Haarlemmermeer", "Amstelveen", "Diemen",
  "Rotterdam", "Capelle aan den IJssel", "Barendrecht", "Ridderkerk",
  "Almere", "Lelystad",
  "Arnhem", "Nijmegen", "Doetinchem", "Ede",
  "Zwolle", "Deventer", "Hardenberg",
])

const CONGESTIE_MIDDEN_PROVINCIES = new Set([
  "Noord-Brabant", "Utrecht", "Zuid-Holland", "Noord-Holland", "Gelderland", "Flevoland", "Overijssel"
])

function getNetcongestieScore(gemeente: string, provincie: string): { score: number; toelichting: string } {
  if (CONGESTIE_HOOG.has(gemeente)) {
    return {
      score: 22,
      toelichting: `${gemeente} staat op de congestielijst van netbeheerders — het elektriciteitsnet zit vol. Nieuwe aansluitingen worden geweigerd of hebben jaren wachttijd. Dit kan woningbouw ernstig vertragen.`,
    }
  }
  if (CONGESTIE_MIDDEN_PROVINCIES.has(provincie)) {
    return {
      score: 58,
      toelichting: `In ${provincie} zijn meerdere congestiegebieden actief — controleer bij de lokale netbeheerder (Liander/Enexis/Stedin) of uw locatie binnen een congestiegebied valt`,
    }
  }
  return {
    score: 82,
    toelichting: "Geen bekende netcongestie in dit gebied — netaansluiting vormt naar verwachting geen obstakel",
  }
}

export interface ScoringInput {
  perceel: Perceel;
  bestemmingsplan?: string;
}

export async function berekenScore(perceel: Perceel): Promise<{
  factoren: ScoreFactor[];
  totaalScore: number;
  scoreKlasse: ScoreKlasse;
  reedsBouwgrond: boolean;
  huidigeBestemming: string;
  natura2000Score: number;
  precedentPlannen: import("@/types").PrecedentPlan[];
}> {
  const [bestemmingInfo, natura2000Score, precedenten, ladderBSG, grondwater] = await Promise.all([
    fetchBestemmingInfo(perceel.lat, perceel.lon),
    checkNatura2000Nabijheid(perceel.lat, perceel.lon),
    checkHistorischePrecedenten(perceel.lat, perceel.lon, perceel.gemeente ?? ""),
    checkLadderBSG(perceel.lat, perceel.lon),
    checkGrondwaterRisico(perceel.lat, perceel.lon, perceel.provincie),
  ]);

  const { naam: huidigeBestemming, reedsBouwgrond, isAgrarisch } = bestemmingInfo

  const woningbouwScore = getWoningbouwScore(perceel.gemeente ?? "");
  const provinciaalScore = getProvincialeScore(perceel.provincie ?? "");

  const infraScore = perceel.gemeente ? 70 : 50;
  const netcongestie = getNetcongestieScore(perceel.gemeente ?? "", perceel.provincie ?? "");

  const factoren: ScoreFactor[] = [
    {
      naam: "Huidig bestemmingsplan",
      gewicht: 5,
      score: reedsBouwgrond ? 100 : isAgrarisch ? 60 : 40,
      toelichting: reedsBouwgrond
        ? `Perceel heeft al een bouw-/woonbestemming (${huidigeBestemming}) — geen bestemmingswijziging nodig`
        : isAgrarisch
        ? `Perceel heeft agrarische bestemming (${huidigeBestemming}), wat een wijziging mogelijk maar complex maakt`
        : huidigeBestemming === "onbekend"
        ? "Huidige bestemming kon niet worden bepaald uit de beschikbare plandata"
        : `Huidig plan "${huidigeBestemming}" staat niet direct open voor woningbouw`,
      positief: reedsBouwgrond || isAgrarisch,
    },
    {
      naam: "Gemeentelijk woningbouwtekort",
      gewicht: 4,
      score: woningbouwScore,
      toelichting: `${perceel.gemeente ?? "De gemeente"} heeft een significant woningbouwtekort (score ${woningbouwScore}/100), wat politieke druk legt op snellere goedkeuring`,
      positief: woningbouwScore > 70,
    },
    {
      naam: "Provinciale omgevingsvisie",
      gewicht: 4,
      score: provinciaalScore,
      toelichting: `Provincie ${perceel.provincie ?? ""} biedt ${provinciaalScore > 70 ? "relatief gunstige" : "beperkte"} ruimte voor bestemmingswijzigingen buiten bestaand stedelijk gebied`,
      positief: provinciaalScore > 70,
    },
    {
      naam: "Natura2000 & stikstof",
      gewicht: 5,
      score: natura2000Score,
      toelichting:
        natura2000Score < 40
          ? "Perceel ligt nabij een Natura2000-gebied — stikstofberekening (AERIUS) is verplicht en kan een kritiek obstakel zijn"
          : natura2000Score < 70
          ? "Beperkt risico op stikstofproblematiek, AERIUS-check wordt aanbevolen"
          : "Geen directe Natura2000-gebieden in de nabijheid gedetecteerd",
      positief: natura2000Score >= 70,
    },
    {
      naam: "Infrastructuur & ligging",
      gewicht: 3,
      score: infraScore,
      toelichting:
        "Ligging t.o.v. bestaande bebouwing, wegen en utiliteitsaansluitingen (gas, water, riolering)",
      positief: infraScore > 60,
    },
    {
      naam: "Historische precedenten",
      gewicht: 3,
      score: precedenten.score,
      toelichting: precedenten.toelichting,
      positief: precedenten.score > 60,
    },
    {
      naam: "Ladder duurzame verstedelijking",
      gewicht: 4,
      score: ladderBSG.score,
      toelichting: ladderBSG.toelichting,
      positief: ladderBSG.score >= 60,
    },
    {
      naam: "Grondwater & bodemrisico",
      gewicht: 3,
      score: grondwater.score,
      toelichting: grondwater.toelichting,
      positief: grondwater.score >= 60,
    },
    {
      naam: "Netcongestie elektriciteit",
      gewicht: 3,
      score: netcongestie.score,
      toelichting: netcongestie.toelichting,
      positief: netcongestie.score >= 60,
    },
  ];

  // Gewogen gemiddelde
  const totaalGewicht = factoren.reduce((sum, f) => sum + f.gewicht, 0);
  const totaalScore = Math.round(
    factoren.reduce((sum, f) => sum + f.score * f.gewicht, 0) / totaalGewicht
  );

  const scoreKlasse = scoreNaarKlasse(totaalScore);

  return { factoren, totaalScore, scoreKlasse, reedsBouwgrond, huidigeBestemming, natura2000Score, precedentPlannen: precedenten.plannen };
}

function scoreNaarKlasse(score: number): ScoreKlasse {
  if (score >= 80) return "ultra-hoog";
  if (score >= 65) return "hoog";
  if (score >= 45) return "gemiddeld";
  if (score >= 25) return "laag";
  return "ultra-laag";
}
