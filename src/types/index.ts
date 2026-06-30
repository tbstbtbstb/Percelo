export type TrackerStatus = "te-doen" | "loopt" | "gedaan" | "geblokkeerd";

export interface TrackerStap {
  status: TrackerStatus;
  afgerond?: string; // ISO datum
  notitie?: string;
}

export interface TrackerState {
  stappen: Record<number, TrackerStap>; // genummerd via stap.nummer
  bijgewerktOp: string;
}

export type ScoreKlasse =
  | "ultra-hoog"
  | "hoog"
  | "gemiddeld"
  | "laag"
  | "ultra-laag";

export interface Perceel {
  adres: string;
  postcode?: string;
  gemeente?: string;
  provincie?: string;
  waterschap?: string;
  lat: number;
  lon: number;
  perceelOppervlakte?: number;
  kadastralAanduiding?: string;
  bagId?: string;
  adresseerbaarobjectId?: string;
  gekoppeldPerceel?: string[]; // Kadastrale perceel-ID's, bijv. ["VKV00-G-305"]
  bestemmingHint?: string; // doorgegeven vanuit kansrijke-percelen, slaat PDOK-lookup over
}

export interface Bron {
  label: string;
  url?: string;
  citaat?: string;
  type: "bestemmingsplan" | "wet" | "data" | "jurisprudentie" | "kaart";
}

export interface ScoreFactor {
  naam: string;
  gewicht: number; // 1-5
  score: number; // 0-100
  toelichting: string;
  positief: boolean;
  isHardBlocker?: boolean;
  bronnen?: Bron[];
}

export interface HardBlocker {
  naam: string;
  toelichting: string;
  maxTotaal: number;
}

export interface OnderzoekItem {
  naam: string;
  verplicht: boolean;
  toelichting: string;
  kostenMin: number;
  kostenMax: number;
  doorlooptijd: string;
  risico: "laag" | "gemiddeld" | "hoog" | "kritiek";
  trigger: string;
  categorie?: "onderzoek" | "procedure" | "document" | "leges";
}

export interface KostenPost {
  naam: string;
  beschrijving: string;
  bedragMin: number;
  bedragMax: number;
  categorie: "onderzoek" | "leges" | "adviseur" | "anterieur" | "overig";
}

export interface KostenRaming {
  posten: KostenPost[];
  totaalMin: number;
  totaalMax: number;
}

export interface OpdrachtBrief {
  onderzoekNaam: string;
  ontvangerType: "bureau" | "waterschap" | "adviseur" | "gemeente";
  onderwerp: string;
  inhoud: string;
}

export interface WaardestijgingData {
  agrarischPrijsPerHa: number;
  bouwgrondPrijsPerM2Min: number;
  bouwgrondPrijsPerM2Max: number;
  provincie: string;
  regio: string;
  databron: string;
  conversiekostenMin: number;
  conversiekostenMax: number;
  perceelM2?: number;
  bodemtype?: string;
  afstandTotKernKm?: number;
  afstandTotKernNaam?: string;
  aanpassingsPct?: number;
  wozWaarde?: number;
  wozPeildatum?: string;
}

export interface PrecedentPlan {
  naam: string
  type: string
  datum?: string
  identificatie?: string
}

export type AdviesLabel = "go" | "twijfel" | "no-go";

export interface AdviesKaartData {
  advies: AdviesLabel;
  kernzin: string;
  kritiekeFactor: {
    titel: string;
    uitleg: string;
    precedent?: { referentie: string; omschrijving: string; uitkomst: "vergund" | "afgewezen" | "ingetrokken" };
  };
  gemeenteStrategie: { titel: string; uitleg: string };
  verborgenRisico: {
    titel: string;
    uitleg: string;
    mitigatie?: string;
  };
  dataGaps: { omschrijving: string; impact: "laag" | "gemiddeld" | "hoog" }[];
}

export interface AnalyseResultaat {
  perceel: Perceel;
  scoreKlasse: ScoreKlasse;
  totaalScore: number; // 0-100
  factoren: ScoreFactor[];
  rapport?: string; // legacy
  adviesKaart?: AdviesKaartData;
  stappenplan: Stap[];
  emailTemplates: EmailTemplate[];
  gegenereedOp: string;
  analyseId: string;
  reedsBouwgrond?: boolean;
  huidigeBestemming?: string;
  onderzoeken: OnderzoekItem[];
  kostenRaming: KostenRaming;
  opdrachtbrieven: OpdrachtBrief[];
  waardestijging: WaardestijgingData;
  precedentPlannen: PrecedentPlan[];
  hardBlockers: HardBlocker[];
}

export interface Stap {
  nummer: number;
  titel: string;
  beschrijving: string;
  doorlooptijd: string;
  risico: "laag" | "gemiddeld" | "hoog";
  vereist: boolean;
}

export interface EmailTemplate {
  type: "principeverzoek" | "informatievraag-provincie" | "vooroverleg-omgevingsdienst" | "herinnering-principeverzoek" | "afwijzing-aanvechten";
  onderwerp: string;
  ontvanger: string;
  inhoud: string;
}

export interface KansrijkPerceel {
  id: string;
  perceelId: string;
  straatAdres?: string;
  gemeente: string;
  provincie: string;
  oppervlakteM2: number;
  lat: number;
  lon: number;
  bestemming: string;
  slagingskans: number;
  geschatteAankoopprijs: number;
  bouwgrondWaardeMin: number;
  bouwgrondWaardeMax: number;
  margeMin: number;
  margeMax: number;
  roiPct?: number;
}

export interface EigenaarInfo {
  naam: string;
  type: "natuurlijk persoon" | "rechtspersoon";
  correspondentieadres: string;
  kvkNummer?: string;
}

export interface SubscriptionTier {
  naam: string;
  prijs: number;
  analysePerMaand: number | null;
  features: string[];
  aanbevolen?: boolean;
}
