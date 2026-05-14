"use client";

import {
  Accordion,
  AccordionItem,
  Tag,
  Tile,
  StructuredListWrapper,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  InlineNotification,
} from "@carbon/react";
import {
  Flag,
  Chemistry,
  Document,
  Receipt,
  Checkmark,
  Time,
  Information,
} from "@carbon/icons-react";
import type { OnderzoekItem, KostenPost, KostenRaming } from "@/types";
import type { CarbonIconType } from "@carbon/icons-react";

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

interface Fase {
  nummer: number;
  titel: string;
  beschrijving: string;
  doorlooptijd: string;
  starter: string;
  onderzoekenCategorie: Array<"procedure" | "onderzoek" | "document" | "leges">;
  kostenCategorie: Array<"onderzoek" | "leges" | "adviseur" | "anterieur" | "overig">;
  icon: CarbonIconType;
}

const FASES: Fase[] = [
  {
    nummer: 1,
    titel: "Principeverzoek indienen bij de gemeente",
    beschrijving: "Start altijd met een principeverzoek — dit is een informeel verzoek waarbij u vraagt of de gemeente in beginsel bereid is mee te werken. Vrijwel alle gemeenten verlangen dit als eerste stap. Het voorkomt dat u duizenden euro's uitgeeft aan onderzoeken terwijl de gemeente het initiatief bij voorbaat afwijst.",
    doorlooptijd: "4–12 weken",
    starter: "U kunt direct beginnen. Gebruik de brief 'Principeverzoek' uit de sjablonen hieronder.",
    onderzoekenCategorie: ["procedure"],
    kostenCategorie: [],
    icon: Flag,
  },
  {
    nummer: 2,
    titel: "Verplichte technische onderzoeken laten uitvoeren",
    beschrijving: "Na een positief principebesluit schakelt u gecertificeerde onderzoeksbureaus in. Voer alle onderzoeken zo parallel mogelijk uit — dit bespaart 2–3 maanden doorlooptijd. De rapporten vormen de technische onderbouwing van uw aanvraag.",
    doorlooptijd: "4–12 weken (parallel uitvoeren)",
    starter: "Wacht op positief principebesluit. Vraag gelijktijdig offertes op bij meerdere gecertificeerde bureaus.",
    onderzoekenCategorie: ["onderzoek"],
    kostenCategorie: ["onderzoek"],
    icon: Chemistry,
  },
  {
    nummer: 3,
    titel: "Ruimtelijke onderbouwing & verplichte overeenkomsten",
    beschrijving: "Parallel aan de onderzoeken stelt uw RO-adviseur de ruimtelijke onderbouwing op. Tegelijkertijd sluit u de anterieure overeenkomst en planschadeovereenkomst met de gemeente. Zonder deze documenten start de gemeente de procedure niet.",
    doorlooptijd: "4–16 weken",
    starter: "Schakel een RO-adviseur in zodra de onderzoeken worden opgestart.",
    onderzoekenCategorie: ["document"],
    kostenCategorie: ["adviseur", "anterieur", "overig"],
    icon: Document,
  },
  {
    nummer: 4,
    titel: "Formele aanvraag indienen via het Omgevingsloket",
    beschrijving: "Als alle rapporten beschikbaar zijn en alle overeenkomsten getekend, dient u de formele aanvraag omgevingsplanwijziging in via omgevingsloket.nl. Bij indiening betaalt u de gemeentelijke leges — niet restitueerbaar bij afwijzing.",
    doorlooptijd: "Indiening + 26 weken beslistermijn",
    starter: "Alle rapporten gereed, ruimtelijke onderbouwing opgesteld, overeenkomsten ondertekend.",
    onderzoekenCategorie: ["leges"],
    kostenCategorie: ["leges"],
    icon: Receipt,
  },
  {
    nummer: 5,
    titel: "Terinzagelegging, zienswijzen & vaststelling",
    beschrijving: "De gemeente legt het ontwerpbesluit 6 weken ter inzage. Omwonenden kunnen zienswijzen indienen. Daarna besluit B&W of de gemeenteraad over vaststelling. Beroep bij de Afdeling bestuursrechtspraak van de Raad van State is daarna mogelijk.",
    doorlooptijd: "6–26 weken na indiening",
    starter: "Geen actie vereist, tenzij zienswijzen worden ingediend die een reactie vergen.",
    onderzoekenCategorie: [],
    kostenCategorie: [],
    icon: Checkmark,
  },
];

const RISICO_TAG: Record<string, { type: "red" | "warm-gray" | "green" | "teal"; label: string }> = {
  laag:     { type: "green",     label: "Laag risico" },
  gemiddeld:{ type: "warm-gray", label: "Let op" },
  hoog:     { type: "red",       label: "Hoog risico" },
  kritiek:  { type: "red",       label: "Kritiek" },
};

interface Props {
  onderzoeken: OnderzoekItem[];
  kostenRaming: KostenRaming;
}

