import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { AnalyseResultaat } from "@/types";

// ── Branding (IBM Carbon kleuren) ─────────────────────────────────────────────
const C = {
  primary:    "#161616",
  secondary:  "#525252",
  muted:      "#8d8d8d",
  border:     "#e0e0e0",
  bg:         "#f4f4f4",
  white:      "#ffffff",
  blue:       "#0f62fe",
  blueBg:     "#edf5ff",
  green:      "#24a148",
  greenBg:    "#defbe6",
  yellow:     "#b28600",
  yellowBg:   "#fdf6dd",
  red:        "#da1e28",
  redBg:      "#fff1f1",
  headerBg:   "#161616",
};

const SCORE_CFG: Record<string, { tekst: string; bg: string; label: string }> = {
  "ultra-hoog": { tekst: C.green,  bg: C.greenBg,  label: "Ultra Hoog" },
  "hoog":       { tekst: C.green,  bg: C.greenBg,  label: "Hoog" },
  "gemiddeld":  { tekst: C.yellow, bg: C.yellowBg, label: "Gemiddeld" },
  "laag":       { tekst: C.yellow, bg: C.yellowBg, label: "Laag" },
  "ultra-laag": { tekst: C.red,    bg: C.redBg,    label: "Ultra Laag" },
};

const ADVIES_CFG: Record<string, { tekst: string; bg: string; accentBg: string; label: string }> = {
  "go":      { tekst: "#0e6027", bg: "#f0fdf4", accentBg: C.green,  label: "Kansrijk" },
  "twijfel": { tekst: "#7d4300", bg: "#fffbeb", accentBg: "#f1c21b", label: "Twijfelgeval" },
  "no-go":   { tekst: "#750e13", bg: "#fff5f5", accentBg: C.red,    label: "Ongunstig" },
};

