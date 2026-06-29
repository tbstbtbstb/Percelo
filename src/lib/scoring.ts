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
  planDatum?: string
  planViewUrl?: string
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
  identificatie?: string
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
  const planDatum: string | undefined = (bestePlan as { planstatusInfo?: { datum?: string } })?.planstatusInfo?.datum ?? undefined
  const planViewUrl: string | undefined = bestePlan?.identificatie
    ? `https://omgevingswet.overheid.nl/regels-op-de-kaart/document?documentID=${bestePlan.identificatie}`
    : undefined

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
          if (result) return { ...result, planDatum, planViewUrl }
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
      planDatum,
      planViewUrl,
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
      identificatie?: string
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
      identificatie: p.identificatie,
    }))

    return { score, aantalPrecedenten: totaal, toelichting, plannen: plannenLijst }
  } catch (e) {
    console.error("[scoring] precedenten error:", String(e))
    return { score: 55, aantalPrecedenten: 0, toelichting: "Precedentendata tijdelijk niet beschikbaar", plannen: [] }
  }
}

// Natura2000 nabijheid via PDOK WFS — drie parallelle afstandsdrempels voor gradatie.
// Fallback 50 (neutraal/onbekend) in plaats van 70 om stille valse geruststelling te voorkomen.
async function checkNatura2000Nabijheid(lat: number, lon: number): Promise<{
  score: number; toelichting: string
}> {
  const fallback = {
    score: 50,
    toelichting: "Natura2000-nabijheid kon niet worden bepaald — raadpleeg voorzichtheidshalve een omgevingsadviseur over stikstofrisico",
  }

  async function isNabij(afstandM: number): Promise<boolean> {
    const url =
      `https://service.pdok.nl/rvo/natura2000/wfs/v1_0?service=WFS&version=2.0.0` +
      `&request=GetFeature&typeName=natura2000:natura2000&outputFormat=json&count=1` +
      `&CQL_FILTER=DWITHIN(geometrie,POINT(${lon}%20${lat}),${afstandM},meters)`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return (data.features ?? []).length > 0
  }

  try {
    const [binnen500, binnen2000, binnen10000] = await Promise.all([
      isNabij(500).catch(() => null),
      isNabij(2000).catch(() => null),
      isNabij(10000).catch(() => null),
    ])

    if (binnen500 === null && binnen2000 === null && binnen10000 === null) {
      console.error("[scoring] Natura2000: alle drie WFS-queries mislukt")
      return fallback
    }

    if (binnen500) return {
      score: 35,
      toelichting: "Perceel ligt naast een Natura 2000-gebied — een beschermd natuurgebied. U bent verplicht te laten berekenen hoeveel stikstof uw bouwproject uitstoot. Woningbouw is mogelijk als die uitstoot laag genoeg blijft, maar het kost extra onderzoek (€500–€1.500) en vertraagt de procedure.",
    }
    if (binnen2000) return {
      score: 52,
      toelichting: "Perceel ligt binnen 2km van een Natura 2000-gebied. Een stikstofberekening is verstandig voordat u verder gaat. Bij kleine woningbouwprojecten blijft de uitstoot doorgaans ruim onder de grenswaarde.",
    }
    if (binnen10000) return {
      score: 72,
      toelichting: "Een Natura 2000-gebied ligt op enige afstand. Bij normale woningbouw is stikstof hier zelden een probleem — alleen bij grootschalige projecten is een extra check nodig.",
    }
    return {
      score: 88,
      toelichting: "Geen Natura 2000-gebieden in de omgeving aangetroffen — stikstof speelt hier naar verwachting geen rol.",
    }
  } catch (e) {
    console.error("[scoring] Natura2000 check error:", e)
    return fallback
  }
}