export function ActiePlan({ onderzoeken, kostenRaming }: Props) {
  function getOnderzoeken(fase: Fase): OnderzoekItem[] {
    return onderzoeken.filter((o) => {
      const cat = (o.categorie ?? "onderzoek") as Fase["onderzoekenCategorie"][number];
      return fase.onderzoekenCategorie.includes(cat);
    });
  }
  function getKosten(fase: Fase): KostenPost[] {
    return kostenRaming.posten.filter((p) => fase.kostenCategorie.includes(p.categorie));
  }
  function faseTotaal(fase: Fase) {
    const k = getKosten(fase);
    if (!k.length) return null;
    return { min: k.reduce((s, x) => s + x.bedragMin, 0), max: k.reduce((s, x) => s + x.bedragMax, 0) };
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>Actieplan</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem" }}>
          Van principeverzoek tot vaststelling — per stap de verplichte onderzoeken, kosten en wat u nodig heeft om te beginnen
        </p>
      </div>

      <Accordion>
        {FASES.map((fase) => {
          const Icon = fase.icon;
          const faseOnderzoeken = getOnderzoeken(fase);
          const faseKosten = getKosten(fase);
          const totaal = faseTotaal(fase);
          const verplicht = faseOnderzoeken.filter((o) => o.verplicht);
          const aanbevolen = faseOnderzoeken.filter((o) => !o.verplicht);

          const titel = (
            <span style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                backgroundColor: "var(--cds-interactive, #0f62fe)", color: "#fff",
                fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
              }}>
                {fase.nummer}
              </span>
              <Icon size={16} style={{ flexShrink: 0, color: "var(--cds-text-secondary, #525252)" }} />
              <span style={{ fontWeight: 600 }}>{fase.titel}</span>
              {totaal && (
                <Tag type="gray" size="sm" style={{ marginLeft: "0.25rem" }}>
                  {eur(totaal.min)} – {eur(totaal.max)}
                </Tag>
              )}
            </span>
          );

          return (
            <AccordionItem key={fase.nummer} title={titel} open={fase.nummer === 1}>

              {/* Wat moet je doen */}
              <div style={{ marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
                  Wat moet je doen?
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.6 }}>{fase.beschrijving}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem", color: "var(--cds-text-secondary, #525252)", fontSize: "0.8125rem" }}>
                  <Time size={14} />
                  <span>{fase.doorlooptijd}</span>
                </div>
              </div>

              {/* Verplichte onderzoeken */}
              {(verplicht.length > 0 || aanbevolen.length > 0) && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
                    Verplichte stappen & onderzoeken
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {verplicht.map((o) => <OnderzoekRij key={o.naam} item={o} />)}
                    {aanbevolen.length > 0 && (
                      <>
                        <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
                          Mogelijk ook vereist
                        </p>
                        {aanbevolen.map((o) => <OnderzoekRij key={o.naam} item={o} dimmed />)}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Kosten */}
              {faseKosten.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
                    Kosten in deze fase
                  </p>
                  <StructuredListWrapper>
                    <StructuredListBody>
                      {faseKosten.map((post) => (
                        <StructuredListRow key={post.naam}>
                          <StructuredListCell>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{post.naam}</span>
                            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", marginTop: "0.125rem" }}>{post.beschrijving}</p>
                          </StructuredListCell>
                          <StructuredListCell noWrap>
                            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{eur(post.bedragMin)}</span>
                            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>tot {eur(post.bedragMax)}</p>
                          </StructuredListCell>
                        </StructuredListRow>
                      ))}
                      {totaal && faseKosten.length > 1 && (
                        <StructuredListRow>
                          <StructuredListCell>
                            <span style={{ fontWeight: 700 }}>Subtotaal fase {fase.nummer}</span>
                          </StructuredListCell>
                          <StructuredListCell noWrap>
                            <span style={{ fontWeight: 700 }}>{eur(totaal.min)} – {eur(totaal.max)}</span>
                          </StructuredListCell>
                        </StructuredListRow>
                      )}
                    </StructuredListBody>
                  </StructuredListWrapper>
                </div>
              )}

              {/* Starter info */}
              <InlineNotification
                kind="info"
                title="Wat heb je nodig om te beginnen?"
                subtitle={fase.starter}
                hideCloseButton
                lowContrast
              />
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Totaalkosten */}
      <Tile style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: "1rem" }}>Totaal geschatte kosten</p>
          <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>Indicatief — exclusief grondkosten en bouwkosten</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{eur(kostenRaming.totaalMin)}</p>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>tot {eur(kostenRaming.totaalMax)}</p>
        </div>
      </Tile>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
        <Information size={14} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
        <p>Bedragen zijn indicatief op basis van marktprijzen 2024–2025. Leges en anterieure bijdragen variëren sterk per gemeente. Laat een RO-adviseur een projectspecifieke begroting opstellen.</p>
      </div>
    </div>
  );
}

function OnderzoekRij({ item, dimmed = false }: { item: OnderzoekItem; dimmed?: boolean }) {
  const risico = RISICO_TAG[item.risico] ?? RISICO_TAG.gemiddeld;
  const kostenNul = item.kostenMin === 0 && item.kostenMax === 0;
  return (
    <div style={{
      padding: "0.75rem",
      backgroundColor: dimmed ? "var(--cds-layer-02, #e0e0e0)" : "var(--cds-layer-01, #f4f4f4)",
      borderLeft: `3px solid ${risico.type === "red" ? "#da1e28" : risico.type === "green" ? "#24a148" : "#8d8d8d"}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.naam}</span>
        <Tag type={risico.type} size="sm">{risico.label}</Tag>
        {item.verplicht && <Tag type="blue" size="sm">Verplicht</Tag>}
      </div>
      <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem", lineHeight: 1.45 }}>{item.toelichting}</p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.375rem", fontSize: "0.8125rem", color: "var(--cds-text-secondary)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Time size={12} /> {item.doorlooptijd}
        </span>
        {!kostenNul && (
          <span style={{ fontWeight: 600, color: "var(--cds-text-primary)" }}>
            {item.kostenMin === item.kostenMax ? eur(item.kostenMin) : `${eur(item.kostenMin)} – ${eur(item.kostenMax)}`}
          </span>
        )}
      </div>
    </div>
  );
}