// ── Stijlen ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.primary,
    paddingBottom: 44,
  },

  // Header
  header: {
    backgroundColor: C.headerBg,
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerBrand: { fontSize: 8, color: C.muted, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 10 },
  headerTitel: { fontSize: 18, color: C.white, fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 3 },
  headerSub:   { fontSize: 8, color: C.muted, lineHeight: 1.5 },

  content: { paddingHorizontal: 36, paddingTop: 20 },

  // Sectiekop
  sectieKop: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted,
    letterSpacing: 0.8, textTransform: "uppercase",
    marginTop: 20, marginBottom: 8,
    paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sectieKopFirst: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted,
    letterSpacing: 0.8, textTransform: "uppercase",
    marginTop: 0, marginBottom: 8,
    paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: C.border,
  },

  // Score blok
  scoreBlok: {
    borderRadius: 6, padding: 16, marginBottom: 4,
    flexDirection: "row", alignItems: "center",
  },
  scoreLinks:  { marginRight: 20 },
  scoreGetal:  { fontSize: 42, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  scoreLabel:  { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 },
  scoreOmschrijving: { fontSize: 8, color: C.secondary, lineHeight: 1.55, flex: 1 },

  // Advies blok
  adviesBlok: {
    borderRadius: 6, padding: 14, marginBottom: 4,
    flexDirection: "row", alignItems: "flex-start",
  },
  adviesBadge: {
    fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 3, marginBottom: 6,
    alignSelf: "flex-start",
  },
  adviesKernzin: { fontSize: 10, fontFamily: "Helvetica-Bold", lineHeight: 1.4 },
  adviesMeta:    { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginBottom: 5 },

  // Info blokken (kritieke factor, gemeentestrategie, verborgen risico)
  infoBlok: {
    borderRadius: 6, padding: 12,
    backgroundColor: C.bg, marginBottom: 6,
  },
  infoLabel: {
    fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5,
    textTransform: "uppercase", marginBottom: 4,
  },
  infoTitel:  { fontSize: 9, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 3 },
  infoTekst:  { fontSize: 8, color: C.secondary, lineHeight: 1.55 },

  // Scorefactor rijen
  factorBlok: {
    paddingTop: 8, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: "row", alignItems: "flex-start",
  },
  factorDot:   { width: 6, height: 6, borderRadius: 3, marginTop: 2, marginRight: 8, flexShrink: 0 },
  factorBody:  { flex: 1 },
  factorKop:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  factorNaam:  { fontFamily: "Helvetica-Bold", fontSize: 8.5, flex: 1, marginRight: 8, lineHeight: 1.35 },
  factorScore: { fontSize: 8.5, fontFamily: "Helvetica-Bold", flexShrink: 0 },
  factorToelichting: { fontSize: 7.5, color: C.secondary, lineHeight: 1.5 },
  blockerBadge: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: C.red,
    borderWidth: 1, borderColor: C.red, borderRadius: 2,
    paddingHorizontal: 4, paddingVertical: 1, marginLeft: 4,
  },
  barTrack: { height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 4 },
  barFill:  { height: 3, borderRadius: 2 },

  // Actieplan
  faseBlok: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  faseCircle: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    marginRight: 10, flexShrink: 0,
  },
  faseNr:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white },
  faseTitel:  { fontSize: 9, fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 2 },
  faseBeschr: { fontSize: 7.5, color: C.secondary, lineHeight: 1.5, marginBottom: 2 },
  faseKosten: { fontSize: 7.5, color: C.blue, fontFamily: "Helvetica-Bold" },
  faseMeta:   { fontSize: 7, color: C.muted, marginTop: 1 },

  // Onderzoeken
  onderzBlok: {
    paddingTop: 7, paddingBottom: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: "row", alignItems: "flex-start",
  },
  onderzKleur: { width: 3, borderRadius: 2, marginRight: 8, flexShrink: 0, alignSelf: "stretch" },
  onderzNaam:  { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2, lineHeight: 1.3 },
  onderzTekst: { fontSize: 7.5, color: C.secondary, lineHeight: 1.5, marginBottom: 2 },
  onderzMeta:  { fontSize: 7, color: C.muted },

  // Kosten tabel
  kostenRij: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingTop: 7, paddingBottom: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  kostenLinks:  { flex: 1, marginRight: 12 },
  kostenNaam:   { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  kostenBeschr: { fontSize: 7.5, color: C.secondary, lineHeight: 1.45 },
  kostenBedrag: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
  kostenSub:    { fontSize: 7, color: C.muted, textAlign: "right" },
  totaalBlok:   {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.bg, borderRadius: 6, padding: 12, marginTop: 10,
  },
  totaalLabel:  { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totaalSub:    { fontSize: 7.5, color: C.secondary, marginTop: 2 },
  totaalBedrag: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right" },
  totaalMax:    { fontSize: 7.5, color: C.muted, textAlign: "right" },

  // Rapport
  rapportTekst: { fontSize: 8, color: C.secondary, lineHeight: 1.65 },

  // Data gaps
  gapRij: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  gapDot: { width: 5, height: 5, borderRadius: 3, marginRight: 7, marginTop: 2, flexShrink: 0 },
  gapTekst: { fontSize: 8, lineHeight: 1.45, flex: 1 },
  gapImpact: { fontSize: 7, fontFamily: "Helvetica-Bold", marginLeft: 4 },

  // Disclaimer
  disclaimerBlok: {
    borderRadius: 6, padding: 10, marginTop: 14,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  disclaimerTekst: { fontSize: 7, color: C.muted, lineHeight: 1.55 },

  // Footer
  footer: {
    position: "absolute", bottom: 14, left: 36, right: 36,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6,
  },
  footerTekst: { fontSize: 7, color: C.muted },
});

// ── Hulpfuncties ──────────────────────────────────────────────────────────────
function eur(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function factorKleur(score: number) {
  if (score >= 70) return C.green;
  if (score >= 40) return C.yellow;
  return C.red;
}

function risicoKleur(risico: string) {
  if (risico === "kritiek" || risico === "hoog") return C.red;
  if (risico === "gemiddeld") return C.yellow;
  return C.green;
}

function formatDatum(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

const FASE_KOSTEN_CAT: Array<Array<"onderzoek" | "leges" | "adviseur" | "anterieur" | "overig">> = [
  [],
  ["onderzoek"],
  ["adviseur", "anterieur", "overig"],
  ["leges"],
  [],
];

function PageFooter({ datum, analyseId }: { datum: string; analyseId: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTekst}>Percelo · {datum}</Text>
      <Text style={s.footerTekst} render={({ pageNumber, totalPages }) =>
        `ID ${analyseId.slice(0, 8)} · Pagina ${pageNumber} van ${totalPages}`
      } />
    </View>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────
export function AnalysePDF({ data }: { data: AnalyseResultaat }) {
  const scoreCfg = SCORE_CFG[data.scoreKlasse] ?? SCORE_CFG["gemiddeld"];
  const adviescfg = data.adviesKaart ? (ADVIES_CFG[data.adviesKaart.advies] ?? ADVIES_CFG["twijfel"]) : null;
  const datum = formatDatum(data.gegenereedOp);
  const subTitel = [data.perceel.gemeente, data.perceel.provincie].filter(Boolean).join(" · ");


  return (
    <Document
      title={`Percelo analyse — ${data.perceel.adres}`}
      author="Percelo"
      subject="Slagingskans bestemmingswijziging"
    >
      {/* ══ PAGINA 1: Score + Advies + Scorefactoren ═══════════════════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>PERCELO — BESTEMMINGSWIJZIGING ANALYSE</Text>
          <Text style={s.headerTitel}>{data.perceel.adres}</Text>
          <Text style={s.headerSub}>
            {subTitel}{"  ·  "}Analyse gegenereerd op {datum}{"  ·  "}ID: {data.analyseId.slice(0, 8)}
          </Text>
        </View>

        <View style={s.content}>
          {/* Score */}
          <View style={[s.scoreBlok, { backgroundColor: scoreCfg.bg }]}>
            <View style={s.scoreLinks}>
              <Text style={[s.scoreGetal, { color: scoreCfg.tekst }]}>{data.totaalScore}</Text>
              <Text style={[s.scoreLabel, { color: scoreCfg.tekst }]}>{scoreCfg.label}</Text>
            </View>
            <Text style={s.scoreOmschrijving}>
              Gewogen slagingskans op basis van bestemmingsplan, woningmarktdruk, provinciale omgevingsvisie,
              Natura2000 & stikstof, nutsvoorzieningen, historische precedenten, Ladder duurzame verstedelijking,
              bodemrisico, netcongestie, NNN, watertoets, leeftijd bestemmingsplan, geluidshinder, erfgoed en gemeentelijk beleid.
            </Text>
          </View>

          {/* Advies */}
          {data.adviesKaart && adviescfg && (
            <>
              <Text style={s.sectieKop}>Advies</Text>
              <View style={[s.adviesBlok, { backgroundColor: adviescfg.bg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.adviesMeta}>ADVIES</Text>
                  <View style={[s.adviesBadge, { backgroundColor: adviescfg.accentBg }]}>
                    <Text>{adviescfg.label}</Text>
                  </View>
                  <Text style={[s.adviesKernzin, { color: adviescfg.tekst }]}>
                    {data.adviesKaart.kernzin}
                  </Text>
                </View>
              </View>

              {/* Kritieke factor + gemeente-strategie naast elkaar */}
              <View style={{ flexDirection: "row", gap: 0 }}>
                <View style={[s.infoBlok, { flex: 1, marginRight: 6 }]}>
                  <Text style={[s.infoLabel, { color: C.blue }]}>Kritieke factor</Text>
                  <Text style={s.infoTitel}>{data.adviesKaart.kritiekeFactor.titel}</Text>
                  <Text style={s.infoTekst}>{data.adviesKaart.kritiekeFactor.uitleg}</Text>
                </View>
                <View style={[s.infoBlok, { flex: 1 }]}>
                  <Text style={[s.infoLabel, { color: "#8a3ffc" }]}>Gemeente-strategie</Text>
                  <Text style={s.infoTitel}>{data.adviesKaart.gemeenteStrategie.titel}</Text>
                  <Text style={s.infoTekst}>{data.adviesKaart.gemeenteStrategie.uitleg}</Text>
                </View>
              </View>

              <View style={[s.infoBlok, { borderLeftWidth: 3, borderLeftColor: C.red }]}>
                <Text style={[s.infoLabel, { color: C.red }]}>Verborgen risico</Text>
                <Text style={s.infoTitel}>{data.adviesKaart.verborgenRisico.titel}</Text>
                <Text style={s.infoTekst}>{data.adviesKaart.verborgenRisico.uitleg}</Text>
                {data.adviesKaart.verborgenRisico.mitigatie && (
                  <Text style={[s.infoTekst, { marginTop: 5, color: C.primary, fontFamily: "Helvetica-Bold" }]}>
                    Actie: {data.adviesKaart.verborgenRisico.mitigatie}
                  </Text>
                )}
              </View>

              {data.adviesKaart.dataGaps.length > 0 && (
                <View style={[s.infoBlok, { marginBottom: 0 }]}>
                  <Text style={[s.infoLabel, { color: C.secondary }]}>Ontbrekende informatie</Text>
                  {data.adviesKaart.dataGaps.map((gap, i) => (
                    <View key={i} style={s.gapRij}>
                      <View style={[s.gapDot, { backgroundColor: gap.impact === "hoog" ? C.red : gap.impact === "gemiddeld" ? C.yellow : C.muted }]} />
                      <Text style={s.gapTekst}>
                        {gap.omschrijving}
                        {"  "}
                        <Text style={[s.gapImpact, { color: gap.impact === "hoog" ? C.red : gap.impact === "gemiddeld" ? C.yellow : C.muted }]}>
                          {gap.impact.charAt(0).toUpperCase() + gap.impact.slice(1)} impact
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Scorefactoren */}
          <Text style={s.sectieKop}>Scorefactoren</Text>
          {data.factoren.map((f) => (
            <View key={f.naam} style={s.factorBlok}>
              <View style={[s.factorDot, { backgroundColor: factorKleur(f.score) }]} />
              <View style={s.factorBody}>
                <View style={s.factorKop}>
                  <Text style={s.factorNaam}>
                    {f.naam}
                    {f.isHardBlocker ? "  [BLOCKER]" : ""}
                  </Text>
                  <Text style={[s.factorScore, { color: factorKleur(f.score) }]}>{f.score}/100</Text>
                </View>
                <Text style={s.factorToelichting}>{f.toelichting}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${f.score}%`, backgroundColor: factorKleur(f.score) }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <PageFooter datum={datum} analyseId={data.analyseId} />
      </Page>

      {/* ══ PAGINA 2: Actieplan + Kostenoverzicht ══════════════════════════ */}
      <Page size="A4" style={s.page}>
        <View style={[s.header, { paddingTop: 18, paddingBottom: 14 }]}>
          <Text style={s.headerBrand}>PERCELO — ACTIEPLAN & KOSTENOVERZICHT</Text>
          <Text style={[s.headerSub, { color: C.muted, marginTop: 4 }]}>{data.perceel.adres} · {subTitel}</Text>
        </View>

        <View style={s.content}>
          <Text style={s.sectieKopFirst}>Actieplan</Text>

          {data.stappenplan.map((stap) => {
            const cats = FASE_KOSTEN_CAT[stap.nummer - 1] ?? [];
            const kosten = data.kostenRaming.posten.filter((p) => cats.includes(p.categorie));
            const kostenMin = kosten.reduce((a, k) => a + k.bedragMin, 0);
            const kostenMax = kosten.reduce((a, k) => a + k.bedragMax, 0);

            return (
              <View key={stap.nummer} style={s.faseBlok} wrap={false}>
                <View style={s.faseCircle}>
                  <Text style={s.faseNr}>{stap.nummer}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.faseTitel}>{stap.titel}</Text>
                  <Text style={s.faseBeschr}>{stap.beschrijving}</Text>
                  {kosten.length > 0 && kostenMax > 0 && (
                    <Text style={s.faseKosten}>Kosten: {eur(kostenMin)} – {eur(kostenMax)}</Text>
                  )}
                  <Text style={s.faseMeta}>
                    Doorlooptijd: {stap.doorlooptijd}{"  ·  "}Risico: {stap.risico}{"  ·  "}{stap.vereist ? "Verplichte stap" : "Optionele stap"}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Kostenoverzicht */}
          <Text style={s.sectieKop}>Kostenoverzicht</Text>
          <Text style={[s.rapportTekst, { marginBottom: 8 }]}>
            Indicatieve totaalkosten vóór bouwvergunning — exclusief grondkosten en bouwkosten
          </Text>

          {data.kostenRaming.posten.map((post) => (
            <View key={post.naam} style={s.kostenRij} wrap={false}>
              <View style={s.kostenLinks}>
                <Text style={s.kostenNaam}>{post.naam}</Text>
                <Text style={s.kostenBeschr}>{post.beschrijving}</Text>
              </View>
              <View>
                <Text style={s.kostenBedrag}>{eur(post.bedragMin)}</Text>
                <Text style={s.kostenSub}>tot {eur(post.bedragMax)}</Text>
              </View>
            </View>
          ))}

          <View style={s.totaalBlok} wrap={false}>
            <View>
              <Text style={s.totaalLabel}>Totaal geschatte kosten</Text>
              <Text style={s.totaalSub}>Indicatief, exclusief onvoorzien</Text>
            </View>
            <View>
              <Text style={s.totaalBedrag}>{eur(data.kostenRaming.totaalMin)}</Text>
              <Text style={s.totaalMax}>tot {eur(data.kostenRaming.totaalMax)}</Text>
            </View>
          </View>
        </View>

        <PageFooter datum={datum} analyseId={data.analyseId} />
      </Page>

      {/* ══ PAGINA 3: Onderzoeken + Rapport ════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <View style={[s.header, { paddingTop: 18, paddingBottom: 14 }]}>
          <Text style={s.headerBrand}>PERCELO — ONDERZOEKEN & RAPPORT</Text>
          <Text style={[s.headerSub, { color: C.muted, marginTop: 4 }]}>{data.perceel.adres} · {subTitel}</Text>
        </View>

        <View style={s.content}>
          <Text style={s.sectieKopFirst}>Benodigde onderzoeken</Text>
          <Text style={[s.rapportTekst, { marginBottom: 8 }]}>
            Overzicht van onderzoeken die nodig zijn voor de bestemmingswijziging.
          </Text>

          {data.onderzoeken.map((o, i) => (
            <View key={i} style={s.onderzBlok} wrap={false}>
              <View style={[s.onderzKleur, { backgroundColor: risicoKleur(o.risico) }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={[s.onderzNaam, { flex: 1, marginRight: 8 }]}>{o.naam}</Text>
                  <Text style={[s.onderzMeta, { textAlign: "right", flexShrink: 0 }]}>
                    {eur(o.kostenMin)}–{eur(o.kostenMax)}
                  </Text>
                </View>
                <Text style={s.onderzTekst}>{o.toelichting}</Text>
                <Text style={s.onderzMeta}>
                  {o.verplicht ? "Verplicht" : "Aanbevolen"}{"  ·  "}
                  Doorlooptijd: {o.doorlooptijd}{"  ·  "}
                  Risico: {o.risico}
                </Text>
              </View>
            </View>
          ))}

          {/* AI rapport */}
          {data.rapport && (
            <>
              <Text style={s.sectieKop}>AI Analyse rapport</Text>
              <Text style={s.rapportTekst}>{data.rapport}</Text>
            </>
          )}

          {/* Disclaimer */}
          <View style={s.disclaimerBlok}>
            <Text style={s.disclaimerTekst}>
              Dit rapport is gegenereerd door Percelo op basis van openbare ruimtelijke data (PDOK, Ruimtelijkeplannen.nl)
              en een AI-analyse. De score en berekeningen zijn indicatief en vormen geen juridisch advies.
              Raadpleeg altijd een gecertificeerd RO-adviseur voor formele besluitvorming.
              Analyse-ID: {data.analyseId} · {datum}
            </Text>
          </View>
        </View>

        <PageFooter datum={datum} analyseId={data.analyseId} />
      </Page>
    </Document>
  );
}
