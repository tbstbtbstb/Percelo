import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { AnalysePDF } from "@/lib/pdf/AnalysePDF";
import type { AnalyseResultaat } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const data: AnalyseResultaat = await req.json();

    if (!data?.perceel?.adres) {
      return NextResponse.json({ error: "Ongeldige analysedata" }, { status: 400 });
    }

    const element = React.createElement(AnalysePDF, { data }) as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const bytes = new Uint8Array(buffer);

    const bestandsnaam = `analyse-${data.perceel.adres.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40)}-${data.analyseId.slice(0, 8)}.pdf`;

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
        "Content-Length": bytes.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("PDF generatie fout:", err);
    return NextResponse.json({ error: "PDF generatie mislukt" }, { status: 500 });
  }
}
