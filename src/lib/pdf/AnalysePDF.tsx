import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { AnalyseResultaat } from "@/types";

// ── Kleuren ──────────────────────────────────────────────────────────────────
const C = {
  primary:   "#0f172a",   // slate-900
  secondary: "#475569",   // slate-600
  muted:     "#94a3b8",   // slate-400
  border:    "#e2e8f0",   // slate-200
  bg:        "#f8fafc",   // slate-50
  white:     "#ffffff",
  // Score kleuren
  emerald:   "#059669",
  green:     "#16a34a",
  yellow:    "#ca8a04",
  orange:    "#ea580c",
  red:       "#dc2626",
  emeraldBg: "#ecfdf5",
  greenBg:   "#f0fdf4",
  yellowBg:  "#fefce8",
  orangeBg:  "#fff7ed",
  redBg:     "#fef2f2",
};

const SCORE_KLEUR: Record<string, { tekst: string; achtergrond: string; label: string }> = {
  "ultra-hoog": { tekst: C.emerald, achtergrond: C.emeraldBg, label: "Ultra Hoog" },
  "hoog":       { tekst: C.green,   achtergrond: C.greenBg,   label: "Hoog" },
  "gemiddeld":  { tekst: C.yellow,  achtergrond: C.yellowBg,  label: "Gemiddeld" },
  "laag":       { tekst: C.orange,  achtergrond: C.orangeBg,  label: "Laag" },
  "ultra-laag": { tekst: C.red,     achtergrond: C.redBg,     label: "Ultra Laag" },
};

// ── Stijlen ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.primary,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 24,
  },
  headerBrand: {
    fontSize: 11,
    color: C.white,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  headerAdres: {
    fontSize: 17,
    color: C.white,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.3,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 9,
    color: "#94a3b8",
    lineHeight: 1.5,
  },

  // Inhoud
  content: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },

  // Score blok
  scoreBlok: {
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreGetal: {
    fontSize: 40,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  scoreBeschrijving: {
    fontSize: 8.5,
    color: C.secondary,
    maxWidth: 280,
    lineHeight: 1.5,
  },

  // Sectie-koppen
  sectieKop: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginBottom: 8,
    marginTop: 20,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Factoren
  factorRij: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  factorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    flexShrink: 0,
  },
  factorNaam: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    flex: 1,
  },
  factorToelichting: {
    fontSize: 7.5,
    color: C.secondary,
    marginTop: 1,
    lineHeight: 1.45,
  },
  factorScore: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    width: 38,
    textAlign: "right",
    flexShrink: 0,
  },
  // Mini progress bar
  barTrack: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    marginTop: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },

  // Rapport tekst
  rapportTekst: {
    fontSize: 8.5,
    color: C.secondary,
    lineHeight: 1.65,
  },

  // Actieplan
  faseTitel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 2,
  },
  faseBeschrijving: {
    fontSize: 8,
    color: C.secondary,
    lineHeight: 1.5,
  },
  faseKosten: {
    fontSize: 8,
    color: C.secondary,
    marginTop: 2,
  },
  faseNummer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.primary,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  faseNummerTekst: {
    color: C.white,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  faseRij: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  // Kosten tabel
  kostenRij: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  kostenNaam: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  kostenBeschrijving: {
    fontSize: 7.5,
    color: C.secondary,
    marginTop: 1,
  },
  kostenBedrag: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    width: 90,
    flexShrink: 0,
  },
  kostenSub: {
    fontSize: 7.5,
    color: C.secondary,
    textAlign: "right",
  },
  totaalBlok: {
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  totaalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  totaalBedrag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  totaalSub: {
    fontSize: 7.5,
    color: C.secondary,
    textAlign: "right",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerTekst: {
    fontSize: 7,
    color: C.muted,
  },

  // Disclaimer
  disclaimerBlok: {
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  disclaimerTekst: {
    fontSize: 7.5,
    color: C.muted,
    lineHeight: 1.5,
  },

  // Twee kolommen
  twoCol: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
});

// ── Hulpfuncties ─────────────────────────────────────────────────────────────
function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(bedrag);
}

