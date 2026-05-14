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
}

export interface ScoreFactor {
  naam: string;
  gewicht: number; // 1-5
  score: number; // 0-100
  toelichting: string;
  positief: boolean;
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
}

export interface PrecedentPlan {
  naam: string
  type: string
  datum?: string
}

export interface AnalyseResultaat {
  perceel: Perceel;
  scoreKlasse: ScoreKlasse;
  totaalScore: number; // 0-100
  factoren: ScoreFactor[];
  rapport: string; // AI-gegenereerde analyse
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
  type: "principeverzoek" | "informatievraag-provincie" | "vooroverleg-omgevingsdienst";
  onderwerp: string;
  ontvanger: string;
  inhoud: string;
}

export interface SubscriptionTier {
  naam: string;
  prijs: number;
  analysePerMaand: number | null;
  features: string[];
  aanbevolen?: boolean;
}
