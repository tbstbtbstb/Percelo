<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Responsive-first implementatieregels

Elke nieuwe feature moet vanaf het begin responsive zijn. Dit is geen optionele stap achteraf.

## Breakpoints

Gebruik altijd minimaal drie niveaus:

| Naam    | Breedte     | CSS-waarde |
|---------|-------------|------------|
| Mobiel  | < 768px     | `< 48rem`  |
| Tablet  | 768–1056px  | `48–66rem` |
| Desktop | > 1056px    | `> 66rem`  |

## Verplichte patronen

**Grids:** Gebruik altijd `repeat(auto-fit, minmax(..., 1fr))` of de `.percelo-stats-grid` CSS-klasse voor vaste aantallen kolommen. Schrijf nooit `gridTemplateColumns: "repeat(N, 1fr)"` zonder media query.

**Flex:** Voeg altijd `flexWrap: "wrap"` toe aan horizontale flex-containers die op mobiel kunnen breken.

**Breedtes:** Gebruik `maxWidth` in combinatie met `width: "100%"` — nooit alleen een vaste `width` in px.

**Knoppen:** In hero-secties altijd de klasse `percelo-hero-cta` op de flex-wrapper zodat knoppen op mobiel full-width worden.

**Tabellen:** Altijd wikkelen in een `<div className="percelo-table-wrapper">`. Gebruik `minWidth` op kolommen spaarzaam en alleen als echt nodig.

**Tekst:** Gebruik `clamp()` voor koppen: `fontSize: "clamp(1.25rem, 4vw, 2rem)"`. Lopende tekst mag een vaste rem-waarde hebben.

**Padding/spacing:** Hero-secties krijgen `padding: "3rem 1rem"` zodat ze op mobiel niet te krap zijn.

## CSS-klassen voor responsive patronen (in globals.css)

- `.percelo-stats-grid` — responsief grid: 3 col → 2 col → 1 col
- `.percelo-hero-cta` — flex-container voor hero-knoppen, stapelt op mobiel
- `.percelo-table-wrapper` — tabel-scroll-wrapper met touch-scroll
- `.percelo-hamburger` — zichtbaar onder 1056px, verborgen daarboven
- `.percelo-desktop-only` — verborgen op mobiel, zichtbaar op desktop

## Wat nooit mag

- `width: "Npx"` op containers (gebruik `rem`, `%` of `maxWidth`)
- `gridTemplateColumns: "repeat(N, 1fr)"` als inline style zonder CSS-klasse
- Vaste breedtes op flex-items die naast elkaar staan
- Tabellen zonder `percelo-table-wrapper`
- `white-space: "nowrap"` op brede tekst zonder `overflow: hidden` + `textOverflow: "ellipsis"`