// ── NNN / Natuur Netwerk Nederland ────────────────────────────────────────
// Percelen ín het NNN zijn in vrijwel alle provincies niet omzetbaar naar wonen.
// PDOK heeft geen WFS voor NNN; gebruikt WMS GetFeatureInfo als querymethode.
// INFO_FORMAT=text/plain is universeel ondersteund; JSON kan ontbreken bij oudere GeoServer-versies.
async function checkNNNGNN(lat: number, lon: number): Promise<{
  score: number; binnenNNN: boolean; toelichting: string
}> {
  const fallback = { score: 65, binnenNNN: false, toelichting: "NNN-status kon niet worden bepaald" }
  try {
    // Kleine bbox rondom het punt (~100m), WMS GetFeatureInfo op centerpixel
    const d = 0.001
    const bbox = `${lat - d},${lon - d},${lat + d},${lon + d}`
    const url =
      `https://service.pdok.nl/provincies/natuurnetwerk-nederland/wms/v1_0` +
      `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
      `&BBOX=${bbox}&CRS=EPSG%3A4326&WIDTH=100&HEIGHT=100` +
      `&LAYERS=PS.ProtectedSite&QUERY_LAYERS=PS.ProtectedSite` +
      `&INFO_FORMAT=text%2Fplain&I=50&J=50`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      console.error(`[scoring] NNN WMS ${res.status}:`, await res.text().catch(() => ""))
      return fallback
    }
    const text = await res.text()
    // GeoServer plain-text: attributes present → feature found; "no features" → buiten NNN
    const binnenNNN = text.length > 80 && !text.toLowerCase().includes("no features")
    if (binnenNNN) {
      return {
        score: 5,
        binnenNNN: true,
        toelichting:
          "Perceel ligt in het Nationaal Natuur Netwerk (NNN) — een wettelijk beschermd natuurgebied. Omzetting naar woningbouw is in vrijwel alle provincies verboden. Dit is een harde blokkade.",
      }
    }
    return {
      score: 90,
      binnenNNN: false,
      toelichting: "Perceel ligt buiten het Nationaal Natuur Netwerk — geen bezwaar vanuit natuurbescherming.",
    }
  } catch (e) {
    console.error("[scoring] NNN check error:", e)
    return fallback
  }
}

// ── Watertoets: nabijheid open water (meren/plassen) ──────────────────────
// Agrarische percelen liggen vrijwel altijd naast sloten — die worden bewust
// buiten beschouwing gelaten. Alleen watervlakten (meren, plassen, vijvers)
// binnen ~100m zijn een relevante trigger voor een zware watertoets.
async function checkWatertoets(lat: number, lon: number): Promise<{
  score: number; nabijWater: boolean; toelichting: string
}> {
  const fallback = { score: 65, nabijWater: false, toelichting: "Watertoets-status kon niet worden bepaald" }
  try {
    // ~100m bbox rondom punt
    const dLon = 0.0013
    const dLat = 0.0009
    const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`
    const url =
      `https://api.pdok.nl/lv/bgt/ogc/v1/collections/waterdeel/items` +
      `?limit=50&bbox=${bbox}&f=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      console.error(`[scoring] BGT waterdeel ${res.status}:`, await res.text().catch(() => ""))
      return fallback
    }
    const data = await res.json()

    type WaterFeature = { properties: { type?: string; plus_type?: string } }
    const features: WaterFeature[] = data.features ?? []

    // Sloten en greppels komen voor bij nagenoeg elk agrarisch perceel in NL —
    // alleen watervlakten (meren/plassen) en benoemde kanalen zijn relevante triggers.
    const significant = features.some((f) => {
      const t = f.properties.type
      const pt = f.properties.plus_type
      if (t === "watervlakte" || t === "zee") return true
      if (t === "waterloop" && pt && pt !== "sloot" && pt !== "greppel_droge_sloot") return true
      return false
    })

    if (significant) {
      return {
        score: 30,
        nabijWater: true,
        toelichting:
          "Perceel grenst aan open water (meer, plas of kanaal). U bent verplicht het waterschap te raadplegen. Het waterschap kan bouwen beperken of extra eisen stellen aan waterafvoer en drainage.",
      }
    }
    return {
      score: 82,
      nabijWater: false,
      toelichting: "Geen meren of kanalen direct naast het perceel — het waterschap zal naar verwachting geen zware eisen stellen.",
    }
  } catch (e) {
    console.error("[scoring] watertoets check error:", e)
    return fallback
  }
}

// ── Planleeftijd ──────────────────────────────────────────────────────────
// Oudere plannen zijn politiek makkelijker te herzien dan recent vastgestelde plannen.
function berekenPlanleeftijdScore(planDatum: string | undefined): { score: number; toelichting: string } {
  if (!planDatum) {
    return { score: 55, toelichting: "Vaststellingsdatum bestemmingsplan onbekend" }
  }
  const datum = new Date(planDatum)
  if (isNaN(datum.getTime())) {
    return { score: 55, toelichting: "Vaststellingsdatum bestemmingsplan onbekend" }
  }
  const jaren = (Date.now() - datum.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const jaar = datum.getFullYear()
  if (jaren < 3) {
    return {
      score: 20,
      toelichting: `Het bestemmingsplan is in ${jaar} vastgesteld — nog geen 3 jaar geleden. Gemeenten passen plannen zelden zo snel aan na een vaststelling, wat uw kansen nu verkleint.`,
    }
  }
  if (jaren < 7) {
    return {
      score: 50,
      toelichting: `Het bestemmingsplan stamt uit ${jaar} (${Math.round(jaren)} jaar oud). Wijzigen is mogelijk, maar u moet de gemeente overtuigen dat er een goede reden is om het plan al aan te passen.`,
    }
  }
  if (jaren < 15) {
    return {
      score: 72,
      toelichting: `Het bestemmingsplan stamt uit ${jaar} (${Math.round(jaren)} jaar oud). Na zoveel jaar staat de gemeente doorgaans open voor een herziening — uw initiatief past in dat traject.`,
    }
  }
  return {
    score: 88,
    toelichting: `Het bestemmingsplan uit ${jaar} is verouderd (${Math.round(jaren)} jaar oud). De gemeente is waarschijnlijk zelf al op zoek naar een actualisering — uw initiatief kan goed aansluiten.`,
  }
}

// ── Woningmarktdruk via CBS OData (live WOZ-data) ─────────────────────────
// WOZ-waarde per gemeente is de sterkste openbare proxy voor woningschaarste:
// hoge WOZ = hoge vraag t.o.v. aanbod = meer politieke druk voor woningbouw.
// Dataset 83625NED: "Gemiddelde WOZ-waarde van woningen" per gemeente, CBS.
async function checkWoningbouwtekort(gemeente: string): Promise<{
  score: number; toelichting: string
}> {
  const fallback = {
    score: 55,
    toelichting: `Woningmarktdruk voor ${gemeente} kon niet worden bepaald via CBS`,
  }
  if (!gemeente) return fallback

  try {
    // CBS gebruikt soms "Gemeente (gemeente)" als naam ter onderscheiding van
    // gelijknamige provincies. Probeer beide varianten.
    async function zoekGmCode(naam: string): Promise<string | null> {
      const url =
        `https://opendata.cbs.nl/ODataApi/odata/83625NED/RegioS` +
        `?$filter=Title%20eq%20'${encodeURIComponent(naam)}'&$select=Key,Title`
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
      if (!res.ok) return null
      const data = await res.json()
      return (data.value?.[0]?.Key as string | undefined)?.trim() ?? null
    }

    const gmCode =
      await zoekGmCode(gemeente) ??
      await zoekGmCode(`${gemeente} (gemeente)`)

    if (!gmCode) {
      return {
        score: 55,
        toelichting: `Gemeente ${gemeente} niet gevonden in CBS-register — landelijk gemiddeld niveau aangehouden`,
      }
    }

    // CBS OData v3 sorteert $orderby onbetrouwbaar — haal alle records op en sorteer zelf.
    // Dataset 83625NED bevat jaardata vanaf 1995; filter op >= 2015 om volume te beperken.
    const prijsUrl =
      `https://opendata.cbs.nl/ODataApi/odata/83625NED/TypedDataSet` +
      `?$filter=RegioS%20eq%20'${gmCode}'%20and%20Perioden%20ge%20'2015JJ00'` +
      `&$select=Perioden,GemiddeldeVerkoopprijs_1`
    const prijsRes = await fetch(prijsUrl, { signal: AbortSignal.timeout(7000) })
    if (!prijsRes.ok) {
      console.error(`[scoring] CBS verkoopprijzen TypedDataSet ${prijsRes.status}`)
      return fallback
    }
    const prijsData = await prijsRes.json()
    const records: Array<{ Perioden: string; GemiddeldeVerkoopprijs_1: number | null }> =
      prijsData.value ?? []
    if (!records.length) return fallback

    // Sorteer descending op periodestring ("2025JJ00" > "2024JJ00") en pak meest recente
    records.sort((a, b) => b.Perioden.localeCompare(a.Perioden))
    const record = records.find(r => r.GemiddeldeVerkoopprijs_1 != null)
    if (!record || record.GemiddeldeVerkoopprijs_1 == null) return fallback

    // Prijs staat in euro's (niet duizenden)
    const prijs = record.GemiddeldeVerkoopprijs_1
    const jaar = record.Perioden.substring(0, 4)
    const prijsFormatted = new Intl.NumberFormat("nl-NL", {
      style: "currency", currency: "EUR", maximumFractionDigits: 0,
    }).format(prijs)

    let score: number
    let niveau: string
    let context: string
    if (prijs >= 600_000) {
      score = 95; niveau = "extreem hoge"
      context = "Woningen zijn hier zeer schaars en duur. De gemeente staat onder maximale druk om mee te werken aan nieuwe woningbouw — dat is een sterk argument voor uw aanvraag."
    } else if (prijs >= 450_000) {
      score = 85; niveau = "zeer hoge"
      context = "Woningen zijn schaars en prijzig. De gemeente heeft een sterke reden om woningbouw te stimuleren — dat werkt in uw voordeel."
    } else if (prijs >= 350_000) {
      score = 72; niveau = "hoge"
      context = "Er is duidelijke krapte op de woningmarkt. U kunt dit als argument gebruiken richting de gemeente: er is vraag naar meer woningen."
    } else if (prijs >= 275_000) {
      score = 60; niveau = "bovengemiddelde"
      context = "Er is enige krapte, maar minder urgent dan in de grote steden. De gemeente heeft reden om mee te werken, maar het is geen dwingende noodzaak."
    } else if (prijs >= 220_000) {
      score = 46; niveau = "gemiddelde"
      context = "Woningmarktdruk is beperkt — de gemeente heeft minder urgentie om extra woningbouw toe te staan."
    } else {
      score = 32; niveau = "lage"
      context = "Woningen zijn hier relatief ruim voorhanden. De gemeente zal extra woningbouw minder snel prioriteren."
    }

    return {
      score,
      toelichting: `Gemiddelde woningprijs in ${gemeente}: ${prijsFormatted} (${jaar}, CBS) — ${niveau} woningmarktdruk. ${context}`,
    }
  } catch (e) {
    console.error("[scoring] woningbouwtekort check error:", e)
    return fallback
  }
}