function factorKleur(score: number): string {
  if (score >= 70) return C.green;
  if (score >= 40) return C.yellow;
  return C.red;
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const FASE_TITELS = [
  "Principeverzoek indienen",
  "Technische onderzoeken laten uitvoeren",
  "Ruimtelijke onderbouwing & overeenkomsten",
  "Formele aanvraag indienen",
  "Terinzagelegging & vaststelling",
];

const FASE_KOSTEN_CAT: Array<Array<"onderzoek" | "leges" | "adviseur" | "anterieur" | "overig">> = [
  [],
  ["onderzoek"],
  ["adviseur", "anterieur", "overig"],
  ["leges"],
  [],
];

// ── Document ─────────────────────────────────────────────────────────────────
export function AnalysePDF({ data }: { data: AnalyseResultaat }) {
  const cfg = SCORE_KLEUR[data.scoreKlasse] ?? SCORE_KLEUR["gemiddeld"];
  const datum = formatDatum(data.gegenereedOp);

  return (
    <Document
      title={`Bestemmingswijziging analyse — ${data.perceel.adres}`}
      author="BestemmingsWijziging.nl"
      subject="Analyse slagingskans bestemmingswijziging"
    >
      {/* ══ PAGINA 1: Score + Factoren ══════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerBrand}>BESTEMMINGSWIJZIGING.NL</Text>
          <Text style={s.headerAdres}>{data.perceel.adres}</Text>
          <Text style={s.headerSub}>
            {[data.perceel.gemeente, data.perceel.provincie].filter(Boolean).join(" · ")}
            {"  ·  Analyse gegenereerd op " + datum}
            {"  ·  ID: " + data.analyseId.slice(0, 8)}
          </Text>
        </View>

        <View style={s.content}>
          {/* Score blok */}
          <View style={[s.scoreBlok, { backgroundColor: cfg.achtergrond }]}>
            <View>
              <Text style={[s.scoreGetal, { color: cfg.tekst }]}>{data.totaalScore}/100</Text>
              <Text style={[s.scoreLabel, { color: cfg.tekst }]}>{cfg.label}</Text>
            </View>
            <Text style={s.scoreBeschrijving}>
              Gewogen slagingskans op basis van bestemmingsplan, woningbouwtekort, provinciale omgevingsvisie,
              Natura2000-risico, historische precedenten, Ladder duurzame verstedelijking, bodemrisico en netcongestie.
            </Text>
          </View>

          {/* Factoren */}
          <Text style={s.sectieKop}>SCOREFACTOREN</Text>
          {data.factoren.map((f) => (
            <View key={f.naam} style={s.factorRij}>
              <View style={[s.factorDot, { backgroundColor: factorKleur(f.score), marginTop: 3 }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.factorNaam}>{f.naam}</Text>
                <Text style={s.factorToelichting}>{f.toelichting}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, {
                    width: `${f.score}%`,
                    backgroundColor: factorKleur(f.score),
                  }]} />
                </View>
              </View>
              <Text style={[s.factorScore, { color: factorKleur(f.score) }]}>{f.score}/100</Text>
            </View>
          ))}

          {/* Rapport */}
          <Text style={s.sectieKop}>AI ANALYSE RAPPORT</Text>
          <Text style={s.rapportTekst}>{data.rapport}</Text>
        </View>

        <PageFooter pagina={1} datum={datum} analyseId={data.analyseId} />
      </Page>

      {/* ══ PAGINA 2: Actieplan + Kostenoverzicht ═══════════════════════════ */}
      <Page size="A4" style={s.page}>
        <View style={[s.header, { paddingTop: 20, paddingBottom: 16 }]}>
          <Text style={[s.headerBrand, { marginBottom: 0 }]}>ACTIEPLAN & KOSTENOVERZICHT</Text>
          <Text style={[s.headerSub, { marginTop: 4 }]}>{data.perceel.adres}</Text>
        </View>

        <View style={s.content}>
          <Text style={[s.sectieKop, { marginTop: 0 }]}>ACTIEPLAN — 5 FASEN</Text>

          {FASE_TITELS.map((titel, i) => {
            const nr = i + 1;
            const cats = FASE_KOSTEN_CAT[i];
            const kosten = data.kostenRaming.posten.filter((p) => cats.includes(p.categorie));
            const kostenMin = kosten.reduce((s, k) => s + k.bedragMin, 0);
            const kostenMax = kosten.reduce((s, k) => s + k.bedragMax, 0);
            const heeftKosten = kosten.length > 0 && kostenMax > 0;

            return (
              <View key={nr} style={s.faseRij}>
                <View style={s.faseNummer}>
                  <Text style={s.faseNummerTekst}>{nr}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.faseTitel}>{titel}</Text>
                  {heeftKosten && (
                    <Text style={s.faseKosten}>
                      Kosten in deze fase: {eur(kostenMin)} – {eur(kostenMax)}
                    </Text>
                  )}
                  {!heeftKosten && nr !== 5 && (
                    <Text style={s.faseKosten}>Lage of geen directe kosten</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Kostenoverzicht */}
          <Text style={s.sectieKop}>KOSTENOVERZICHT</Text>
          <Text style={[s.rapportTekst, { marginBottom: 10 }]}>
            Indicatieve totaalkosten vóór bouwvergunning — exclusief grondkosten en bouwkosten
          </Text>

          {data.kostenRaming.posten.map((post) => (
            <View key={post.naam} style={s.kostenRij}>
              <View style={{ flex: 1 }}>
                <Text style={s.kostenNaam}>{post.naam}</Text>
                <Text style={s.kostenBeschrijving}>{post.beschrijving}</Text>
              </View>
              <View>
                <Text style={s.kostenBedrag}>{eur(post.bedragMin)}</Text>
                <Text style={s.kostenSub}>tot {eur(post.bedragMax)}</Text>
              </View>
            </View>
          ))}

          <View style={s.totaalBlok}>
            <View>
              <Text style={s.totaalLabel}>Totaal geschatte kosten</Text>
              <Text style={[s.kostenBeschrijving, { marginTop: 2 }]}>Indicatief, exclusief onvoorzien</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.totaalBedrag}>{eur(data.kostenRaming.totaalMin)}</Text>
              <Text style={s.totaalSub}>tot {eur(data.kostenRaming.totaalMax)}</Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={s.disclaimerBlok}>
            <Text style={s.disclaimerTekst}>
              Dit rapport is gegenereerd door BestemmingsWijziging.nl op basis van openbare ruimtelijke data (PDOK, Ruimtelijkeplannen.nl) en een AI-analyse.
              De score en berekeningen zijn indicatief en vormen geen juridisch advies. Raadpleeg altijd een gecertificeerd RO-adviseur voor formele besluitvorming.
              Analyse-ID: {data.analyseId} · {datum}
            </Text>
          </View>
        </View>

        <PageFooter pagina={2} datum={datum} analyseId={data.analyseId} />
      </Page>
    </Document>
  );
}

function PageFooter({ pagina, datum, analyseId }: { pagina: number; datum: string; analyseId: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTekst}>BestemmingsWijziging.nl · {datum}</Text>
      <Text style={s.footerTekst}>ID {analyseId.slice(0, 8)} · Pagina {pagina}</Text>
    </View>
  );
}
