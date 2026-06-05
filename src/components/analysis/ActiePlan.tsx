"use client";

import { useState, useEffect } from "react";
import {
  Flag, Chemistry, Document, Receipt, Checkmark,
  Time, ChevronDown, ChevronUp,
  CheckmarkFilled, InProgress, Pending, MisuseOutline,
  Information,
} from "@carbon/icons-react";
import type { OnderzoekItem, KostenPost, KostenRaming, TrackerStatus } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eur(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<TrackerStatus, {
  label: string;
  kleur: string;
  bg: string;
  Icon: typeof Pending;
}> = {
  "te-doen":     { label: "Te doen",     kleur: "#8d8d8d", bg: "#f4f4f4", Icon: Pending },
  "loopt":       { label: "Bezig",       kleur: "#0f62fe", bg: "#edf5ff", Icon: InProgress },
  "gedaan":      { label: "Gedaan",      kleur: "#24a148", bg: "#defbe6", Icon: CheckmarkFilled },
  "geblokkeerd": { label: "Geblokkeerd", kleur: "#da1e28", bg: "#fff1f1", Icon: MisuseOutline },
};

const STATUS_VOLGORDE: TrackerStatus[] = ["te-doen", "loopt", "gedaan", "geblokkeerd"];

const RISICO_KLEUR: Record<string, string> = {
  laag: "#24a148", gemiddeld: "#b28600", hoog: "#da1e28", kritiek: "#da1e28",
};

// ─── Fase definitie ────────────────────────────────────────────────────────────

interface Fase {
  nummer: number;
  titel: string;
  uitlegKort: string;
  beschrijving: string;
  doorlooptijd: string;
  starter: string;
  onderzoekenCategorie: Array<"procedure" | "onderzoek" | "document" | "leges">;
  kostenCategorie: Array<"onderzoek" | "leges" | "adviseur" | "anterieur" | "overig">;
  icon: typeof Flag;
}

const FASES: Fase[] = [
  {
    nummer: 1, icon: Flag,
    titel: "Principeverzoek indienen",
    uitlegKort: "Gratis eerste check — vraag de gemeente of ze in principe mee willen werken",
    beschrijving: "Start met een informeel principeverzoek aan de gemeente — dit is de vraag of zij in beginsel bereid zijn mee te werken. Vrijwel alle gemeenten verlangen dit als eerste stap. Het voorkomt dat u duizenden euro's uitgeeft aan onderzoeken terwijl de gemeente het initiatief bij voorbaat afwijst.",
    doorlooptijd: "4–12 weken",
    starter: "U kunt direct beginnen. Gebruik de 'Principeverzoek' brief uit de sjablonen onderaan.",
    onderzoekenCategorie: ["procedure"],
    kostenCategorie: [],
  },
  {
    nummer: 2, icon: Chemistry,
    titel: "Verplichte technische onderzoeken",
    uitlegKort: "Laat gecertificeerde bureaus uw perceel doorlichten op bodem, natuur en milieu",
    beschrijving: "Na een positief principebesluit schakelt u gecertificeerde onderzoeksbureaus in. Voer alle onderzoeken zo parallel mogelijk uit — dit bespaart 2–3 maanden doorlooptijd. De rapporten vormen de technische onderbouwing van uw aanvraag.",
    doorlooptijd: "4–12 weken (parallel uitvoeren)",
    starter: "Wacht op positief principebesluit. Vraag gelijktijdig offertes op bij meerdere gecertificeerde bureaus.",
    onderzoekenCategorie: ["onderzoek"],
    kostenCategorie: ["onderzoek"],
  },
  {
    nummer: 3, icon: Document,
    titel: "Ruimtelijke onderbouwing & overeenkomsten",
    uitlegKort: "Officieel dossier samenstellen en kostenverdeling vastleggen met de gemeente",
    beschrijving: "Parallel aan de onderzoeken stelt uw RO-adviseur de ruimtelijke onderbouwing op. Tegelijkertijd sluit u de anterieure overeenkomst en planschadeovereenkomst met de gemeente. Zonder deze documenten start de gemeente de procedure niet.",
    doorlooptijd: "4–16 weken",
    starter: "Schakel een RO-adviseur in zodra de onderzoeken worden opgestart.",
    onderzoekenCategorie: ["document"],
    kostenCategorie: ["adviseur", "anterieur", "overig"],
  },
  {
    nummer: 4, icon: Receipt,
    titel: "Formele aanvraag indienen",
    uitlegKort: "Het officiële verzoek indienen via omgevingsloket.nl — leges betalen en wachten op besluit",
    beschrijving: "Als alle rapporten beschikbaar zijn en alle overeenkomsten getekend, dient u de formele aanvraag omgevingsplanwijziging in via omgevingsloket.nl. Bij indiening betaalt u de gemeentelijke leges — niet restitueerbaar bij afwijzing.",
    doorlooptijd: "Indiening + 26 weken beslistermijn",
    starter: "Alle rapporten gereed, ruimtelijke onderbouwing opgesteld, overeenkomsten ondertekend.",
    onderzoekenCategorie: ["leges"],
    kostenCategorie: ["leges"],
  },
  {
    nummer: 5, icon: Checkmark,
    titel: "Terinzagelegging & vaststelling",
    uitlegKort: "6 weken inzageperiode voor buren, daarna definitief besluit door gemeente",
    beschrijving: "De gemeente legt het ontwerpbesluit 6 weken ter inzage. Omwonenden kunnen zienswijzen indienen. Daarna besluit B&W of de gemeenteraad over vaststelling. Beroep bij de Raad van State is daarna mogelijk.",
    doorlooptijd: "6–26 weken na indiening",
    starter: "Geen actie vereist, tenzij zienswijzen worden ingediend die een reactie vergen.",
    onderzoekenCategorie: [],
    kostenCategorie: [],
  },
];

// ─── Voortgangsbalk ────────────────────────────────────────────────────────────

function VoortgangsBalk({ faseTracker }: { faseTracker: Record<number, TrackerStatus> }) {
  const gedaan = FASES.filter((f) => faseTracker[f.nummer] === "gedaan").length;
  const actief = FASES.find((f) => faseTracker[f.nummer] === "loopt");
  const pct = Math.round((gedaan / FASES.length) * 100);

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)" }}>
          {gedaan === FASES.length
            ? "Traject afgerond"
            : actief
            ? `Actief in fase ${actief.nummer}`
            : "Nog niet gestart"}
        </span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: pct === 100 ? "#24a148" : "var(--cds-text-primary, #161616)" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: "4px", backgroundColor: "#e0e0e0", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: pct === 100 ? "#24a148" : "#0f62fe", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ─── Onderzoek rij ──────────────────────────────────────────────────────────

function OnderzoekRij({
  item,
  status,
  onSet,
}: {
  item: OnderzoekItem;
  status: TrackerStatus;
  onSet: (s: TrackerStatus) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const cfg = STATUS[status];
  const risicoKleur = RISICO_KLEUR[item.risico] ?? "#8d8d8d";
  const kostenNul = item.kostenMin === 0 && item.kostenMax === 0;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.75rem",
      padding: "0.75rem 0",
      borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      opacity: status === "gedaan" ? 0.6 : 1,
    }}>
      {/* Status badge — klik om te wisselen */}
      <div style={{ position: "relative", flexShrink: 0, marginTop: "0.1rem" }}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          title={`Status: ${cfg.label} — klik om te wijzigen`}
          style={{
            width: "1.625rem", height: "1.625rem", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${cfg.kleur}`,
            backgroundColor: cfg.bg,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <cfg.Icon size={12} style={{ color: cfg.kleur }} />
        </button>

        {showMenu && (
          <div style={{
            position: "absolute", top: "calc(100% + 0.375rem)", left: 0, zIndex: 100,
            backgroundColor: "#ffffff",
            border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: "9rem",
          }}>
            {STATUS_VOLGORDE.map((s) => {
              const c = STATUS[s];
              return (
                <button
                  key={s}
                  onClick={() => { onSet(s); setShowMenu(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.5rem 0.75rem", fontSize: "0.8125rem", cursor: "pointer",
                    border: "none",
                    backgroundColor: s === status ? c.bg : "transparent",
                    color: s === status ? c.kleur : "var(--cds-text-primary, #161616)",
                    fontWeight: s === status ? 600 : 400,
                    textAlign: "left",
                  }}
                >
                  <c.Icon size={14} style={{ color: c.kleur, flexShrink: 0 }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inhoud */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.875rem", fontWeight: 500,
            textDecoration: status === "gedaan" ? "line-through" : "none",
            color: "var(--cds-text-primary, #161616)",
          }}>
            {item.naam}
          </span>
          {item.verplicht && (
            <span style={{ fontSize: "0.6875rem", padding: "0.125rem 0.375rem", backgroundColor: "#edf5ff", color: "#0043ce", fontWeight: 600 }}>
              Verplicht
            </span>
          )}
          <span style={{ fontSize: "0.6875rem", padding: "0.125rem 0.375rem", backgroundColor: risicoKleur + "18", color: risicoKleur, fontWeight: 600 }}>
            {item.risico.charAt(0).toUpperCase() + item.risico.slice(1)} risico
          </span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem", lineHeight: 1.5 }}>
          {item.toelichting}
        </p>
        <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.375rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Time size={12} /> {item.doorlooptijd}
          </span>
          {!kostenNul && (
            <span style={{ fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>
              {item.kostenMin === item.kostenMax ? eur(item.kostenMin) : `${eur(item.kostenMin)} – ${eur(item.kostenMax)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fase rij ──────────────────────────────────────────────────────────────────

function FaseRij({
  fase,
  faseStatus,
  onderzoeken,
  kosten,
  onderzoekenTracker,
  onFaseChange,
  onOnderzoekenSet,
}: {
  fase: Fase;
  faseStatus: TrackerStatus;
  onderzoeken: OnderzoekItem[];
  kosten: KostenPost[];
  onderzoekenTracker: Record<string, TrackerStatus>;
  onFaseChange: (s: TrackerStatus) => void;
  onOnderzoekenSet: (naam: string, s: TrackerStatus) => void;
}) {
  const [open, setOpen] = useState(faseStatus === "loopt");
  const cfg = STATUS[faseStatus];
  const Icon = fase.icon;
  const totaal = kosten.length
    ? { min: kosten.reduce((s, k) => s + k.bedragMin, 0), max: kosten.reduce((s, k) => s + k.bedragMax, 0) }
    : null;

  const verplicht = onderzoeken.filter((o) => o.verplicht);
  const optioneel = onderzoeken.filter((o) => !o.verplicht);

  return (
    <div style={{
      borderRadius: "2px",
      border: open ? "1px solid #0f62fe" : "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      marginBottom: "0.75rem",
      transition: "border-color 0.2s",
      backgroundColor: "#ffffff",
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.875rem",
          padding: "1rem 1.25rem",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Status cirkel */}
        <div style={{
          width: "2rem", height: "2rem", borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: faseStatus === "te-doen" ? "#f4f4f4" : cfg.kleur,
          border: `2px solid ${faseStatus === "te-doen" ? "#c6c6c6" : cfg.kleur}`,
          transition: "all 0.25s",
        }}>
          {faseStatus === "gedaan"
            ? <CheckmarkFilled size={14} style={{ color: "#fff" }} />
            : faseStatus !== "te-doen"
            ? <cfg.Icon size={14} style={{ color: "#fff" }} />
            : <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8d8d8d" }}>{fase.nummer}</span>
          }
        </div>

        {/* Titel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <Icon size={15} style={{ color: "var(--cds-text-secondary, #525252)", flexShrink: 0 }} />
            <span style={{
              fontSize: "0.9375rem", fontWeight: 600,
              color: faseStatus === "gedaan" ? "var(--cds-text-secondary, #525252)" : "var(--cds-text-primary, #161616)",
              textDecoration: faseStatus === "gedaan" ? "line-through" : "none",
            }}>
              {fase.titel}
            </span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.125rem", lineHeight: 1.4 }}>
            {fase.uitlegKort}
          </p>
          <div style={{ display: "flex", gap: "0.875rem", marginTop: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              fontSize: "0.75rem", fontWeight: 600, padding: "0.125rem 0.5rem",
              backgroundColor: cfg.bg, color: cfg.kleur,
            }}>
              {cfg.label}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>
              <Time size={12} /> {fase.doorlooptijd}
            </span>
            {totaal && faseStatus !== "gedaan" && (
              <span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>
                {eur(totaal.min)} – {eur(totaal.max)}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div style={{ color: "var(--cds-text-secondary, #525252)", flexShrink: 0 }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: "0 1.25rem 1.25rem" }}>
          <div style={{ borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)", paddingTop: "1rem" }}>

            {/* Beschrijving */}
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              {fase.beschrijving}
            </p>

            {/* Onderzoeken */}
            {(verplicht.length > 0 || optioneel.length > 0) && (
              <div style={{ marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
                  Stappen & onderzoeken
                </p>
                {verplicht.map((o) => (
                  <OnderzoekRij
                    key={o.naam}
                    item={o}
                    status={onderzoekenTracker[o.naam] ?? "te-doen"}
                    onSet={(s) => onOnderzoekenSet(o.naam, s)}
                  />
                ))}
                {optioneel.length > 0 && (
                  <>
                    <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cds-text-secondary, #525252)", marginTop: "0.875rem", marginBottom: "0.25rem" }}>
                      Mogelijk ook vereist
                    </p>
                    {optioneel.map((o) => (
                      <OnderzoekRij
                        key={o.naam}
                        item={o}
                        status={onderzoekenTracker[o.naam] ?? "te-doen"}
                        onSet={(s) => onOnderzoekenSet(o.naam, s)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Kosten */}
            {kosten.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
                  Kosten in deze fase
                </p>
                <div style={{ border: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
                  {kosten.map((post, i) => (
                    <div key={post.naam} style={{
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
                      padding: "0.625rem 0.875rem",
                      borderBottom: i < kosten.length - 1 ? "1px solid var(--cds-border-subtle-00, #e0e0e0)" : "none",
                      backgroundColor: i % 2 === 0 ? "#ffffff" : "var(--cds-layer-01, #f4f4f4)",
                    }}>
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>{post.naam}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.125rem" }}>{post.beschrijving}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: 700 }}>{eur(post.bedragMin)}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>tot {eur(post.bedragMax)}</p>
                      </div>
                    </div>
                  ))}
                  {totaal && kosten.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.625rem 0.875rem", backgroundColor: "var(--cds-layer-02, #e0e0e0)" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>Subtotaal fase {fase.nummer}</span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{eur(totaal.min)} – {eur(totaal.max)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Startconditie */}
            <div style={{ display: "flex", gap: "0.625rem", padding: "0.75rem", backgroundColor: "var(--cds-layer-01, #f4f4f4)", marginBottom: "1.25rem" }}>
              <Information size={16} style={{ color: "#0f62fe", flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--cds-text-primary, #161616)" }}>Wanneer beginnen? </strong>
                {fase.starter}
              </p>
            </div>

            {/* Fase status knoppen */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginRight: "0.25rem" }}>
                Markeer fase:
              </span>
              {STATUS_VOLGORDE.map((s) => {
                const c = STATUS[s];
                const actief = faseStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => onFaseChange(s)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.375rem",
                      padding: "0.375rem 0.75rem", fontSize: "0.8125rem", cursor: "pointer",
                      border: `1.5px solid ${actief ? c.kleur : "var(--cds-border-subtle-01, #c6c6c6)"}`,
                      backgroundColor: actief ? c.bg : "transparent",
                      color: actief ? c.kleur : "var(--cds-text-secondary, #525252)",
                      fontWeight: actief ? 700 : 400,
                    }}
                  >
                    <c.Icon size={13} style={{ color: c.kleur }} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hoofd-component ──────────────────────────────────────────────────────────

interface Props {
  onderzoeken: OnderzoekItem[];
  kostenRaming: KostenRaming;
  analyseId?: string;
}

export function ActiePlan({ onderzoeken, kostenRaming, analyseId }: Props) {
  const [faseTracker, setFaseTracker] = useState<Record<number, TrackerStatus>>(
    () => Object.fromEntries(FASES.map((f) => [f.nummer, f.nummer === 1 ? "loopt" : "te-doen"]))
  );
  const [onderzoekenTracker, setOnderzoekenTracker] = useState<Record<string, TrackerStatus>>({});

  const sleutelFasen = analyseId ? `tracker_actie_${analyseId}` : null;
  const sleutelOnderzoeken = analyseId ? `tracker_onderzoeken_${analyseId}` : null;

  useEffect(() => {
    if (sleutelFasen) {
      const saved = localStorage.getItem(sleutelFasen);
      if (saved) { try { setFaseTracker(JSON.parse(saved)); } catch { /* keep default */ } }
    }
    if (sleutelOnderzoeken) {
      const saved = localStorage.getItem(sleutelOnderzoeken);
      if (saved) { try { setOnderzoekenTracker(JSON.parse(saved)); } catch { /* keep default */ } }
    }
  }, [sleutelFasen, sleutelOnderzoeken]);

  function setFaseStatus(faseNummer: number, status: TrackerStatus) {
    const nieuwFasen = { ...faseTracker, [faseNummer]: status };
    setFaseTracker(nieuwFasen);
    if (sleutelFasen) localStorage.setItem(sleutelFasen, JSON.stringify(nieuwFasen));

    // Bij 'gedaan' of 'te-doen': alle onderzoeken binnen deze fase meenemen
    if (status === "gedaan" || status === "te-doen") {
      const fase = FASES.find((f) => f.nummer === faseNummer);
      if (fase) {
        const faseOnderzoeken = getOnderzoeken(fase);
        if (faseOnderzoeken.length > 0) {
          const nieuwOnderzoeken = { ...onderzoekenTracker };
          faseOnderzoeken.forEach((o) => { nieuwOnderzoeken[o.naam] = status; });
          setOnderzoekenTracker(nieuwOnderzoeken);
          if (sleutelOnderzoeken) localStorage.setItem(sleutelOnderzoeken, JSON.stringify(nieuwOnderzoeken));
        }
      }
    }
  }

  function getOnderzoeken(fase: Fase): OnderzoekItem[] {
    return onderzoeken.filter((o) =>
      fase.onderzoekenCategorie.includes((o.categorie ?? "onderzoek") as Fase["onderzoekenCategorie"][number])
    );
  }

  function setOnderzoekenStatus(naam: string, status: TrackerStatus) {
    const nieuwOnderzoeken = { ...onderzoekenTracker, [naam]: status };
    setOnderzoekenTracker(nieuwOnderzoeken);
    if (sleutelOnderzoeken) localStorage.setItem(sleutelOnderzoeken, JSON.stringify(nieuwOnderzoeken));

    // Fase-status afleiden op basis van bijgewerkte onderzoeken
    const nieuwFasen = { ...faseTracker };
    FASES.forEach((fase) => {
      const faseOnderzoeken = getOnderzoeken(fase);
      if (faseOnderzoeken.length === 0) return;

      const statuses = faseOnderzoeken.map((o) => nieuwOnderzoeken[o.naam] ?? "te-doen");
      const allGedaan = statuses.every((s) => s === "gedaan");
      const anyLoopt = statuses.some((s) => s === "loopt");

      if (allGedaan) {
        nieuwFasen[fase.nummer] = "gedaan";
      } else if (anyLoopt) {
        // Niet overschrijven als de gebruiker 'geblokkeerd' heeft gezet
        if (nieuwFasen[fase.nummer] !== "geblokkeerd") {
          nieuwFasen[fase.nummer] = "loopt";
        }
      } else if (nieuwFasen[fase.nummer] === "gedaan") {
        // Was auto-gedaan maar niet meer alle items gedaan → zet terug op bezig
        nieuwFasen[fase.nummer] = "loopt";
      }
    });
    setFaseTracker(nieuwFasen);
    if (sleutelFasen) localStorage.setItem(sleutelFasen, JSON.stringify(nieuwFasen));
  }
  function getKosten(fase: Fase): KostenPost[] {
    return kostenRaming.posten.filter((p) => fase.kostenCategorie.includes(p.categorie));
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>
          Actieplan & voortgang
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem" }}>
          Van principeverzoek tot vaststelling — markeer fasen en individuele stappen om uw voortgang bij te houden
        </p>
      </div>

      <VoortgangsBalk faseTracker={faseTracker} />

      {FASES.map((fase) => (
        <FaseRij
          key={fase.nummer}
          fase={fase}
          faseStatus={faseTracker[fase.nummer] ?? "te-doen"}
          onderzoeken={getOnderzoeken(fase)}
          kosten={getKosten(fase)}
          onderzoekenTracker={onderzoekenTracker}
          onFaseChange={(s) => setFaseStatus(fase.nummer, s)}
          onOnderzoekenSet={setOnderzoekenStatus}
        />
      ))}

      {/* Kostentotaal */}
      <div style={{
        marginTop: "0.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 1.25rem", flexWrap: "wrap", gap: "0.75rem",
        border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        backgroundColor: "var(--cds-layer-01, #f4f4f4)",
      }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Totaal geschatte kosten</p>
          <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.125rem" }}>Indicatief — exclusief grondkosten en bouwkosten</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "1.375rem", fontWeight: 700 }}>{eur(kostenRaming.totaalMin)}</p>
          <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)" }}>tot {eur(kostenRaming.totaalMax)}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.625rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>
        <Information size={14} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
        <p>Bedragen indicatief op basis van marktprijzen 2024–2025. Leges en anterieure bijdragen variëren sterk per gemeente. Laat een RO-adviseur een projectspecifieke begroting opstellen.</p>
      </div>
    </div>
  );
}