// Basisscores per provincie: weerspiegelen het omgevingsbeleid t.a.v. agrarisch→wonen buiten BSG.
// Hogere score = provincie stelt minder restricties aan functiewijziging buiten stedelijk gebied.
// Bronnen: provinciale omgevingsvisies 2022-2025, IPLO-documenten, nieuwsberichten.
const PROVINCIALE_RESTRICTIES: Record<string, number> = {
  "Utrecht": 52,          // Sterk NNN/EHS, rode contour strak; omgevingsvisie 2050 terughoudend
  "Noord-Holland": 58,    // Hoge woningdruk compenseert restrictief beleid buiten BSG
  "Zuid-Holland": 62,     // Dicht verstedelijkt; omgevingsvisie faciliteert wonen bij stationsgebieden
  "Noord-Brabant": 70,    // BOPA-traject goed ingebed; omgevingsvisie 2023 noemt wonen als prioriteit
  "Gelderland": 68,       // Centrumgemeenten krijgen ruimte; landelijk gebied terughoudender
  "Overijssel": 70,       // Omgevingsvisie 2023 actief op woningopgave, ook in kleinere kernen
  "Flevoland": 88,        // Polderprovincia bij uitstek: uitbreiding is beleid, geen uitzondering
  "Drenthe": 76,          // Lage woningdruk maar provinciale woonvisie stimuleert dorpen te versterken
  "Groningen": 72,        // Krimp in sommige gebieden; woningbouw gestimuleerd in regiocentra
  "Friesland": 75,        // Woningbehoefte groeit; omgevingsvisie positief over dorpsrandlocaties
  "Limburg": 63,          // Demografische krimp; strikte ladder-toepassing; meer restricties dan zuiden
  "Zeeland": 78,          // Relatief weinig congestie; omgevingsvisie 2023 ondersteunt kleine kernen
}

// ── Provinciale omgevingsvisie (live Ruimtelijkeplannen API + statische basis) ──────────
// Provinciale omgevingsvisies zijn in Ruimtelijkeplannen opgeslagen als type "structuurvisie"
// met namen als "Omgevingsvisie provincie Utrecht". We controleren:
//  1. Bestaat er een provinciale omgevingsvisie voor deze locatie?
//  2. Hoe recent is die? (recente visies verwerken het nationale doel van 900k woningen)
//  3. Combineren met statische basisscores die het feitelijke beleid weerspiegelen.
async function checkProvincialeOmgevingsvisie(lat: number, lon: number, provincie: string): Promise<{
  score: number; toelichting: string; viewUrl?: string
}> {
  const basisScore = PROVINCIALE_RESTRICTIES[provincie] ?? 68

  const apiKey = process.env.RUIMTELIJKEPLANNEN_API_KEY
  if (!apiKey) {
    return {
      score: basisScore,
      toelichting: `Provincie ${provincie} ${basisScore > 70 ? "staat open voor woningbouw buiten de bebouwde kom" : "is terughoudend met woningbouw buiten de bebouwde kom"}`,
    }
  }

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/hal+json",
    "X-Api-Key": apiKey,
  }

  try {
    const res = await fetch(
      `${RP_BASE}/plannen/_zoek?contentCrs=epsg:4326&acceptCrs=epsg:4326&pageSize=50`,
      { method: "POST", headers, body: geoBody(lon, lat), signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) {
      console.error(`[scoring] provinciale omgevingsvisie/_zoek ${res.status}`)
      return {
        score: basisScore,
        toelichting: `Provincie ${provincie} ${basisScore > 70 ? "biedt relatief gunstige" : "stelt relatief strenge"} kaders — omgevingsvisie kon niet worden opgevraagd`,
      }
    }

    const data = await res.json()
    const plannen: Array<{
      naam?: string; type?: string; identificatie?: string
      planstatusInfo?: { planstatus?: string; datum?: string }
    }> = data._embedded?.plannen ?? []

    // Filter: structuurvisies met "omgevingsvisie" in naam, niet de nationale
    const omgevingsvisies = plannen.filter(p =>
      p.type === "structuurvisie" &&
      (p.naam ?? "").toLowerCase().includes("omgevingsvisie") &&
      !(p.naam ?? "").toLowerCase().includes("nationaal") &&
      !(p.naam ?? "").toLowerCase().includes("nationale")
    )

    if (!omgevingsvisies.length) {
      return {
        score: basisScore,
        toelichting: `Provincie ${provincie} ${basisScore > 70 ? "staat open voor woningbouw buiten de bebouwde kom" : "is terughoudend met woningbouw buiten de bebouwde kom"}`,
      }
    }

    // Meest recente omgevingsvisie
    const meestRecent = omgevingsvisies.sort((a, b) => {
      const da = a.planstatusInfo?.datum ?? "0"
      const db = b.planstatusInfo?.datum ?? "0"
      return db.localeCompare(da)
    })[0]

    const datum = meestRecent.planstatusInfo?.datum
    const jaar = datum ? new Date(datum).getFullYear() : null
    const jaren = datum
      ? (Date.now() - new Date(datum).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      : null

    // Recentiebonus: nieuwere omgevingsvisies verwerken nationale woningbouwdoelen (900k t/m 2030)
    let modifier = 0
    if (jaren !== null) {
      if (jaren < 2) modifier = +8
      else if (jaren < 5) modifier = +4
      else if (jaren > 10) modifier = -6
    }

    const aangepastScore = Math.max(20, Math.min(95, basisScore + modifier))
    const recencyLabel =
      jaren === null ? "datum onbekend"
      : jaren < 2 ? "recent vastgesteld"
      : jaren < 5 ? "actueel"
      : jaren < 10 ? "enige jaren oud"
      : "verouderd"

    const gunstig = aangepastScore > 70
    const viewUrl = meestRecent.identificatie
      ? `https://omgevingswet.overheid.nl/regels-op-de-kaart/document?documentID=${meestRecent.identificatie}`
      : undefined
    return {
      score: aangepastScore,
      viewUrl,
      toelichting:
        `${meestRecent.naam ?? "Provinciale omgevingsvisie"}${jaar ? ` (${jaar})` : ""} is ${recencyLabel}. ` +
        `Provincie ${provincie} ${gunstig ? "staat open voor woningbouw op agrarische grond buiten de bebouwde kom" : "is terughoudend met woningbouw op agrarische grond buiten de bebouwde kom"}` +
        (modifier > 0 ? " en heeft de nationale doelstelling van 900.000 extra woningen in het beleid verwerkt." : "."),
    }
  } catch (e) {
    console.error("[scoring] provinciale omgevingsvisie error:", e)
    return {
      score: basisScore,
      toelichting: `Provincie ${provincie} ${basisScore > 70 ? "biedt relatief gunstige" : "stelt relatief strenge"} kaders — omgevingsvisie tijdelijk niet raadpleegbaar`,
    }
  }
}

// ── Nutsvoorzieningen nabijheid ────────────────────────────────────────────
// Proxy: BAG-verblijfsobjecten binnen 75m. Bestaande bebouwing op die afstand
// impliceert dat water, riolering en elektra al in de grond liggen — dit verlaagt
// de aanlegkosten en versterkt het ruimtelijk argument richting gemeente.
async function checkNutsvoorzieningen(lat: number, lon: number): Promise<{
  score: number; aantalObjecten: number; toelichting: string
}> {
  const fallback = { score: 45, aantalObjecten: 0, toelichting: "Nabijheid nutsvoorzieningen kon niet worden bepaald" }
  try {
    const url =
      `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0` +
      `&request=GetFeature&typeName=bag:verblijfsobject&outputFormat=json&count=20` +
      `&CQL_FILTER=DWITHIN(geometrie,POINT(${lon}%20${lat}),75,meters)`
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) {
      console.error(`[scoring] BAG nutsvoorzieningen ${res.status}`)
      return fallback
    }
    const data = await res.json()
    const aantalObjecten: number = (data.features ?? []).length

    if (aantalObjecten >= 5) {
      return {
        score: 90,
        aantalObjecten,
        toelichting: `${aantalObjecten} panden staan op minder dan 75 meter afstand. Water, riolering en elektriciteit zijn waarschijnlijk al aangelegd in de straat — dat scheelt u aanzienlijk in aansluitkosten.`,
      }
    }
    if (aantalObjecten >= 1) {
      return {
        score: 68,
        aantalObjecten,
        toelichting: `${aantalObjecten} pand${aantalObjecten > 1 ? "en" : ""} in de buurt aangetroffen — basisinfrastructuur is beperkt aanwezig. Navraag bij de netbeheerder is verstandig om te weten of aansluiting haalbaar is.`,
      }
    }
    return {
      score: 22,
      aantalObjecten: 0,
      toelichting: "Er staat niets in de directe omgeving. Water, riolering en elektriciteit zijn waarschijnlijk nog niet aangelegd — dit leidt tot hoge aansluitkosten en kan een bezwaar zijn bij de gemeente.",
    }
  } catch (e) {
    console.error("[scoring] nutsvoorzieningen check error:", e)
    return fallback
  }
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
        toelichting: `Perceel ligt in of direct naast de bebouwde kom (${aantalObjecten}+ panden in 300m). Dat is gunstig: u hoeft minder te bewijzen waarom juist hier gebouwd moet worden.`,
      }
    }
    return {
      score: 35,
      binnenBSG: false,
      toelichting: aantalObjecten === 0
        ? "Perceel ligt buiten de bebouwde kom. U moet in uw aanvraag aantonen dat er geen geschikte bouwlocaties beschikbaar zijn bínnen de bebouwde kom. Dat maakt het traject zwaarder."
        : `Perceel ligt op de rand van de bebouwde kom (${aantalObjecten} panden in 300m). U moet onderbouwen waarom hier gebouwd wordt en niet op een locatie dichter bij de kern.`,
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
      ? `Provincie ${provincie} heeft uitgebreide veengebieden — bouwen op veen is duur en politiek gevoelig. Extra bodemonderzoek is verstandig.`
      : "Geen verhoogd grondwaterrisico op basis van regio.",
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
        toelichting: `Veenbodem aangetroffen (code ${code}). Veen krimpt en daalt bij bebouwing, wat het risico op verzakking vergroot en funderingen duurder maakt. Extra bodemonderzoek is verplicht.`,
      }
    }
    if (isKlei) {
      return {
        score: 52,
        bodemcode: code,
        toelichting: `Kleibodem aangetroffen (code ${code}). Klei kan inklinken onder het gewicht van een woning — geotechnisch onderzoek is sterk aanbevolen voordat u plannen maakt.`,
      }
    }
    return {
      score: 80,
      bodemcode: code,
      toelichting: `Zandbodem aangetroffen (code ${code}) — stabiele ondergrond met goede draagkracht. Geen extra funderingsmaatregelen verwacht.`,
    }
  } catch {
    return provincieFallback
  }
}

