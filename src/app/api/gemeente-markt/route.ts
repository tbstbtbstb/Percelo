import { NextRequest, NextResponse } from "next/server";
import type { GemeenteMarktData } from "@/types";

// CBS 83625NED: Bestaande koopwoningen; gemiddelde verkoopprijzen per gemeente
// 728 gemeenten, jaarlijks, loopt tot 2024
const CBS_BASE = "https://opendata.cbs.nl/ODataApi/OData/83625NED";

const JAREN = ["2025JJ00", "2024JJ00", "2023JJ00", "2022JJ00", "2021JJ00"];

type CBSRij = {
  Perioden: string;
  GemiddeldeVerkoopprijs_1: number | null;
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

function jaarLabel(key: string): string {
  // "2024JJ00" → "2024"
  return key.slice(0, 4);
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

  const jaarFilter = JAREN.map((p) => `Perioden eq '${p}'`).join(" or ");
  const url =
    `${CBS_BASE}/TypedDataSet` +
    `?$filter=RegioS eq '${gmCode}' and (${jaarFilter})` +
    `&$select=Perioden,GemiddeldeVerkoopprijs_1` +
    `&$format=json`;

  let rijen: CBSRij[];
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 86400 }, // 24u cache — CBS-data wijzigt niet dagelijks
    });
    if (!res.ok) return NextResponse.json({ error: "CBS niet bereikbaar" }, { status: 502 });
    const json = await res.json();
    rijen = (json.value ?? []) as CBSRij[];
  } catch {
    return NextResponse.json({ error: "CBS timeout" }, { status: 502 });
  }

  // Sorteer van recent naar oud
  const jaren = rijen
    .filter((r) => r.GemiddeldeVerkoopprijs_1 !== null && r.GemiddeldeVerkoopprijs_1 > 0)
    .sort((a, b) => b.Perioden.localeCompare(a.Perioden));

  if (jaren.length === 0) {
    return NextResponse.json({ error: "geen gemeentedata in CBS" }, { status: 404 });
  }

  const recentste = jaren[0];
  const gemiddeldeVerkoopprijs = recentste.GemiddeldeVerkoopprijs_1!;
  const recentJaar = jaarLabel(recentste.Perioden);

  // Trend: verkoopprijs huidig jaar vs vorig jaar
  let trendPct: number | null = null;
  if (jaren.length >= 2) {
    const vorigeprijs = jaren[1].GemiddeldeVerkoopprijs_1!;
    trendPct = Math.round(((gemiddeldeVerkoopprijs - vorigeprijs) / vorigeprijs) * 1000) / 10;
  }

  const result: GemeenteMarktData = {
    gemeente,
    gmCode,
    aantalVerkopen12m: 0,         // niet beschikbaar in 83625NED; UI verbergt dit als 0
    gemiddeldeVerkoopprijs,
    trendPct,
    meestRecentKwartaal: recentste.Perioden,
    meestRecentKwartaalLabel: recentJaar,
    bron: `CBS Statline 83625NED · ${recentJaar}`,
  };

  return NextResponse.json(result);
}
