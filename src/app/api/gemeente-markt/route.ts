import { NextRequest, NextResponse } from "next/server";
import type { GemeenteMarktData } from "@/types";

// CBS 83913NED: Bestaande koopwoningen; verkoopprijzen en volumes, per gemeente per kwartaal
const CBS_BASE = "https://opendata.cbs.nl/ODataApi/OData/83913NED";

// Ruim bereik zodat we altijd de meest recente beschikbare data vinden
const KWARTALEN = [
  "2025KW01", "2025KW02", "2025KW03", "2025KW04",
  "2024KW01", "2024KW02", "2024KW03", "2024KW04",
  "2023KW01", "2023KW02", "2023KW03", "2023KW04",
  "2022KW01", "2022KW02", "2022KW03", "2022KW04",
];

type CBSRij = {
  Perioden: string;
  VerkochteWoningen_4: number | null;
  GemiddeldeVerkoopprijs_7: number | null;
  OntwikkelingTOVEenJaarEerder_3: number | null;
};

async function getGMCode(gemeente: string): Promise<string | null> {
  try {
    const url =
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free` +
      `?q=${encodeURIComponent(gemeente)}&fq=type:gemeente&rows=1&fl=gemeentecode`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const code: string | undefined = data.response?.docs?.[0]?.gemeentecode;
    if (!code) return null;
    return `GM${code.padStart(4, "0")}`;
  } catch {
    return null;
  }
}

function kwartaalLabel(key: string): string {
  const [jaar, kw] = key.split("KW");
  return `Q${kw} ${jaar}`;
}

export async function GET(req: NextRequest) {
  const gemeente = req.nextUrl.searchParams.get("gemeente");
  if (!gemeente) {
    return NextResponse.json({ error: "gemeente vereist" }, { status: 400 });
  }

  const gmCode = await getGMCode(gemeente);
  if (!gmCode) {
    return NextResponse.json({ error: "gemeente niet gevonden" }, { status: 404 });
  }

  const kwFilter = KWARTALEN.map((p) => `Perioden eq '${p}'`).join(" or ");
  const url =
    `${CBS_BASE}/TypedDataSet` +
    `?$filter=RegioS eq '${gmCode}' and (${kwFilter})` +
    `&$select=Perioden,VerkochteWoningen_4,GemiddeldeVerkoopprijs_7,OntwikkelingTOVEenJaarEerder_3` +
    `&$format=json`;

  let rijen: CBSRij[];
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 86400 }, // 24u cache — CBS-data wijzigt niet dagelijks
    });
    if (!res.ok) return NextResponse.json({ error: "CBS niet bereikbaar" }, { status: 502 });
    const json = await res.json();
    rijen = json.value ?? [];
  } catch {
    return NextResponse.json({ error: "CBS timeout" }, { status: 502 });
  }

  // Alleen kwartaaldata, gesorteerd van recent naar oud
  const kwartalen = rijen
    .filter((r) => r.Perioden.includes("KW"))
    .sort((a, b) => b.Perioden.localeCompare(a.Perioden));

  if (kwartalen.length === 0) {
    return NextResponse.json({ error: "geen gemeentedata in CBS" }, { status: 404 });
  }

  // Laatste 4 beschikbare kwartalen = "afgelopen jaar"
  const recent = kwartalen.slice(0, 4);

  const aantalVerkopen12m = recent.reduce((s, q) => s + (q.VerkochteWoningen_4 ?? 0), 0);

  // Gewogen gemiddelde verkoopprijs (transactieaantal als gewicht)
  const totWaarde = recent.reduce(
    (s, q) => s + (q.GemiddeldeVerkoopprijs_7 ?? 0) * (q.VerkochteWoningen_4 ?? 0),
    0
  );
  const totTrans = recent.reduce((s, q) => s + (q.VerkochteWoningen_4 ?? 0), 0);
  const gemiddeldeVerkoopprijs = totTrans > 0 ? Math.round(totWaarde / totTrans) : 0;

  // Gemiddelde jaar-op-jaar trend over de laatste 4 kwartalen
  const trendWaarden = recent
    .map((q) => q.OntwikkelingTOVEenJaarEerder_3)
    .filter((v): v is number => v !== null);
  const trendPct =
    trendWaarden.length > 0
      ? Math.round((trendWaarden.reduce((a, b) => a + b, 0) / trendWaarden.length) * 10) / 10
      : null;

  const result: GemeenteMarktData = {
    gemeente,
    gmCode,
    aantalVerkopen12m,
    gemiddeldeVerkoopprijs,
    trendPct,
    meestRecentKwartaal: kwartalen[0].Perioden,
    meestRecentKwartaalLabel: kwartaalLabel(kwartalen[0].Perioden),
    bron: `CBS Statline 83913NED · meest recent: ${kwartaalLabel(kwartalen[0].Perioden)}`,
  };

  return NextResponse.json(result);
}
