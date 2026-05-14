import { NextRequest, NextResponse } from "next/server";
import { suggesteerAdres } from "@/lib/pdok";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 3) return NextResponse.json([]);

  const suggesties = await suggesteerAdres(query);
  return NextResponse.json(suggesties);
}