// ── Netcongestie elektriciteit ─────────────────────────────────────────────
// Bronnen: gepubliceerde congestiekaarten Liander, Enexis, Stedin (2024-2025).
// Er is geen uniforme open API; data is handmatig bijgehouden per netbeheerder.
// Controleer altijd de actuele congestiekaart van de lokale netbeheerder.
const CONGESTIE_HOOG = new Set([
  // Liander – Noord-Holland
  "Amsterdam", "Amstelveen", "Haarlemmermeer", "Diemen", "Aalsmeer", "Uithoorn",
  "Haarlem", "Bloemendaal", "Velsen", "Beverwijk", "Heemskerk",
  "Alkmaar", "Heerhugowaard", "Langedijk", "Heiloo",
  "Purmerend", "Zaanstad", "Wormerland",
  // Liander – Flevoland
  "Almere", "Lelystad",
  // Liander – Gelderland
  "Arnhem", "Nijmegen", "Ede", "Doetinchem", "Duiven", "Westervoort", "Zevenaar",
  "Apeldoorn", "Zutphen",
  // Enexis – Noord-Brabant
  "Eindhoven", "Helmond", "Best", "Veldhoven", "Waalre", "Nuenen", "Son en Breugel",
  "Tilburg", "Breda", "'s-Hertogenbosch", "Oss", "Uden", "Meierijstad",
  "Bergen op Zoom", "Roosendaal", "Oosterhout",
  // Enexis – Overijssel
  "Zwolle", "Deventer", "Hardenberg", "Enschede", "Hengelo", "Almelo", "Oldenzaal",
  // Enexis – Drenthe
  "Emmen", "Hoogeveen",
  // Enexis – Groningen
  "Groningen", "Assen",
  // Enexis – Limburg
  "Venlo", "Venray", "Weert",
  // Stedin – Utrecht
  "Utrecht", "Nieuwegein", "Houten", "IJsselstein", "Woerden",
  "De Ronde Venen", "Stichtse Vecht", "Amersfoort", "Zeist", "Bunnik",
  // Stedin – Zuid-Holland
  "Rotterdam", "Capelle aan den IJssel", "Barendrecht", "Ridderkerk",
  "Nissewaard", "Dordrecht", "Papendrecht", "Zwijndrecht",
  "Delft", "Zoetermeer", "Lansingerland", "Pijnacker-Nootdorp",
  "Den Haag", "'s-Gravenhage", "Rijswijk", "Westland",
  "Leiden", "Leidschendam-Voorburg", "Voorschoten",
])

// Provincies met meerdere congestiezones maar waarvan niet alle gemeenten zijn geïdentificeerd
const CONGESTIE_MIDDEN_PROVINCIES = new Set([
  "Noord-Brabant", "Utrecht", "Zuid-Holland", "Noord-Holland",
  "Gelderland", "Flevoland", "Overijssel",
])

// Netbeheerder per provincie voor doorverwijzing in toelichting
const NETBEHEERDER: Record<string, string> = {
  "Noord-Holland": "Liander (liander.nl/congestie)",
  "Flevoland": "Liander (liander.nl/congestie)",
  "Gelderland": "Liander (liander.nl/congestie)",
  "Friesland": "Liander (liander.nl/congestie)",
  "Zuid-Holland": "Stedin (stedin.net/congestie)",
  "Utrecht": "Stedin (stedin.net/congestie)",
  "Zeeland": "Stedin (stedin.net/congestie)",
  "Noord-Brabant": "Enexis (enexis.nl/netcongestie)",
  "Overijssel": "Enexis (enexis.nl/netcongestie)",
  "Drenthe": "Enexis (enexis.nl/netcongestie)",
  "Groningen": "Enexis (enexis.nl/netcongestie)",
  "Limburg": "Enexis (enexis.nl/netcongestie)",
}

function getNetcongestieScore(gemeente: string, provincie: string): { score: number; toelichting: string } {
  const netbeheerder = NETBEHEERDER[provincie] ?? "de lokale netbeheerder"
  if (CONGESTIE_HOOG.has(gemeente)) {
    return {
      score: 22,
      toelichting: `${gemeente} staat op de congestielijst van ${netbeheerder} — het elektriciteitsnet zit vol. Nieuwe woningen aansluiten op het net kan jaren duren of tijdelijk niet mogelijk zijn. Controleer de actuele status via ${netbeheerder}.`,
    }
  }
  if (CONGESTIE_MIDDEN_PROVINCIES.has(provincie)) {
    return {
      score: 58,
      toelichting: `In ${provincie} zijn meerdere regio's waar het elektriciteitsnet vol zit, maar ${gemeente} staat niet op de bekende lijst. Controleer de actuele status via ${netbeheerder}.`,
    }
  }
  return {
    score: 82,
    toelichting: `${gemeente} staat niet op de congestielijst — aansluiting op het elektriciteitsnet vormt naar verwachting geen obstakel. Verifieer dit via ${netbeheerder}.`,
  }
}

// ── Geluidshinder: autosnelwegen en spoorwegen ────────────────────────────
// BGT wegdelen identificeren snelwegen (Wet geluidhinder zone 300m) en
// spoorwegen (zone 200m). Binnen die zones geldt een verplicht akoestisch onderzoek
// en hogere-grenswaardenprocedure — dit verlengt het traject en verhoogt de kosten.
async function checkGeluidshinder(lat: number, lon: number): Promise<{
  score: number; toelichting: string
}> {
  const fallback = { score: 62, toelichting: "Geluidsbelasting kon niet worden bepaald" }
  try {
    // ~350m bbox (snelwegzone = 300m, marge voor CRS-afronding)
    const dLon = 0.005   // ≈350m bij 52°N
    const dLat = 0.0032  // ≈350m noord-zuid
    const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`

    type BgtFeature = { properties: { functie?: string; plus_functie?: string } }

    const [wegRes, spoorRes] = await Promise.all([
      fetch(
        `https://api.pdok.nl/lv/bgt/ogc/v1/collections/wegdeel/items?limit=100&bbox=${bbox}&f=json`,
        { signal: AbortSignal.timeout(7000) }
      ).catch(() => null),
      fetch(
        `https://api.pdok.nl/lv/bgt/ogc/v1/collections/spoor/items?limit=20&bbox=${bbox}&f=json`,
        { signal: AbortSignal.timeout(7000) }
      ).catch(() => null),
    ])

    const wegFeatures: BgtFeature[] = wegRes?.ok ? ((await wegRes.json()).features ?? []) : []
    const spoorFeatures: BgtFeature[] = spoorRes?.ok ? ((await spoorRes.json()).features ?? []) : []

    const SNELWEG = new Set(["autosnelweg", "rijbaan autosnelweg", "op- of afrit", "verbindingsweg"])
    const REGIONALE_WEG = new Set(["rijbaan regionale weg", "rijbaan autoweg"])
    const TREIN = new Set(["trein", "sneltram"])

    const heeftSnelweg = wegFeatures.some(f => SNELWEG.has(f.properties.functie ?? ""))
    const heeftRegionaalWeg = wegFeatures.some(f => REGIONALE_WEG.has(f.properties.functie ?? ""))
    const heeftSpoor = spoorFeatures.some(f => TREIN.has(f.properties.functie ?? ""))

    if (heeftSnelweg && heeftSpoor) {
      return {
        score: 15,
        toelichting:
          "Perceel ligt naast zowel een snelweg als een spoorlijn — dat is zwaar qua geluid. U bent verplicht akoestisch onderzoek te laten uitvoeren. De gemeente kan extra geluidswerende maatregelen aan de gevel eisen, wat de bouwkosten verhoogt.",
      }
    }
    if (heeftSnelweg) {
      return {
        score: 28,
        toelichting:
          "Perceel ligt binnen 300m van een snelweg. U bent wettelijk verplicht akoestisch onderzoek te laten uitvoeren (Wet geluidhinder). Als het geluid te hoog is, kan de gemeente extra gevelisolatie eisen — dat verhoogt de bouwkosten.",
      }
    }
    if (heeftSpoor) {
      return {
        score: 38,
        toelichting:
          "Perceel ligt naast een spoorlijn. Akoestisch onderzoek is verplicht. Woningbouw is mogelijk als het geluid niet te hoog is, maar gevelisolatie is doorgaans een vereiste.",
      }
    }
    if (heeftRegionaalWeg) {
      return {
        score: 62,
        toelichting:
          "Perceel ligt naast een provinciale weg — het geluid is wat hoger dan gemiddeld. Een akoestisch onderzoek is verstandig; standaard gevelisolatie lost dit doorgaans op.",
      }
    }
    return {
      score: 88,
      toelichting:
        "Geen drukke wegen of spoorlijnen in de directe omgeving — geluidshinder vormt naar verwachting geen bezwaar.",
    }
  } catch (e) {
    console.error("[scoring] geluidshinder error:", e)
    return fallback
  }
}

// ── Erfgoed & beschermd gezicht ───────────────────────────────────────────
// Rijksmonumenten binnen 50m beïnvloeden de welstandstoets en vereisen
// overleg met de RCE. Een beschermd stads-/dorpsgezicht dwingt afwijking van
// het reguliere ruimtelijk-kwaliteitsbeleid en maakt afwijkingsprocedures zwaarder.
// Bron: RCE Erfgoedregister via PDOK WFS.
async function checkErfgoed(lat: number, lon: number): Promise<{
  score: number; toelichting: string
}> {
  const fallback = { score: 75, toelichting: "Erfgoedstatus kon niet worden bepaald" }
  const WFS = "https://service.pdok.nl/rce/erfgoed/wfs/v1_0?service=WFS&version=2.0.0&request=GetFeature&outputFormat=json"

  try {
    const [monumentRes, gezichtRes] = await Promise.all([
      fetch(
        `${WFS}&typeName=rce:rijksmonumenten&count=5` +
        `&CQL_FILTER=DWITHIN(geometrie,POINT(${lon}%20${lat}),100,meters)`,
        { signal: AbortSignal.timeout(7000) }
      ).catch(() => null),
      fetch(
        `${WFS}&typeName=rce:beschermd_gezicht&count=1` +
        `&CQL_FILTER=INTERSECTS(geometrie,POINT(${lon}%20${lat}))`,
        { signal: AbortSignal.timeout(7000) }
      ).catch(() => null),
    ])

    type Monument = { properties: { monumentnummer?: number; naam?: string; monumentstatus?: string } }
    const monumenten: Monument[] = monumentRes?.ok ? ((await monumentRes.json()).features ?? []) : []
    const beschermdGezicht: { properties: { naam?: string } }[] = gezichtRes?.ok ? ((await gezichtRes.json()).features ?? []) : []

    const binnenGezicht = beschermdGezicht.length > 0
    const gezichtNaam = beschermdGezicht[0]?.properties?.naam

    if (binnenGezicht) {
      return {
        score: 25,
        toelichting:
          `Perceel ligt in beschermd${gezichtNaam ? ` "${gezichtNaam}"` : " stads- of dorpsgezicht"} — een wettelijk beschermd gebied vanwege het historisch karakter. Alle nieuwe bebouwing moet daarbinnen passen. Een extra adviescommissie beoordeelt uw bouwplannen, wat de procedure verlengt.`,
      }
    }
    if (monumenten.length > 0) {
      const namen = monumenten
        .map(m => m.properties.naam)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ")
      return {
        score: 48,
        toelichting:
          `${monumenten.length} rijksmonument${monumenten.length > 1 ? "en" : ""}${namen ? ` (o.a. ${namen})` : ""} op minder dan 100m afstand. Uw bouwplannen mogen het zicht op en de omgeving van dit monument niet aantasten. De Rijksdienst voor het Cultureel Erfgoed (RCE) adviseert hierover — dat vertraagt de procedure.`,
      }
    }
    return {
      score: 88,
      toelichting:
        "Geen rijksmonumenten of beschermde dorps- of stadsgezichten in de omgeving aangetroffen — erfgoed is geen bezwaar.",
    }
  } catch (e) {
    console.error("[scoring] erfgoed error:", e)
    return fallback
  }
}

// ── Gemeentelijke woningbouwproductie (CBS + Ruimtelijkeplannen) ──────────
// Een beleidsvisie zegt niks over ambitie; feitelijke vergunde productie wel.
// Primaire bron: CBS 82243NED "Nieuwbouw woningen; vergunningen" per gemeente.
// Fallback: tel recente wonen-wijzigingsplannen van déze gemeente in Ruimtelijkeplannen.
// Beide meten daadwerkelijk handelen, niet documenten.
async function checkGemeentelijkeWoonvisie(lat: number, lon: number, gemeente: string): Promise<{
  score: number; toelichting: string
}> {
  const fallback = {
    score: 52,
    toelichting: `Woningbouwproductie van ${gemeente} kon niet worden bepaald — bestuurlijk draagvlak onbekend`,
  }
  if (!gemeente) return fallback

  // ── Poging 1: CBS 82243NED vergunde nieuwbouwwoningen ────────────────
  try {
    async function zoekGmCode(naam: string): Promise<string | null> {
      const esc = (s: string) => s.replace(/'/g, "''")
      const tries = [
        // Exact
        `Title%20eq%20'${encodeURIComponent(esc(naam))}'`,
        // CBS-variant met "(gemeente)" suffix
        `Title%20eq%20'${encodeURIComponent(esc(naam) + "%20(gemeente)")}'`,
      ]
      // Strip voorvoegsel (De/Het/Den/'t/'s) → substringof voor CBS
      const stripped = naam.replace(/^(De|Het|Den|'t|'s)\s+/i, "")
      if (stripped !== naam) {
        tries.push(`substringof('${encodeURIComponent(esc(stripped))}',Title)%20eq%20true`)
      }
      for (const filter of tries) {
        const url = `https://opendata.cbs.nl/ODataApi/odata/82243NED/RegioS?$filter=${filter}&$select=Key,Title&$top=1`
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (!res.ok) continue
        const key = ((await res.json()).value?.[0]?.Key as string | undefined)?.trim()
        if (key) return key
      }
      return null
    }

    const gmCode = await zoekGmCode(gemeente)

    if (gmCode) {
      const dataUrl = `https://opendata.cbs.nl/ODataApi/odata/82243NED/TypedDataSet` +
        `?$filter=RegioS%20eq%20'${gmCode}'%20and%20Perioden%20ge%20'2020JJ00'`
      const res = await fetch(dataUrl, { signal: AbortSignal.timeout(7000) })

      if (res.ok) {
        const rawRecords: Array<Record<string, unknown>> = (await res.json()).value ?? []
        const records = rawRecords
          .filter(r => String(r.Perioden).includes("JJ"))
          .sort((a, b) => String(b.Perioden).localeCompare(String(a.Perioden)))

        if (records.length > 0) {
          // Kolom-discovery: CBS benoemt meetkolommen met opeenvolgend achtervoegsel (_1, _2, …)
          // Woningen vergund is doorgaans de tweede maatstaf (na bouwsom).
          // Log alle kolommen zodat we snel kunnen corrigeren als de naam afwijkt.
          const eersteRecord = records[0]
          console.log("[scoring] CBS 82243NED kolommen:", Object.keys(eersteRecord))

          const KANDIDATEN = [
            "Woningen_2", "Woningen_1", "VergundeBouwvergunningenWoningen_1",
            "NieuwbouwWoningen_1", "VergunnigenVerleend_1", "AantalWoningen_1",
          ]
          const kolom = KANDIDATEN.find(k => eersteRecord[k] != null)

          if (kolom) {
            const recentRecords = records.slice(0, 3)
            const totaal = recentRecords.reduce((s, r) => s + (Number(r[kolom]) || 0), 0)
            const gemJaar = Math.round(totaal / recentRecords.length)
            const vanJaar = String(recentRecords[recentRecords.length - 1]?.Perioden).substring(0, 4)
            const totJaar = String(recentRecords[0]?.Perioden).substring(0, 4)
            const periode = vanJaar === totJaar ? vanJaar : `${vanJaar}–${totJaar}`

            // Score op absolute aantallen (kleine gemeente bouwt per definitie minder).
            // Bewust geen per-capita normalisatie: absolute aantallen zijn relevanter
            // voor de vraag of de gemeente proceservaring heeft.
            let score: number
            let niveau: string
            let context: string
            if (gemJaar >= 500) {
              score = 90; niveau = "zeer hoge"
              context = "Grote stad met aantoonbare bestuurlijke en ambtelijke capaciteit voor woningbouw."
            } else if (gemJaar >= 200) {
              score = 80; niveau = "hoge"
              context = "Actieve gemeente met ruime vergunningservaring."
            } else if (gemJaar >= 75) {
              score = 67; niveau = "gemiddelde"
              context = "Gemeente vergunt regelmatig; apparaat heeft ervaring met woningbouwprocedures."
            } else if (gemJaar >= 25) {
              score = 52; niveau = "beperkte"
              context = "Beperkte productie — gemeente vergunt selectief. Onderbouw de locatiekeuze goed."
            } else if (gemJaar >= 5) {
              score = 36; niveau = "lage"
              context = "Nauwelijks nieuwe woningen vergund. Vraag bij gemeente actief naar de oorzaak."
            } else {
              score = 22; niveau = "vrijwel geen"
              context = "Gemeente vergunt structureel geen nieuwe woningen — politieke of ruimtelijke blokkade."
            }

            return {
              score,
              toelichting:
                `${gemeente} vergunde gemiddeld ${gemJaar} woningen/jaar (${periode}, CBS) — ${niveau} woningbouwproductie. ${context}`,
            }
          } else {
            console.error("[scoring] CBS 82243NED: woningkolom niet herkend. Beschikbare kolommen:", Object.keys(eersteRecord))
          }
        }
      } else {
        console.error(`[scoring] CBS 82243NED TypedDataSet ${res.status}`)
      }
    }
  } catch (e) {
    console.error("[scoring] CBS woningbouwproductie error:", e)
  }

  // ── Poging 2: Ruimtelijkeplannen — wonen-wijzigingsplannen in déze gemeente ─
  // Tel vastgestelde wijzigings-/uitwerkingsplannen met "woon" in naam van
  // dezelfde gemeente (gefilterd op gemeente.naam in de API-response).
  const apiKey = process.env.RUIMTELIJKEPLANNEN_API_KEY
  if (!apiKey) return fallback

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/hal+json",
    "X-Api-Key": apiKey,
  }

  try {
    const d = 0.045 // ~5km bbox
    const bboxBody = JSON.stringify({
      _geo: { intersects: { type: "Polygon", coordinates: [[
        [lon - d, lat - d], [lon + d, lat - d],
        [lon + d, lat + d], [lon - d, lat + d],
        [lon - d, lat - d],
      ]]}},
    })

    const res = await fetch(
      `${RP_BASE}/plannen/_zoek?contentCrs=epsg:4326&acceptCrs=epsg:4326&pageSize=100`,
      { method: "POST", headers, body: bboxBody, signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) {
      console.error(`[scoring] woonproductie Ruimtelijkeplannen ${res.status}`)
      return fallback
    }

    const plannen: Array<{
      naam?: string; type?: string
      planstatusInfo?: { planstatus?: string; datum?: string }
      gemeente?: { naam?: string }
    }> = (await res.json())._embedded?.plannen ?? []

    const WONEN = ["wonen", "woon", "woningbouw", "woongebied", "woonwijk", "woningen"]
    const ACTIE_TYPEN = new Set(["wijzigingsplan", "uitwerkingsplan",
      "gemeentelijk plan; uitwerkingsplan artikel 11",
      "gemeentelijk plan; wijzigingsplan artikel 11"])
    const peilDatum = new Date()
    peilDatum.setFullYear(peilDatum.getFullYear() - 8)

    // Filter: alleen plannen van déze gemeente, recente wonen-plannen, vastgesteld
    const wonenPlannen = plannen.filter(p => {
      if (!ACTIE_TYPEN.has(p.type ?? "")) return false
      if (p.planstatusInfo?.planstatus !== "vastgesteld") return false
      const gmNaam = (p.gemeente?.naam ?? "").toLowerCase()
      if (gmNaam && !gmNaam.includes(gemeente.toLowerCase())) return false
      const datum = p.planstatusInfo?.datum
      if (datum) {
        const d = new Date(datum)
        if (!isNaN(d.getTime()) && d < peilDatum) return false
      }
      const naam = (p.naam ?? "").toLowerCase()
      return WONEN.some(t => naam.includes(t))
    })

    const aantal = wonenPlannen.length
    let score: number
    let context: string
    if (aantal >= 10) {
      score = 85
      context = `${aantal} wonen-wijzigingsplannen vastgesteld in de afgelopen 8 jaar — gemeente heeft ruime proceservaring en politiek draagvlak.`
    } else if (aantal >= 5) {
      score = 72
      context = `${aantal} wonen-wijzigingsplannen vastgesteld — gemeente vergunt actief maar heeft beperkte procedure-schaal.`
    } else if (aantal >= 2) {
      score = 58
      context = `${aantal} wonen-wijzigingsplannen vastgesteld — beperkte precedenten; onderbouw locatiekeuze goed.`
    } else if (aantal === 1) {
      score = 44
      context = `Slechts 1 wonen-wijzigingsplan vastgesteld — gemeente heeft weinig ervaring met dit soort procedures.`
    } else {
      score = 48
      context = `Geen vastgestelde wonen-wijzigingsplannen aangetroffen in de directe omgeving — woningbouwactiviteit van ${gemeente} kon niet worden vastgesteld via Ruimtelijkeplannen.`
    }

    return {
      score,
      toelichting: `Gemeentelijke woningbouwactiviteit (${gemeente}, Ruimtelijkeplannen): ${context}`,
    }
  } catch (e) {
    console.error("[scoring] woonproductie Ruimtelijkeplannen error:", e)
    return fallback
  }
}

export interface ScoringInput {
  perceel: Perceel;
  bestemmingsplan?: string;
}

// Hard blockers: factors die de totaalscore begrenzen ongeacht de overige factoren.
// Rationale: een gemiddeld wegde van 12 factoren overschat de kans wanneer één
// factor in de praktijk prohibitief is (NNN, Natura2000 op <5km).
// NNN is een harde juridische blocker (provinciale verordening verbiedt omzetting).
// Natura2000 is GEEN hard blocker: nabijheid vereist AERIUS-onderzoek maar maakt
// een project niet onmogelijk — bestaande woningbouw dicht bij Natura2000 bewijst dit.
const HARD_BLOCKER_DEFINITIES: { naam: string; scoreGrens: number; maxTotaal: number }[] = [
  { naam: "Natuur Netwerk Nederland (NNN)", scoreGrens: 15, maxTotaal: 12 },
]

export async function berekenScore(perceel: Perceel): Promise<{
  factoren: ScoreFactor[];
  totaalScore: number;
  scoreKlasse: ScoreKlasse;
  reedsBouwgrond: boolean;
  huidigeBestemming: string;
  natura2000Score: number;
  precedentPlannen: import("@/types").PrecedentPlan[];
  hardBlockers: import("@/types").HardBlocker[];
}> {
  // Promise.allSettled: één falende check gooit niet meer de hele analyse weg.
  // Elke afzonderlijke check heeft al een eigen try/catch; deze laag vangt
  // onverwachte throws (bugs, OOM) op en geeft een neutrale fallbackscore terug.
  function ok<T>(r: PromiseSettledResult<T>, fallback: T, naam: string): T {
    if (r.status === "fulfilled") return r.value
    console.error(`[scoring] check "${naam}" onverwacht gefaald:`, r.reason)
    return fallback
  }

  const settled = await Promise.allSettled([
    perceel.bestemmingHint
      ? Promise.resolve(classifyVlak(perceel.bestemmingHint))
      : fetchBestemmingInfo(perceel.lat, perceel.lon),
    checkNatura2000Nabijheid(perceel.lat, perceel.lon),
    checkHistorischePrecedenten(perceel.lat, perceel.lon, perceel.gemeente ?? ""),
    checkLadderBSG(perceel.lat, perceel.lon),
    checkGrondwaterRisico(perceel.lat, perceel.lon, perceel.provincie),
    checkNNNGNN(perceel.lat, perceel.lon),
    checkWatertoets(perceel.lat, perceel.lon),
    checkNutsvoorzieningen(perceel.lat, perceel.lon),
    checkWoningbouwtekort(perceel.gemeente ?? ""),
    checkProvincialeOmgevingsvisie(perceel.lat, perceel.lon, perceel.provincie ?? ""),
    checkGeluidshinder(perceel.lat, perceel.lon),
    checkErfgoed(perceel.lat, perceel.lon),
    checkGemeentelijkeWoonvisie(perceel.lat, perceel.lon, perceel.gemeente ?? ""),
  ]);

  const bestemmingInfo    = ok(settled[0],  { naam: "onbekend", reedsBouwgrond: false, isAgrarisch: false },                                              "bestemmingInfo")
  const natura2000        = ok(settled[1],  { score: 50, toelichting: "Natura2000-check tijdelijk niet beschikbaar" },                                    "natura2000")
  const precedenten       = ok(settled[2],  { score: 55, aantalPrecedenten: 0, toelichting: "Precedentencheck tijdelijk niet beschikbaar", plannen: [] }, "precedenten")
  const ladderBSG         = ok(settled[3],  { score: 50, binnenBSG: null, toelichting: "BSG-check tijdelijk niet beschikbaar" },                          "ladderBSG")
  const grondwater        = ok(settled[4],  { score: 60, bodemcode: null, toelichting: "Grondwatercheck tijdelijk niet beschikbaar" },                    "grondwater")
  const nnn               = ok(settled[5],  { score: 65, binnenNNN: false, toelichting: "NNN-check tijdelijk niet beschikbaar" },                         "nnn")
  const watertoets        = ok(settled[6],  { score: 65, nabijWater: false, toelichting: "Watertoets tijdelijk niet beschikbaar" },                       "watertoets")
  const nutsvoorzieningen = ok(settled[7],  { score: 45, aantalObjecten: 0, toelichting: "Nutsvoorzieningencheck tijdelijk niet beschikbaar" },           "nutsvoorzieningen")
  const woningmarkt       = ok(settled[8],  { score: 55, toelichting: "Woningmarktdata tijdelijk niet beschikbaar" },                                     "woningmarkt")
  const provinciaalOmgevingsvisie = ok(settled[9],  { score: 65, toelichting: "Provinciale omgevingsvisie tijdelijk niet beschikbaar" },                  "provinciaalOmgevingsvisie")
  const geluidshinder     = ok(settled[10], { score: 62, toelichting: "Geluidshindercheck tijdelijk niet beschikbaar" },                                  "geluidshinder")
  const erfgoed           = ok(settled[11], { score: 75, toelichting: "Erfgoedcheck tijdelijk niet beschikbaar" },                                        "erfgoed")
  const woonvisie         = ok(settled[12], { score: 52, toelichting: "Gemeentelijke woonvisiecheck tijdelijk niet beschikbaar" },                        "woonvisie")

  const { naam: huidigeBestemming, reedsBouwgrond, isAgrarisch, planDatum, planViewUrl } = bestemmingInfo
  const planleeftijd = berekenPlanleeftijdScore(planDatum)

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
      bronnen: huidigeBestemming !== "onbekend" ? [{
        label: planDatum ? `${huidigeBestemming} (${planDatum.substring(0, 4)})` : huidigeBestemming,
        url: planViewUrl,
        type: "bestemmingsplan" as const,
      }] : undefined,
    },
    {
      naam: "Woningmarktdruk",
      gewicht: 4,
      score: woningmarkt.score,
      toelichting: woningmarkt.toelichting,
      positief: woningmarkt.score > 60,
      bronnen: [{
        label: (() => {
          const m = woningmarkt.toelichting.match(/\((\d{4}), CBS\)/)
          return `CBS 83625NED – ${perceel.gemeente ?? "gemeente"}${m?.[1] ? ` (${m[1]})` : ""}`
        })(),
        url: "https://opendata.cbs.nl/statline/#/CBS/nl/dataset/83625NED",
        type: "data" as const,
      }],
    },
    {
      naam: "Provinciale omgevingsvisie",
      gewicht: 4,
      score: provinciaalOmgevingsvisie.score,
      toelichting: provinciaalOmgevingsvisie.toelichting,
      positief: provinciaalOmgevingsvisie.score > 70,
      bronnen: (() => {
        const label = provinciaalOmgevingsvisie.toelichting.split(" is ")[0]
        return label ? [{ label, type: "bestemmingsplan" as const, url: provinciaalOmgevingsvisie.viewUrl }] : undefined
      })(),
    },
    {
      naam: "Natura2000 & stikstof",
      gewicht: 5,
      score: natura2000.score,
      toelichting: natura2000.toelichting,
      positief: natura2000.score >= 70,
    },
    {
      naam: "Nutsvoorzieningen & infrastructuur",
      gewicht: 5,
      score: nutsvoorzieningen.score,
      toelichting: nutsvoorzieningen.toelichting,
      positief: nutsvoorzieningen.score >= 60,
    },
    {
      naam: "Historische precedenten",
      gewicht: 3,
      score: precedenten.score,
      toelichting: precedenten.toelichting,
      positief: precedenten.score > 60,
      bronnen: precedenten.plannen.slice(0, 3).map(p => ({
        label: p.datum ? `${p.naam} (${p.datum.substring(0, 4)})` : p.naam,
        url: "https://www.ruimtelijkeplannen.nl",
        type: "bestemmingsplan" as const,
      })),
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
    {
      naam: "Natuur Netwerk Nederland (NNN)",
      gewicht: 6,
      score: nnn.score,
      toelichting: nnn.toelichting,
      positief: !nnn.binnenNNN,
    },
    {
      naam: "Watertoets",
      gewicht: 3,
      score: watertoets.score,
      toelichting: watertoets.toelichting,
      positief: !watertoets.nabijWater,
    },
    {
      naam: "Leeftijd bestemmingsplan",
      gewicht: 3,
      score: planleeftijd.score,
      toelichting: planleeftijd.toelichting,
      positief: planleeftijd.score >= 60,
    },
    {
      naam: "Geluidshinder",
      gewicht: 4,
      score: geluidshinder.score,
      toelichting: geluidshinder.toelichting,
      positief: geluidshinder.score >= 70,
    },
    {
      naam: "Erfgoed & beschermd gezicht",
      gewicht: 3,
      score: erfgoed.score,
      toelichting: erfgoed.toelichting,
      positief: erfgoed.score >= 70,
      bronnen: erfgoed.score < 80 ? [{
        label: "RCE Erfgoedregister",
        url: "https://erfgoedregister.cultureelerfgoed.nl",
        type: "kaart" as const,
      }] : undefined,
    },
    {
      naam: "Gemeentelijke woonvisie",
      gewicht: 4,
      score: woonvisie.score,
      toelichting: woonvisie.toelichting,
      positief: woonvisie.score >= 65,
    },
  ];

  // Gewogen gemiddelde
  const totaalGewicht = factoren.reduce((sum, f) => sum + f.gewicht, 0);
  let totaalScore = Math.round(
    factoren.reduce((sum, f) => sum + f.score * f.gewicht, 0) / totaalGewicht
  );

  // Hard blocker cap: wanneer een prohibitieve factor actief is, begrenzen we de totaalscore.
  // Een zuiver gemiddelde overschat de kans als één factor de aanvraag in de praktijk blokkeert.
  const hardBlockers: import("@/types").HardBlocker[] = []
  for (const def of HARD_BLOCKER_DEFINITIES) {
    const factor = factoren.find(f => f.naam === def.naam)
    if (factor && factor.score <= def.scoreGrens) {
      totaalScore = Math.min(totaalScore, def.maxTotaal)
      factor.isHardBlocker = true
      hardBlockers.push({ naam: factor.naam, toelichting: factor.toelichting, maxTotaal: def.maxTotaal })
    }
  }

  const scoreKlasse = scoreNaarKlasse(totaalScore);

  return { factoren, totaalScore, scoreKlasse, reedsBouwgrond, huidigeBestemming, natura2000Score: natura2000.score, precedentPlannen: precedenten.plannen, hardBlockers };
}

function scoreNaarKlasse(score: number): ScoreKlasse {
  if (score >= 80) return "ultra-hoog";
  if (score >= 65) return "hoog";
  if (score >= 45) return "gemiddeld";
  if (score >= 25) return "laag";
  return "ultra-laag";
}
